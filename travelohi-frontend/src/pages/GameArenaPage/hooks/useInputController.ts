import { useEffect, useRef } from 'react';
import { type GameState } from '../components/SpriteRenderer';
import { GameWebSocketClient } from '../../../utils/WebSocketClient';
import { GameClientEvent } from '../../../proto/travelohi/v1/game/game';

export const useInputController = (
    client: GameWebSocketClient | null,
    socketState: string,
    gameStateRef: React.MutableRefObject<GameState>
) => {
    const keysRef = useRef<{ [key: string]: boolean }>({ left: false, right: false, s: false, a: false, d: false });
    const lastAttackTime = useRef<number>(0);

    useEffect(() => {
        const preventScrollKeys = [' ', 'spacebar', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'];

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();

            if (preventScrollKeys.includes(key) || e.code === 'Space') {
                const target = e.target as HTMLElement;
                if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable)) {
                    e.preventDefault();
                }
            }

            if (socketState !== 'playing' || !client) return;
            if (keysRef.current[key]) return;
            keysRef.current[key] = true;

            const state = gameStateRef.current;

            // combos
            if (key === ' ' || e.code === 'Space') {
                const now = performance.now();
                if (now - lastAttackTime.current < 500) return; //buat delay

                const forwardKey = state.player.facing === 'right' ? 'd' : 'a';

                if (keysRef.current['s']) {
                    sendGameAction('low_kick');
                    state.player.action = 'low_kick';
                } else if (keysRef.current[forwardKey]) {
                    sendGameAction('front_kick');
                    state.player.action = 'front_kick';
                } else {
                    sendGameAction('jump');
                    state.player.action = 'jump';
                }

                lastAttackTime.current = now;

                setTimeout(() => {
                    if (gameStateRef.current.player.action !== 'idle') {
                        gameStateRef.current.player.action = 'idle';
                    }
                }, 300);
                return;
            }

            if (key === 'a' || key === 'arrowleft') {
                keysRef.current.left = true;
                sendGameAction('move_left');
                state.player.action = 'move';
            } else if (key === 'd' || key === 'arrowright') {
                keysRef.current.right = true;
                sendGameAction('move_right');
                state.player.action = 'move';
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();

            if (preventScrollKeys.includes(key) || e.code === 'Space') {
                const target = e.target as HTMLElement;
                if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable)) {
                    e.preventDefault();
                }
            }

            if (socketState !== 'playing' || !client) return;

            keysRef.current[key] = false;

            if (key === 'a' || key === 'arrowleft') {
                keysRef.current.left = false;
                if (!keysRef.current.right) {
                    sendGameAction('stop');
                    gameStateRef.current.player.action = 'idle';
                } else {
                    sendGameAction('move_right');
                }
            } else if (key === 'd' || key === 'arrowright') {
                keysRef.current.right = false;
                if (!keysRef.current.left) {
                    sendGameAction('stop');
                    gameStateRef.current.player.action = 'idle';
                } else {
                    sendGameAction('move_left');
                }
            }
        };

        const sendGameAction = (actionType: string) => {
            if (!client || !client.roomId) return;
            try {
                const event = GameClientEvent.create({
                    payload: {
                        oneofKind: 'action',
                        action: {
                            roomId: client.roomId,
                            actionType: actionType
                        }
                    }
                });
                client.sendBinary(GameClientEvent.toBinary(event));
            } catch (err) {
                console.error("Failed to send player action", err);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [client, socketState, gameStateRef]);

    return keysRef;
};