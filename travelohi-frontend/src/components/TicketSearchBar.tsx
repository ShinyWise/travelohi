import React from 'react';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import styles from './TicketSearchBar.module.scss';

interface Props {
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

const TicketSearchBar: React.FC<Props> = ({ searchQuery, onSearchChange }) => {
    const { language } = useAppContext();
    const t = translations[language];

    return (
        <div className={styles.searchContainer}>
            <span className={styles.searchIcon}>🔍</span>
            <input
                type="text"
                className={styles.searchInput}
                placeholder={t.tickets_search_placeholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
            />
        </div>
    );
};

export default TicketSearchBar;