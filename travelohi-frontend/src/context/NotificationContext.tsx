import React, { createContext, useState, useContext, type ReactNode, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { CommunicationServiceClient } from '../proto/travelohi/v1/communication/communication.client';
import { transport } from '../utils/grpcClient';
import { useToast } from '../components/Toast';

interface NotificationContextType {
    unreadChatCount: number;
    clearUnreadChat: () => void;
    isChatActive: boolean;
    setChatActive: (active: boolean) => void;
    conversationId: string | null;
    refreshConversation: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
const commClient = new CommunicationServiceClient(transport);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAuthenticated, userId, isAdmin } = useAuth();
    const { showToast } = useToast();

    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [isChatActive, _setChatActive] = useState(false);
    const isChatActiveRef = useRef(false);
    const [conversationId, setConversationId] = useState<string | null>(null);

    const setChatActive = useCallback((active: boolean) => {
        isChatActiveRef.current = active;
        _setChatActive(active);
    }, []);

    const clearUnreadChat = useCallback(() => {
        setUnreadChatCount(0);
    }, []);

    // get active conversation
    useEffect(() => {
        if (!isAuthenticated || !userId || isAdmin) {
            setConversationId(null);
            return;
        }

        const fetchConversationId = async () => {
            try {
                const token = localStorage.getItem("access_token");
                const { response } = await commClient.getOrCreateConversation(
                    { userId, createIfNotExists: false },
                    { meta: { authorization: `Bearer ${token}` } }
                );
                setConversationId(response.conversationId || null);
            } catch (err) {
                console.error("Failed to get active conversation:", err);
            }
        };

        fetchConversationId();
    }, [isAuthenticated, userId, isAdmin]);

    // refresh conversation
    const refreshConversation = useCallback(async () => {
        if (!userId || isAdmin) return;
        try {
            const token = localStorage.getItem("access_token");
            const { response } = await commClient.getOrCreateConversation(
                { userId, createIfNotExists: true },
                { meta: { authorization: `Bearer ${token}` } }
            );
            setConversationId(response.conversationId || null);
        } catch (err) {
            console.error("Failed to refresh conversation:", err);
        }
    }, [userId, isAdmin]);

    useEffect(() => {
    if (!isAuthenticated || !userId || isAdmin || isChatActive || !conversationId) {
        return;
    }

    let abortController = new AbortController();
    let reconnectTimeout: any;

    const connectStream = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const call = commClient.streamChat(
                { conversationId: conversationId, userId: userId },
                {
                    abort: abortController.signal,
                    meta: {
                        authorization: `Bearer ${token}`
                    }
                }
            );

            for await (const response of call.responses) {
                const payload = response.eventPayload;
                if (payload.oneofKind === 'message') {
                    const newMsg = (payload as any).message;
                    if (!newMsg) continue;

                    if (response.senderId !== userId) {
                        setUnreadChatCount(prev => prev + 1);
                        showToast(`Pesan Baru: "${newMsg.content.substring(0, 30)}${newMsg.content.length > 30 ? '...' : ''}"`, 'info');
                    }
                }
            }
            throw new Error("Stream closed by server");
        } catch (err: any) {
            if (err.name !== 'AbortError' && !abortController.signal.aborted) {
                if (!isChatActiveRef.current) {
                    console.warn("Background chat stream disconnected. Reconnecting in 3s...", err);
                    reconnectTimeout = setTimeout(connectStream, 3000);
                }
            }
        }
    };

    connectStream();

    return () => {
        abortController.abort();
        clearTimeout(reconnectTimeout);
    };
}, [isAuthenticated, userId, isAdmin, isChatActive, conversationId, showToast]);

return (
    <NotificationContext.Provider value={{
        unreadChatCount,
        clearUnreadChat,
        isChatActive,
        setChatActive,
        conversationId,
        refreshConversation
    }}>
        {children}
    </NotificationContext.Provider>
);
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within a NotificationProvider');
    return context;
};