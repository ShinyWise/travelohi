import React, { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import MessageSkeleton from './MessageSkeleton';
import styles from './MessageList.module.scss';

export interface ChatMessage {
    id: string;
    senderId: string;
    isAdmin: boolean;
    text: string;
    timestamp: string;
    status?: 'sent' | 'seen';
}

interface Props {
    messages: ChatMessage[];
    currentUserId: string;
    isLoadingHistory: boolean;
    hasMoreHistory: boolean;
    onLoadMore: () => void;
    isAdminTyping: boolean;
    t: any;
}

const MessageList: React.FC<Props> = ({ 
    messages, 
    currentUserId, 
    isLoadingHistory, 
    hasMoreHistory, 
    onLoadMore, 
    isAdminTyping,
    t
}) => {
    const topRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages.length, isAdminTyping]);

    useEffect(() => {
        const currentRef = topRef.current;
        if (!currentRef) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isLoadingHistory && hasMoreHistory) {
                    onLoadMore();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(currentRef);
        return () => observer.unobserve(currentRef);
    }, [isLoadingHistory, hasMoreHistory, onLoadMore]);

    return (
        <div ref={containerRef} className={styles.listContainer}>
            <div ref={topRef} className={styles.topTrigger} />

            {isLoadingHistory && <MessageSkeleton />}

            {!hasMoreHistory && messages.length > 0 && (
                <div className={styles.historyEnd}>{t.chat_start}</div>
            )}

            {messages.length === 0 && !isLoadingHistory ? (
                <div className={styles.emptyChat}>
                    <MessageSquare className={styles.emptyChatSvg} />
                    <p>{t.chat_empty}</p>
                </div>
            ) : (
                <div className={styles.messagesWrapper}>
                    {messages.map((msg) => {
                        const isMe = msg.senderId === currentUserId;
                        return (
                            <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.mine : styles.theirs}`}>
                                {!isMe && <span className={styles.avatar}>{msg.isAdmin ? 'CS' : 'U'}</span>}
                                <div className={styles.messageContent}>
                                    <div className={styles.bubble}>{msg.text}</div>
                                    <div className={styles.meta}>
                                        <span className={styles.time}>{msg.timestamp}</span>
                                        {isMe && msg.status && (
                                            <span className={`${styles.status} ${msg.status === 'seen' ? styles.seen : styles.sent}`}>
                                                {msg.status === 'seen' ? '✓✓ Seen' : '✓ Sent'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {isAdminTyping && (
                        <div className={styles.messageWrapper} style={{ alignSelf: 'flex-start' }}>
                            <span className={styles.avatar}>CS</span>
                            <div className={styles.messageContent}>
                                <div className={styles.bubble}>
                                    <div className={styles.dots}>
                                        <span>.</span><span>.</span><span>.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MessageList;