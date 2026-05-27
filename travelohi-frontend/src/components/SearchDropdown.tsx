import React from 'react';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import { Clock, Flame } from 'lucide-react';
import styles from './SearchDropdown.module.scss';
interface SearchDropdownProps {
    isOpen: boolean;
    recentSearches: string[];
    recommendations: string[];
    onSelect: (query: string) => void;
    isLoading: boolean;
}
const SearchDropdown: React.FC<SearchDropdownProps> = ({
    isOpen,
    recentSearches,
    recommendations,
    onSelect,
    isLoading
}) => {
    const { language } = useAppContext();
    const t = translations[language];
    if (!isOpen) return null;
    return (
        <div className={styles.dropdownContainer}>
            {isLoading ? (
                <div className={styles.loadingText}>{t.search_loading}</div>
            ) : (
                <>
                    {recentSearches.length > 0 && (
                        <div className={styles.section}>
                            <h4>{t.search_recent}</h4>
                            <ul className={styles.list}>
                                {recentSearches.map((query, idx) => (
                                    <li key={`recent-${idx}`} onClick={() => onSelect(query)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={styles.icon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                            <Clock size={16} />
                                        </span>
                                        <span>{query}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {recommendations.length > 0 && (
                        <div className={styles.section}>
                            <h4>{t.search_global}</h4>
                            <ul className={styles.list}>
                                {recommendations.map((query, idx) => (
                                    <li key={`rec-${idx}`} onClick={() => onSelect(query)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={styles.icon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                            <Flame size={16} />
                                        </span>
                                        <span>{query}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
export default SearchDropdown;