import React, { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { GameWebSocketClient, type SocketState } from '../utils/WebSocketClient';
import { useAuth } from './AuthContext';

interface GameSocketContextType {
    client: GameWebSocketClient | null;
    socketState: SocketState;
    statusMessage: string;
    isArenaActive: boolean;
    matchQueuePosition: number;
    connectToGame: () => void;
    leaveGame: () => void;
}

const GameSocketContext = createContext<GameSocketContextType | undefined>(undefined);

const WS_URL = 'ws://localhost:8080/ws/game';

export const GameSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { userId, token } = useAuth();

    const [socketState, setSocketState] = useState<SocketState>('idle');
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [isArenaActive, setIsArenaActive] = useState<boolean>(false);
    const [matchQueuePosition, setMatchQueuePosition] = useState<number>(0);

    const clientRef = useRef<GameWebSocketClient | null>(null);

    useEffect(() => {
        clientRef.current = new GameWebSocketClient(WS_URL);

        clientRef.current.onStateChange = (state, message) => {
            setSocketState(state);
            setStatusMessage(message || '');
        };
        clientRef.current.onQueueUpdate = (isActive, pos) => {
            setIsArenaActive(isActive);
            setMatchQueuePosition(pos);
        };

        return () => {
            clientRef.current?.disconnect();
        };
    }, []);

    const connectToGame = () => {
        if (!token) {
            setStatusMessage('game_msg_login_required');
            setSocketState('error');
            return;
        }
        clientRef.current?.connect(token, userId || '');
    };

    const leaveGame = () => {
        clientRef.current?.disconnect();
        setSocketState('idle');
        setStatusMessage('');
        setIsArenaActive(false);
        setMatchQueuePosition(0);
    };

    return (
        <GameSocketContext.Provider value={{
            client: clientRef.current,
            socketState,
            statusMessage,
            isArenaActive,
            matchQueuePosition,
            connectToGame,
            leaveGame
        }}>
            {children}
        </GameSocketContext.Provider>
    );
};

export const useGameSocket = () => {
    const context = useContext(GameSocketContext);
    if (!context) throw new Error("useGameSocket must be used within GameSocketProvider");
    return context;
};