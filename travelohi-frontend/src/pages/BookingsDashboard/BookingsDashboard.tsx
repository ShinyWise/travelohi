import React, { useState } from 'react';
import DashboardTabs from './components/DashboardTabs';
import DashboardFilters from './components/DashboardFilters';
import ActiveItinerariesView from './components/ActiveItinerariesView';
import BookingHistoryView from './components/BookingHistoryView';
import { useAppContext } from '../../context/ThemeContext';
import { translations } from '../../utils/translations';
import styles from './BookingsDashboard.module.scss';

const BookingsDashboard: React.FC = () => {
    const { language } = useAppContext();
    const t = translations[language];

    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'flight' | 'hotel'>('all');

    return (
        <div className={styles.pageContainer}>
            <h2 className={styles.title}>{t.my_orders}</h2>

            <DashboardTabs
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    setSearchQuery('');
                    setItemTypeFilter('all');
                }}
            />

            <DashboardFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                itemTypeFilter={itemTypeFilter}
                onTypeFilterChange={setItemTypeFilter}
            />

            <div className={styles.viewContent}>
                {activeTab === 'active' ? (
                    <ActiveItinerariesView
                        searchQuery={searchQuery}
                        itemTypeFilter={itemTypeFilter}
                    />
                ) : (
                    <BookingHistoryView
                        searchQuery={searchQuery}
                        itemTypeFilter={itemTypeFilter}
                    />
                )}
            </div>
        </div>
    );
};

export default BookingsDashboard;
