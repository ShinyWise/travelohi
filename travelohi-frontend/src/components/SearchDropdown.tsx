import React from 'react';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
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
                                    <li key={`recent-${idx}`} onClick={() => onSelect(query)}>
                                        <span className={styles.icon}>🕒</span> {query}
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
                                    <li key={`rec-${idx}`} onClick={() => onSelect(query)}>
                                        <span className={styles.icon}>🔥</span> {query}
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