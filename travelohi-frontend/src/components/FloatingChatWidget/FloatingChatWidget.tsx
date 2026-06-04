import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import styles from './FloatingChatWidget.module.scss';

const FloatingChatWidget: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const { unreadChatCount } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();

    const hiddenPaths = ['/support', '/admin', '/login', '/register', '/forgot-password', '/activate'];
    if (!isAuthenticated || hiddenPaths.includes(location.pathname)) {
        return null;
    }

    return (
        <button
            id="floating-chat-widget"
            className={styles.chatBubble}
            onClick={() => navigate('/support')}
            aria-label="Open Customer Support Chat"
        >
            <MessageCircle size={26} />
            {unreadChatCount > 0 && (
                <span className={styles.badge}>{unreadChatCount > 99 ? '99+' : unreadChatCount}</span>
            )}
        </button>
    );
};

export default FloatingChatWidget;
