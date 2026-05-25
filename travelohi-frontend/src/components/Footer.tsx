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
                    <h4>{t.external_links}</h4>
                    <ul>
                        <li><a href="https://www.binus.ac.id" target="_blank" rel="noopener noreferrer">BINUS University</a></li>
                        <li><a href="https://reactjs.org" target="_blank" rel="noopener noreferrer">React Documentation</a></li>
                        <li><a href="https://grpc.io/docs/" target="_blank" rel="noopener noreferrer">gRPC Specifications</a></li>
                        <li><a href="https://www.postgresql.org/" target="_blank" rel="noopener noreferrer">PostgreSQL</a></li>
                        <li><a href="https://www.docker.com/" target="_blank" rel="noopener noreferrer">Docker Containerization</a></li>
                    </ul>
                </div>

                <div className={styles.linkGroup}>
                    <h4>{t.internal_links}</h4>
                    <ul>
                        <li><a href="/about">{t.about_travelohi}</a></li>
                        <li><a href="/promos">{t.active_promos}</a></li>
                        <li><a href="/support">{t.customer_service}</a></li>
                        <li><a href="/careers">{t.careers}</a></li>
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