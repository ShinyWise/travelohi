import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../context/ThemeContext';
import Navbar from './Navbar';
import Footer from './Footer';
import { ToastProvider } from './Toast';
import { NotificationProvider } from '../context/NotificationContext';
import FloatingChatWidget from './FloatingChatWidget/FloatingChatWidget';
import styles from './Layout.module.scss';
interface LayoutProps {
    children: React.ReactNode;
}
const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { theme } = useAppContext();
    const location = useLocation();
    const isSupportPage = location.pathname === '/support';
    const hideFooter = isSupportPage || location.pathname === '/admin';

    React.useEffect(() => {
        document.body.style.backgroundColor = theme === 'dark' ? '#121212' : '#ffffff';
    }, [theme]);

    return (
        <ToastProvider>
            <NotificationProvider>
                <div className={`${styles.layoutContainer} ${styles[theme]} ${isSupportPage ? styles.supportLayout : ''}`}>
                    <Navbar />
                    <main className={`${styles.mainContent} ${isSupportPage ? styles.supportMain : ''}`}>
                        {children}
                    </main>
                    {!hideFooter && <Footer />}
                    <FloatingChatWidget />
                </div>
            </NotificationProvider>
        </ToastProvider>
    );
};
export default Layout;