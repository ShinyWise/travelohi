import React, { useEffect, useState, useRef } from 'react';
import TypingIndicator from './TypingIndicator';
import { CommunicationServiceClient } from '../../../proto/travelohi/v1/communication/communication.client';
import { transport } from '../../../utils/grpcClient';
import { Check } from 'lucide-react';
import styles from './AdminChatWindow.module.scss';

const commClient = new CommunicationServiceClient(transport);

interface ChatMessage {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
    status: 'sent' | 'seen';
}

interface Props {
    conversationId: string;
    adminId: string;
    remoteUsername: string;
    onBack?: () => void;
}

const AdminChatWindow: React.FC<Props> = ({ conversationId, adminId, remoteUsername, onBack }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    // pagination states
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const messageAreaRef = useRef<HTMLDivElement>(null);
    const streamCallRef = useRef<any>(null);
    const isTypingRef = useRef(false);
    const typingTimeoutRef = useRef<any>(null);
    const isInitialLoadRef = useRef(true);

    const scrollToBottom = () => {
        if (messageAreaRef.current) {
            messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        let abortController = new AbortController();
        let reconnectTimeout: any;
        setIsLoading(true);
        setMessages([]);
        setOffset(0);
        setHasMore(true);
        setIsTyping(false);
        isTypingRef.current = false;
        isInitialLoadRef.current = true;

        const initChat = async () => {
            try {
                // cek history
                const limit = 50;
                const histRes = await commClient.getChatHistory({ conversationId, limit, offset: 0 });
                const history = histRes.response.messages || [];
                const mapped: ChatMessage[] = history.map((m: any) => ({
                    id: m.messageId,
                    senderId: m.senderId,
                    text: m.content,
                    timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: (m.status === 'seen' ? 'seen' : 'sent') as 'seen' | 'sent',
                })).reverse();

                setMessages(mapped);
                setOffset(limit);
                setHasMore(history.length === limit);
                setIsLoading(false);

                // scroll to bottom after initial load
                setTimeout(scrollToBottom, 50);

                //kirim read receipt
                for (const msg of mapped) {
                    if (msg.senderId !== adminId && msg.status === 'sent') {
                        commClient.sendEvent({
                            conversationId,
                            senderId: adminId,
                            eventPayload: {
                                oneofKind: 'readReceipt',
                                readReceipt: {
                                    messageId: msg.id,
                                    newStatus: 'seen'
                                }
                            }
                        }).response.catch(console.error);
                    }
                }

                // connect stream
                const connectStream = async () => {
                    try {
                        const token = localStorage.getItem("access_token");
                        const call = commClient.streamChat(
                            { conversationId: conversationId, userId: adminId },
                            {
                                abort: abortController.signal,
                                meta: {
                                    authorization: `Bearer ${token}`
                                }
                            }
                        );

                        streamCallRef.current = call;

                        // receive stream event
                        for await (const res of call.responses) {
                            const payload = res.eventPayload;
                            switch (payload.oneofKind) {
                                case 'typingIndicator': {
                                    const indicator = (payload as any).typingIndicator;
                                    if (res.senderId !== adminId && indicator) {
                                        setIsTyping(indicator.isTyping);
                                    }
                                    break;
                                }
                                case 'readReceipt': {
                                    const receipt = (payload as any).readReceipt;
                                    if (res.senderId !== adminId && receipt) {
                                        setMessages(prev => prev.map(m => m.id === receipt.messageId ? { ...m, status: receipt.newStatus as any } : m));
                                    }
                                    break;
                                }
                                case 'message': {
                                    const newMsg = (payload as any).message;
                                    if (newMsg) {
                                        setIsTyping(false);

                                        const chatMsg: ChatMessage = {
                                            id: newMsg.messageId,
                                            senderId: res.senderId,
                                            text: newMsg.content,
                                            timestamp: new Date(newMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                            status: newMsg.status === 'seen' ? 'seen' : 'sent',
                                        };

                                        setMessages(prev => {
                                            if (prev.some(m => m.id === chatMsg.id)) return prev;
                                            
                                            // auto-scroll only if already at/near bottom
                                            if (messageAreaRef.current) {
                                                const area = messageAreaRef.current;
                                                const isAtBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 150;
                                                if (isAtBottom) {
                                                    setTimeout(scrollToBottom, 50);
                                                }
                                            }
                                            
                                            return [...prev, chatMsg];
                                        });

                                        if (res.senderId !== adminId) {
                                            commClient.sendEvent({
                                                conversationId,
                                                senderId: adminId,
                                                eventPayload: {
                                                    oneofKind: 'readReceipt',
                                                    readReceipt: {
                                                        messageId: newMsg.messageId,
                                                        newStatus: 'seen'
                                                    }
                                                }
                                            }).response.catch(console.error);
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                        throw new Error("Stream closed by server");
                    } catch (err: any) {
                        streamCallRef.current = null;
                        if (err.name !== 'AbortError' && !abortController.signal.aborted) {
                            console.warn("Admin chat stream disconnected. Reconnecting in 3s...", err);
                            reconnectTimeout = setTimeout(connectStream, 3000);
                        }
                    }
                };

                connectStream();

            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error("Chat Stream Error:", err);
                }
            }
        };

        initChat();

        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            clearTimeout(reconnectTimeout);
            abortController.abort();
        };
    }, [conversationId, adminId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputText(val);

        if (!streamCallRef.current) return;

        const hasText = val.trim().length > 0;
        if (hasText) {
            if (!isTypingRef.current) {
                isTypingRef.current = true;
                sendTypingIndicator(true);
            }

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                isTypingRef.current = false;
                sendTypingIndicator(false);
            }, 2500);
        } else {
            if (isTypingRef.current) {
                isTypingRef.current = false;
                sendTypingIndicator(false);
            }
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    };

    const handleScroll = () => {
        if (!messageAreaRef.current || isLoadingMore || !hasMore || isLoading) return;

        // trigger when near top
        if (messageAreaRef.current.scrollTop < 100) {
            loadMoreMessages();
        }
    };

    const loadMoreMessages = async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);

        const prevScrollHeight = messageAreaRef.current?.scrollHeight || 0;

        try {
            const limit = 50;
            const res = await commClient.getChatHistory({ conversationId, limit, offset });
            const history = res.response.messages || [];

            if (history.length === 0) {
                setHasMore(false);
                setIsLoadingMore(false);
                return;
            }

            const mapped: ChatMessage[] = history.map((m: any) => ({
                id: m.messageId,
                senderId: m.senderId,
                text: m.content,
                timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: (m.status === 'seen' ? 'seen' : 'sent') as 'seen' | 'sent',
            })).reverse();

            setMessages(prev => [...mapped, ...prev]);
            setOffset(prev => prev + limit);
            setHasMore(history.length === limit);

            // Maintain scroll position after DOM update
            requestAnimationFrame(() => {
                if (messageAreaRef.current) {
                    const newScrollHeight = messageAreaRef.current.scrollHeight;
                    messageAreaRef.current.scrollTop = newScrollHeight - prevScrollHeight;
                }
            });

        } catch (err) {
            console.error("Failed to load more messages:", err);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const sendTypingIndicator = async (typing: boolean) => {
        try {
            await commClient.sendEvent({
                conversationId,
                senderId: adminId,
                eventPayload: {
                    oneofKind: 'typingIndicator',
                    typingIndicator: {
                        isTyping: typing
                    }
                }
            });
        } catch (err) {
            console.warn("Failed to send typing indicator", err);
        }
    };

    const handleCloseConversation = async () => {
        setIsClosing(true);
        try {
            await commClient.closeConversation({ conversationId });
            onBack?.();
        } catch (err) {
            console.error("Failed to close conversation", err);
            setIsClosing(false);
            setShowCloseConfirm(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (isTypingRef.current) {
            isTypingRef.current = false;
            sendTypingIndicator(false);
        }

        const tempId = `temp-${Date.now()}`;
        const newMsg: ChatMessage = {
            id: tempId,
            senderId: adminId,
            text: inputText,
            timestamp: 'Kirim...',
            status: 'sent'
        };

        setMessages(prev => [...prev, newMsg]);
        setInputText('');
        setTimeout(scrollToBottom, 50);

        try {
            await commClient.sendEvent({
                conversationId,
                senderId: adminId,
                eventPayload: {
                    oneofKind: 'message',
                    message: {
                        messageId: '',
                        content: newMsg.text,
                        timestamp: '',
                        senderId: adminId,
                        status: 'sent'
                    }
                }
            });

            setMessages(prev => prev.map(m => m.id === tempId ? {
                ...m,
                id: `msg-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            } : m));
        } catch (err) {
            console.error("Gagal mengirim:", err);
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    return (
        <div className={styles.chatWindow}>
            <div className={styles.header}>
                <div className={styles.titleInfo}>
                    {onBack && (
                        <button type="button" onClick={onBack} className={styles.backButton} aria-label="Back">
                            ←
                        </button>
                    )}
                    <h3>Berbicara dengan: <span>{remoteUsername}</span></h3>
                </div>
                <div className={styles.headerActions}>
                    {showCloseConfirm ? (
                        <div className={styles.closeConfirm}>
                            <span>Tutup percakapan ini?</span>
                            <button
                                type="button"
                                className={styles.confirmYes}
                                onClick={handleCloseConversation}
                                disabled={isClosing}
                            >
                                {isClosing ? '...' : 'Ya, Tutup'}
                            </button>
                            <button
                                type="button"
                                className={styles.confirmNo}
                                onClick={() => setShowCloseConfirm(false)}
                                disabled={isClosing}
                            >
                                Batal
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className={styles.closeConvBtn}
                            onClick={() => setShowCloseConfirm(true)}
                        >
                            <Check size={14} /> Selesai
                        </button>
                    )}
                    <span className={styles.statusBadge}>Live Support</span>
                </div>
            </div>

            <div 
                ref={messageAreaRef} 
                className={styles.messageArea}
                onScroll={handleScroll}
            >
                {isLoading ? (
                    <div className={styles.loader}>Memuat riwayat chat...</div>
                ) : (
                    <>
                        {isLoadingMore && <div className={styles.loadMoreSpinner}>Memuat pesan lama...</div>}
                        {!hasMore && messages.length >= 50 && <div className={styles.historyEnd}>Awal percakapan</div>}
                        
                        {messages.length === 0 ? (
                            <div className={styles.emptyState}>Belum ada pesan dalam percakapan ini.</div>
                        ) : (
                            messages.map(msg => {
                                const isMe = msg.senderId === adminId;
                                return (
                                    <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.mine : styles.theirs}`}>
                                        <div className={styles.bubble}>{msg.text}</div>
                                        <div className={styles.meta}>
                                            <span className={styles.time}>{msg.timestamp}</span>
                                            {isMe && (
                                                <span className={`${styles.status} ${msg.status === 'seen' ? styles.seen : styles.sent}`}>
                                                    {msg.status === 'seen' ? '✓✓ Seen' : '✓ Sent'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </>
                )}
                {isTyping && <TypingIndicator username={remoteUsername} />}
            </div>

            <form className={styles.inputArea} onSubmit={handleSend}>
                <input
                    type="text"
                    placeholder="Ketik balasan Anda..."
                    value={inputText}
                    onChange={handleInputChange}
                    disabled={isLoading}
                />
                <button type="submit" disabled={!inputText.trim() || isLoading}>Kirim</button>
            </form>
        </div>
    );
};

export default AdminChatWindow;