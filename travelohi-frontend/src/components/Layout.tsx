import React from 'react';
import { useAppContext } from '../context/ThemeContext';
import Navbar from './Navbar';
import Footer from './Footer';
import styles from './Layout.module.scss';
interface LayoutProps {
    children: React.ReactNode;
}
const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { theme } = useAppContext();
    return (
        <div className={`${styles.layoutContainer} ${styles[theme]}`}>
            <Navbar />
            <main className={styles.mainContent}>
                {children}
            </main>
            <Footer />
        </div>
    );
};
export default Layout;