import React from 'react';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import styles from './Footer.module.scss';

const Footer: React.FC = () => {
    const { language } = useAppContext();
    const t = translations[language];

    return (
        <footer className={styles.footer}>
            <div className={styles.footerContainer}>
                <div className={styles.linkGroup}>
                    <h4>{t.follow_us}</h4>
                    <ul>
                        <li><a href="https://www.instagram.com/franssebstian/" rel="noopener noreferrer">Instagram</a></li>
                        <li><a href="https://www.threads.com/@franssebstian" target="_blank" rel="noopener noreferrer">Threads</a></li>
                        <li><a href="https://www.linkedin.com/in/frans-winata-769b3a30b" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
                        <li><a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a></li>
                        <li><a href="https://tiktok.com" target="_blank" rel="noopener noreferrer">TikTok</a></li>
                    </ul>
                </div>

                <div className={styles.linkGroup}>
                    <h4>{t.internal_links}</h4>
                    <ul>
                        <li><a href="/">{t.home}</a></li>
                        <li><a href="/search">{t.search_tickets}</a></li>
                        <li><a href="/login">{t.login}</a></li>
                        <li><a href="/register">{t.register}</a></li>
                    </ul>
                </div>
            </div>
            <div className={styles.copyright}>
                &copy; {new Date().getFullYear()} TraveloHI. {t.copyright}
            </div>
        </footer>
    );
};

export default Footer;