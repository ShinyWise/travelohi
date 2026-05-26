import React from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './DashboardTabs.module.scss';

interface Props {
    activeTab: 'active' | 'history';
    onTabChange: (tab: 'active' | 'history') => void;
}

const DashboardTabs: React.FC<Props> = ({ activeTab, onTabChange }) => {
    const { language } = useAppContext();
    const t = translations[language];

    return (
        <div className={styles.tabsContainer}>
            <button
                className={`${styles.tabBtn} ${activeTab === 'active' ? styles.active : ''}`}
                onClick={() => onTabChange('active')}
            >
                {t.tickets_tab_active}
            </button>
            <button
                className={`${styles.tabBtn} ${activeTab === 'history' ? styles.active : ''}`}
                onClick={() => onTabChange('history')}
            >
                {t.tickets_tab_history}
            </button>
        </div>
    );
};

export default DashboardTabs;
