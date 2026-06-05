import React from 'react';
import { Search } from 'lucide-react';
import styles from './ConversationSidebar.module.scss';

export interface Conversation {
    id: string;
    userId: string;
    username: string;
    profilePicUrl: string;
    latestMessage: string;
    unreadCount: number;
    updatedAt: string;
}

interface Props {
    conversations: Conversation[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    isLoading: boolean;
}

const ConversationSidebar: React.FC<Props> = ({
    conversations,
    selectedId,
    onSelect,
    searchQuery,
    onSearchChange,
    isLoading
}) => {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <h3>Inbox Bantuan</h3>
            </div>

            <div className={styles.searchBox}>
                <Search size={18} className={styles.icon} />
                <input
                    type="text"
                    placeholder="Cari nama atau email..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            <div className={styles.list}>
                {isLoading && conversations.length === 0 ? (
                    <div className={styles.statusText}>Memuat percakapan...</div>
                ) : conversations.length === 0 ? (
                    <div className={styles.statusText}>Tidak ada percakapan aktif.</div>
                ) : (
                    conversations.map(conv => (
                        <div
                            key={conv.id}
                            className={`${styles.convCard} ${selectedId === conv.id ? styles.active : ''}`}
                            onClick={() => onSelect(conv.id)}
                        >
                            <img src={conv.profilePicUrl || '/assets/default-avatar.png'} alt={conv.username} className={styles.avatar} />

                            <div className={styles.info}>
                                <div className={styles.topRow}>
                                    <span className={styles.name}>{conv.username}</span>
                                    <span className={styles.time}>{conv.updatedAt}</span>
                                </div>
                                <div className={styles.bottomRow}>
                                    <span className={styles.messagePreview}>{conv.latestMessage}</span>
                                    {conv.unreadCount > 0 && (
                                        <span className={styles.badge}>{conv.unreadCount}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
};

export default ConversationSidebar;