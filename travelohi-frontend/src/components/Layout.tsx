import React from 'react';
import { useAppContext } from '../context/ThemeContext';
import Navbar from './Navbar';
import Footer from './Footer';
import { ToastProvider } from './Toast';
import styles from './Layout.module.scss';
interface LayoutProps {
    children: React.ReactNode;
}
const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { theme } = useAppContext();
    return (
        <ToastProvider>
            <div className={`${styles.layoutContainer} ${styles[theme]}`}>
                <Navbar />
                <main className={styles.mainContent}>
                    {children}
                </main>
                <Footer />
            </div>
        </ToastProvider>
    );
};
export default Layout;