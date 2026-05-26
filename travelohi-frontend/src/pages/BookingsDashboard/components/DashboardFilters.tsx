import React from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './DashboardFilters.module.scss';

interface Props {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    itemTypeFilter: 'all' | 'flight' | 'hotel';
    onTypeFilterChange: (filter: 'all' | 'flight' | 'hotel') => void;
}

const DashboardFilters: React.FC<Props> = ({
    searchQuery,
    onSearchChange,
    itemTypeFilter,
    onTypeFilterChange
}) => {
    const { language } = useAppContext();
    const t = translations[language];

    return (
        <div className={styles.filtersContainer}>
            <div className={styles.searchWrapper}>
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder={t.tickets_search_placeholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            <div className={styles.toggleButtonsGroup}>
                <button
                    className={`${styles.filterBtn} ${itemTypeFilter === 'all' ? styles.active : ''}`}
                    onClick={() => onTypeFilterChange('all')}
                >
                    {t.tickets_history_filter_all}
                </button>
                <button
                    className={`${styles.filterBtn} ${itemTypeFilter === 'flight' ? styles.active : ''}`}
                    onClick={() => onTypeFilterChange('flight')}
                >
                    {t.tickets_history_filter_flight}
                </button>
                <button
                    className={`${styles.filterBtn} ${itemTypeFilter === 'hotel' ? styles.active : ''}`}
                    onClick={() => onTypeFilterChange('hotel')}
                >
                    {t.tickets_history_filter_hotel}
                </button>
            </div>
        </div>
    );
};

export default DashboardFilters;
