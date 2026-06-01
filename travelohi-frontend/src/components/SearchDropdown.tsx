import React from 'react';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import { Clock, Building, Plane } from 'lucide-react';
import { HotelSearchResult, AirlineSearchResult } from '../proto/travelohi/v1/telemetry/telemetry';
import styles from './SearchDropdown.module.scss';

export type DropdownAirline = AirlineSearchResult & { displayTitle?: string };

interface SearchDropdownProps {
    isOpen: boolean;
    recentSearches: string[];
    hotels?: HotelSearchResult[];
    airlines?: DropdownAirline[];
    onSelect: (query: string) => void;
    isLoading: boolean;
}
const SearchDropdown: React.FC<SearchDropdownProps> = ({
    isOpen,
    recentSearches,
    hotels = [],
    airlines = [],
    onSelect,
    isLoading
}) => {
    const { language } = useAppContext();
    const t = translations[language];
    if (!isOpen) return null;

    const handleKeyDown = (e: React.KeyboardEvent, query: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(query);
        }
    };

    return (
        <div className={styles.dropdownContainer} role="listbox">
            {isLoading ? (
                <div className={styles.loadingText}>{t.search_loading}</div>
            ) : (
                <>
                    {recentSearches.length > 0 && (
                        <div className={styles.section}>
                            <h4>{t.search_recent}</h4>
                            <ul className={styles.list}>
                                {recentSearches.map((query, idx) => (
                                    <li 
                                        key={`recent-${idx}`} 
                                        onClick={() => onSelect(query)} 
                                        onKeyDown={(e) => handleKeyDown(e, query)}
                                        role="option"
                                        tabIndex={0}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                    >
                                        <span className={styles.icon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                            <Clock size={16} />
                                        </span>
                                        <span>{query}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {airlines.length > 0 && (
                        <div className={styles.section}>
                            <h4>Airlines</h4>
                            <ul className={styles.list}>
                                {airlines.map((airline, idx) => (
                                    <li 
                                        key={`airline-${airline.id || idx}`} 
                                        onClick={() => onSelect(airline.name)} 
                                        onKeyDown={(e) => handleKeyDown(e, airline.name)}
                                        role="option"
                                        tabIndex={0}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                    >
                                        <span className={styles.icon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                                            <Plane size={16} />
                                        </span>
                                        <span style={{ fontWeight: '500' }}>{airline.displayTitle || airline.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {hotels.length > 0 && (
                        <div className={styles.section}>
                            <h4>Hotels</h4>
                            <ul className={styles.list}>
                                {hotels.map((hotel, idx) => (
                                    <li 
                                        key={`hotel-${hotel.id || idx}`} 
                                        onClick={() => onSelect(hotel.name)} 
                                        onKeyDown={(e) => handleKeyDown(e, hotel.name)}
                                        role="option"
                                        tabIndex={0}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                    >
                                        <span className={styles.icon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                                            <Building size={16} />
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: '500' }}>{hotel.name}</span>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{hotel.location}</span>
                                        </div>
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