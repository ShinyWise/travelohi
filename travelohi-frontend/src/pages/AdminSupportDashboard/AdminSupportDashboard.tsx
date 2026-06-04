import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import ConversationSidebar, { type Conversation } from './components/ConversationSidebar';
import AdminChatWindow from './components/AdminChatWindow';
import { CommunicationServiceClient } from '../../proto/travelohi/v1/communication/communication.client';
import { transport } from '../../utils/grpcClient';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../utils/useDebounce';
import { MessageSquare } from 'lucide-react';
import styles from './AdminSupportDashboard.module.scss';

const commClient = new CommunicationServiceClient(transport);

const AdminSupportDashboard: React.FC = () => {
    const { isAuthenticated, isAdmin, userId } = useAuth();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const debouncedSearch = useDebounce(searchQuery, 500);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!isAdmin) return;

        const fetchConversations = async () => {
            try {
                const { response } = await commClient.getActiveConversations({
                    searchQuery: debouncedSearch,
                    limit: 50,
                    offset: 0
                });

                const mapped: Conversation[] = (response.conversations || [])
                    .filter((c: any) => c.userId !== userId)
                    .map((c: any) => ({
                        id: c.conversationId,
                        userId: c.userId,
                        username: c.fullName,
                        profilePicUrl: c.profilePictureUrl || '',
                        latestMessage: c.latestMessageContent,
                        unreadCount: c.unreadCount,
                        updatedAt: c.latestMessageTimestamp
                            ? new Date(c.latestMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''
                    }));

                setConversations(mapped);
            } catch (err) {
                console.error("Gagal memuat inbox:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConversations();

        // update every 5s
        const pollInterval = setInterval(fetchConversations, 5000);

        return () => clearInterval(pollInterval);
    }, [debouncedSearch, isAdmin]);

    if (!isAuthenticated || !isAdmin) {
        return <Navigate to="/" replace />;
    }

    const selectedConversation = conversations.find(c => c.id === selectedConvId);

    const handleSelectConversation = (id: string) => {
        setSelectedConvId(id);
        setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
    };

    const handleBackToInbox = () => {
        setSelectedConvId(null);
    };

    return (
        <div className={styles.dashboardContainer}>
            {(!isMobile || !selectedConvId) && (
                <ConversationSidebar
                    conversations={conversations}
                    selectedId={selectedConvId}
                    onSelect={handleSelectConversation}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    isLoading={isLoading}
                />
            )}

            {(!isMobile || selectedConvId) && (
                <main className={styles.mainContent}>
                    {selectedConversation ? (
                        <AdminChatWindow
                            conversationId={selectedConversation.id}
                            adminId={userId!}
                            remoteUsername={selectedConversation.username}
                            remoteProfilePicUrl={selectedConversation.profilePicUrl}
                            onBack={isMobile ? handleBackToInbox : undefined}
                        />
                    ) : (
                        <div className={styles.noSelectionState}>
                            <MessageSquare size={48} className={styles.icon} />
                            <h2>Pilih Percakapan</h2>
                            <p>Pilih percakapan dari panel di sebelah kiri untuk mulai merespon keluhan pengguna.</p>
                        </div>
                    )}
                </main>
            )}
        </div>
    );
};

export default AdminSupportDashboard;