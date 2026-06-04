import { GameServerEvent, GameClientEvent } from '../proto/travelohi/v1/game/game';

export type SocketState = 'idle' | 'connecting' | 'queued' | 'playing' | 'rate_limited' | 'opponent_disconnected' | 'match_ended' | 'error';
export class GameWebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;

    public roomId: string | null = null;
    public isPlayerOne: boolean = false;
    public opponentName: string = '';

    private userId: string | null = null;

    public isArenaActive: boolean = false;
    public matchQueuePosition: number = 0;

    public onStateChange: ((state: SocketState, message?: string) => void) | null = null;
    public onGameStateSync: ((binaryData: Uint8Array) => void) | null = null;
    public onQueueUpdate: ((isActive: boolean, pos: number) => void) | null = null;

    constructor(url: string) {
        this.url = url;
    }

    public connect(token: string, userId: string) {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.userId = userId;
        this.onStateChange?.('connecting');
        this.ws = new WebSocket(`${this.url}?token=${token}`);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
            this.onStateChange?.('queued');
            try {
                const event = GameClientEvent.create({
                    payload: {
                        oneofKind: 'joinQueue',
                        joinQueue: {
                            userId: userId
                        }
                    }
                });
                this.sendBinary(GameClientEvent.toBinary(event));
            } catch (err) {
                console.error("Failed to send JoinQueue payload on open", err);
            }
        };

        this.ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                try {
                    const binary = new Uint8Array(event.data);
                    const serverEvent = GameServerEvent.fromBinary(binary);

                    switch (serverEvent.payload.oneofKind) {
                        case 'matchFound': {
                            const match = serverEvent.payload.matchFound;
                            this.roomId = match.roomId;
                            this.opponentName = match.opponentName;
                            this.isPlayerOne = match.isPlayerOne;
                            this.onStateChange?.('playing');
                            break;
                        }
                        case 'queueUpdate': {
                            const update = serverEvent.payload.queueUpdate;
                            this.isArenaActive = update.isArenaActive;
                            this.matchQueuePosition = update.matchQueuePosition;
                            if (this.onQueueUpdate) {
                                this.onQueueUpdate(this.isArenaActive, this.matchQueuePosition);
                            }
                            break;
                        }
                        case 'stateUpdate':
                            if (this.onGameStateSync) {
                                this.onGameStateSync(binary);
                            }
                            break;
                        case 'matchEnd': {
                            const end = serverEvent.payload.matchEnd;
                            const isWin = end.winnerId === this.userId;
                            let msg = '';
                            if (end.reason === 'opponent_disconnected') {
                                msg = 'game_msg_opponent_disconnected';
                            } else if (end.reason === 'knockout') {
                                msg = isWin ? 'game_msg_ko_win' : 'game_msg_ko_lose';
                            } else if (end.reason === 'time_up') {
                                msg = isWin ? 'game_msg_time_up_win' : (end.winnerId ? 'game_msg_time_up_lose' : 'game_msg_time_up_draw');
                            } else {
                                msg = 'game_msg_finished';
                            }
                            this.onStateChange?.('match_ended', msg);
                            this.disconnect();
                            break;
                        }
                        case 'error': {
                            const errMsg = serverEvent.payload.error.message;
                            if (errMsg.includes('rate limit') || errMsg.includes('Rate limit')) {
                                this.onStateChange?.('rate_limited', 'game_msg_rate_limited');
                            } else {
                                this.onStateChange?.('error', errMsg);
                            }
                            this.disconnect();
                            break;
                        }
                    }
                } catch (err) {
                    console.error("Failed to parse binary game server event", err);
                }
            }
        };

        this.ws.onclose = (event) => {
            if (event.code === 4290) {
                this.onStateChange?.('rate_limited', 'game_msg_rate_limited_short');
            } else if (event.code !== 1000 && this.roomId) {
                this.onStateChange?.('error', 'game_msg_conn_aborted');
            }
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket Error:", error);
            this.onStateChange?.('error', 'game_msg_conn_error');
        };
    }

    public sendBinary(data: Uint8Array) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data as unknown as BufferSource);
        }
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close(1000, "Client disconnected normally");
            this.ws = null;
            this.roomId = null;
            this.isPlayerOne = false;
            this.opponentName = '';
            this.userId = null;
        }
    }
}