import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import MessageList, { type ChatMessage } from './components/MessageList';
import ChatInput from './components/ChatInput';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { CommunicationServiceClient } from '../../proto/travelohi/v1/communication/communication.client';
import { transport } from '../../utils/grpcClient';
import { useAppContext } from '../../context/ThemeContext';
import { translations } from '../../utils/translations';
import styles from './UserSupportChat.module.scss';

const commClient = new CommunicationServiceClient(transport);
const LIMIT = 20;

const UserSupportChat: React.FC = () => {
    const { userId, isLoading: isAuthLoading } = useAuth();
    const { setChatActive, clearUnreadChat, conversationId, refreshConversation } = useNotification();
    const { language } = useAppContext();
    const t = translations[language];

    const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isStreamConnected, setIsStreamConnected] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isAdminTyping, setIsAdminTyping] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const [offset, setOffset] = useState(0);
    const [isClosed, setIsClosed] = useState(false);

    const offsetRef = useRef(0);
    const hasMoreHistoryRef = useRef(true);
    const isLoadingHistoryRef = useRef(false);

    useEffect(() => { offsetRef.current = offset; }, [offset]);
    useEffect(() => { hasMoreHistoryRef.current = hasMoreHistory; }, [hasMoreHistory]);
    useEffect(() => { isLoadingHistoryRef.current = isLoadingHistory; }, [isLoadingHistory]);
    useEffect(() => { clearUnreadChat(); }, [clearUnreadChat, messages.length]);

    useEffect(() => {
        setActiveConversationId(conversationId);
        setMessages([]);
        setOffset(0);
        setHasMoreHistory(true);
        setIsClosed(false);
    }, [conversationId]);

    const fetchHistory = useCallback(async () => {
        if (!userId || !activeConversationId || !hasMoreHistoryRef.current || isLoadingHistoryRef.current) return;
        setIsLoadingHistory(true);
        try {
            const { response } = await commClient.getChatHistory({
                conversationId: activeConversationId,
                limit: LIMIT,
                offset: offsetRef.current,
            });

            const history = response.messages || [];
            const mapped: ChatMessage[] = history.map((m: any) => ({
                id: m.messageId,
                senderId: m.senderId,
                isAdmin: m.senderId !== userId,
                text: m.content,
                timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: m.status as any,
            }));

            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const uniqueNew = mapped.filter(m => !existingIds.has(m.id)).reverse();
                return [...uniqueNew, ...prev];
            });

            setHasMoreHistory(history.length === LIMIT);
            setOffset(prev => prev + LIMIT);
        } catch (err) {
            console.error("Failed to load chat history", err);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [userId, activeConversationId]);

    useEffect(() => {
        if (userId && activeConversationId && messages.length === 0 && hasMoreHistory) fetchHistory();
    }, [userId, activeConversationId, messages.length, hasMoreHistory, fetchHistory]);

    useEffect(() => {
        if (!userId || !activeConversationId) return;
        setChatActive(true);
        let abortController = new AbortController();
        let reconnectTimeout: any;

        const connectStream = async () => {
            try {
                const token = localStorage.getItem("access_token");
                const call = commClient.streamChat(
                    { conversationId: activeConversationId, userId: userId },
                    {
                        abort: abortController.signal,
                        meta: { authorization: `Bearer ${token}` }
                    }
                );

                if (!abortController.signal.aborted) {
                    setIsStreamConnected(true);
                }

                for await (const response of call.responses) {
                    if (abortController.signal.aborted) break;
                    const payload = response.eventPayload;
                    switch (payload.oneofKind) {
                        case 'typingIndicator': {
                            const indicator = (payload as any).typingIndicator;
                            if (response.senderId !== userId && indicator) {
                                setIsAdminTyping(indicator.isTyping);
                            }
                            break;
                        }
                        case 'readReceipt': {
                            const receipt = (payload as any).readReceipt;
                            if (response.senderId !== userId && receipt) {
                                setMessages(prev => prev.map(m => m.id === receipt.messageId ? { ...m, status: receipt.newStatus as any } : m));
                            }
                            break;
                        }
                        case 'message': {
                            setIsAdminTyping(false);
                            const newMsg = (payload as any).message;
                            const chatMsg: ChatMessage = {
                                id: newMsg.messageId,
                                senderId: response.senderId,
                                isAdmin: response.senderId !== userId,
                                text: newMsg.content,
                                timestamp: new Date(newMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                status: newMsg.status as any,
                            };

                            setMessages(prev => {
                                if (prev.some(m => m.id === chatMsg.id)) return prev;
                                return [...prev, chatMsg];
                            });

                            if (response.senderId !== userId) {
                                commClient.sendEvent({
                                    conversationId: activeConversationId,
                                    senderId: userId,
                                    eventPayload: {
                                        oneofKind: 'readReceipt',
                                        readReceipt: { messageId: chatMsg.id, newStatus: 'seen' }
                                    }
                                }).response.catch(console.error);
                            }
                            break;
                        }
                        case 'conversationClosed': {
                            if (!abortController.signal.aborted) {
                                setIsClosed(true);
                                setIsStreamConnected(false);
                            }
                            abortController.abort();
                            break;
                        }
                    }
                }
                throw new Error("Stream closed by server");
            } catch (err: any) {
                if (!abortController.signal.aborted) {
                    setIsStreamConnected(false);
                    reconnectTimeout = setTimeout(connectStream, 3000);
                }
            }
        };

        connectStream();

        return () => {
            abortController.abort();
            clearTimeout(reconnectTimeout);
            setIsStreamConnected(false);
            setChatActive(false);
        };
    }, [userId, activeConversationId, setChatActive]);

    const handleSendMessage = async (text: string) => {
        if (!userId) throw new Error("User not authenticated.");

        let currentId = activeConversationId;
        if (!currentId) {
            try {
                const token = localStorage.getItem("access_token");
                const { response } = await commClient.getOrCreateConversation(
                    { userId, createIfNotExists: true },
                    { meta: { authorization: `Bearer ${token}` } }
                );
                currentId = response.conversationId;
                setActiveConversationId(currentId);
                await refreshConversation();
            } catch (err) {
                console.error("Failed to create conversation:", err);
                throw err;
            }
        }

        const tempId = `temp-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: tempId, senderId: userId, isAdmin: false, text, timestamp: 'Mengirim...', status: 'sent',
        }]);

        try {
            const { response } = await commClient.sendEvent({
                conversationId: currentId,
                senderId: userId,
                eventPayload: {
                    oneofKind: 'message',
                    message: { messageId: '', content: text, timestamp: '', senderId: userId, status: 'sent' },
                },
            });

            setMessages(prev => prev.map(m => m.id === tempId ? {
                ...m, id: response.messageId, timestamp: new Date(response.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'sent',
            } : m));
        } catch (err) {
            console.error("Failed to send message", err);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            throw err;
        }
    };

    const handleTyping = async (isTyping: boolean) => {
        if (!userId || !activeConversationId || !isStreamConnected) return;
        try {
            await commClient.sendEvent({
                conversationId: activeConversationId,
                senderId: userId,
                eventPayload: { oneofKind: 'typingIndicator', typingIndicator: { isTyping } }
            });
        } catch (err) { console.warn("Failed to send typing indicator"); }
    };

    if (isAuthLoading) {
        return (
            <div className={styles.chatPageContainer}>
                <div className={styles.chatWindow}>
                    <div className={styles.loadingState}>
                        <Loader2 className={styles.spinnerSvg} />
                        <h3>{t.chat_loading_profile}</h3>
                    </div>
                </div>
            </div>
        );
    }

    if (isClosed) {
        return (
            <div className={styles.chatPageContainer}>
                <div className={styles.chatWindow}>
                    <div className={styles.loadingState}>
                        <CheckCircle2 className={styles.successSvg} />
                        <h3>{t.chat_closed}</h3>
                        <p>{t.chat_closed_desc}</p>
                        <button
                            className={styles.newChatBtn}
                            onClick={async () => {
                                setIsClosed(false);
                                setMessages([]);
                                setOffset(0);
                                setHasMoreHistory(true);
                                await refreshConversation();
                            }}
                        >
                            {t.chat_new_btn}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const isInputDisabled = activeConversationId ? !isStreamConnected : false;
    const isOnline = !activeConversationId || isStreamConnected;

    return (
        <div className={styles.chatPageContainer}>
            <div className={styles.chatWindow}>
                <div className={styles.header}>
                    <div className={styles.titleInfo}>
                        <h2>{t.chat_support_title}</h2>
                        <span className={`${styles.statusDot} ${isOnline ? styles.online : styles.offline}`} />
                        <small>{activeConversationId ? (isStreamConnected ? t.chat_connected : t.chat_connecting) : t.chat_ready}</small>
                    </div>
                </div>
                <MessageList messages={messages} currentUserId={userId || ''} isLoadingHistory={isLoadingHistory} hasMoreHistory={hasMoreHistory} onLoadMore={fetchHistory} isAdminTyping={isAdminTyping} t={t} />
                <ChatInput onSendMessage={handleSendMessage} disabled={isInputDisabled} onTyping={handleTyping} t={t} />
            </div>
        </div>
    );
};

export default UserSupportChat;