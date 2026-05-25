import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import styles from './FilterSidebar.module.scss';
interface Props {
    searchType: 'flight' | 'hotel';
}
const FilterSidebar: React.FC<Props> = ({ searchType }) => {
    const { language } = useAppContext();
    const t = translations[language];
    const [searchParams, setSearchParams] = useSearchParams();
    const [minPriceInput, setMinPriceInput] = useState(searchParams.get('min_price') || '');
    const [maxPriceInput, setMaxPriceInput] = useState(searchParams.get('max_price') || '');
    useEffect(() => {
        setMinPriceInput(searchParams.get('min_price') || '');
        setMaxPriceInput(searchParams.get('max_price') || '');
    }, [searchParams]);
    const updateFilter = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (newParams.get(key) === value) {
            newParams.delete(key);
        } else {
            newParams.set(key, value);
        }
        newParams.set('page', '1'); // reset pagination
        setSearchParams(newParams);
    };
    const isChecked = (key: string, value: string) => searchParams.get(key) === value;
    const toggleFacility = (facility: string) => {
        const newParams = new URLSearchParams(searchParams);
        const currentFacilities = newParams.getAll('facility');
        newParams.delete('facility');
        let updated: string[];
        if (currentFacilities.includes(facility)) {
            updated = currentFacilities.filter(f => f !== facility);
        } else {
            updated = [...currentFacilities, facility];
        }
        updated.forEach(f => newParams.append('facility', f));
        newParams.set('page', '1');
        setSearchParams(newParams);
    };
    const isFacilityChecked = (facility: string) => {
        return searchParams.getAll('facility').includes(facility);
    };
    const applyPriceFilter = () => {
        const newParams = new URLSearchParams(searchParams);
        if (minPriceInput) {
            newParams.set('min_price', minPriceInput);
        } else {
            newParams.delete('min_price');
        }
        if (maxPriceInput) {
            newParams.set('max_price', maxPriceInput);
        } else {
            newParams.delete('max_price');
        }
        newParams.set('page', '1');
        setSearchParams(newParams);
    };
    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <h3>{t.filter}</h3>
                <button
                    className={styles.resetBtn}
                    onClick={() => {
                        const reset = new URLSearchParams();
                        reset.set('q', searchParams.get('q') || '');
                        reset.set('type', searchType);
                        setMinPriceInput('');
                        setMaxPriceInput('');
                        setSearchParams(reset);
                    }}
                >
                    {t.reset}
                </button>
            </div>
            {/* price filter */}
            <div className={styles.filterGroup}>
                <h4>{t.price_limit}</h4>
                <div className={styles.priceRangeInput}>
                    <input
                        type="number"
                        placeholder={t.min_price}
                        value={minPriceInput}
                        onChange={(e) => setMinPriceInput(e.target.value)}
                    />
                    <span>-</span>
                    <input
                        type="number"
                        placeholder={t.max_price}
                        value={maxPriceInput}
                        onChange={(e) => setMaxPriceInput(e.target.value)}
                    />
                </div>
                <button className={styles.applyPriceBtn} onClick={applyPriceFilter}>
                    {t.apply_price}
                </button>
            </div>
            {/* sorting */}
            <div className={styles.filterGroup}>
                <h4>{t.sort_by}</h4>
                <div className={styles.options}>
                    {searchType === 'hotel' ? (
                        <>
                            <label>
                                <input type="radio" checked={isChecked('sort_by', 'price_asc')} onChange={() => updateFilter('sort_by', 'price_asc')} />
                                {t.lowest_price}
                            </label>
                            <label>
                                <input type="radio" checked={isChecked('sort_by', 'price_desc')} onChange={() => updateFilter('sort_by', 'price_desc')} />
                                {t.highest_price}
                            </label>
                            <label>
                                <input type="radio" checked={isChecked('sort_by', 'rating_desc')} onChange={() => updateFilter('sort_by', 'rating_desc')} />
                                {t.highest_rating}
                            </label>
                            <label>
                                <input type="radio" checked={isChecked('sort_by', 'reviews_desc')} onChange={() => updateFilter('sort_by', 'reviews_desc')} />
                                {t.most_reviews}
                            </label>
                            <label>
                                <input type="radio" checked={isChecked('sort_by', 'availability_desc')} onChange={() => updateFilter('sort_by', 'availability_desc')} />
                                {t.room_availability}
                            </label>
                        </>
                    ) : (
                        <>
                            <label>
                                <input type="radio" checked={isChecked('sort_by', 'duration_asc')} onChange={() => updateFilter('sort_by', 'duration_asc')} />
                                {t.fastest_duration}
                            </label>
                            <label>
                                <input type="radio" checked={isChecked('sort_by', 'price_asc')} onChange={() => updateFilter('sort_by', 'price_asc')} />
                                {t.lowest_price}
                            </label>
                            <label>
                                <input type="radio" checked={isChecked('sort_by', 'price_desc')} onChange={() => updateFilter('sort_by', 'price_desc')} />
                                {t.highest_price}
                            </label>
                            <label>
                                <input type="radio" checked={isChecked('sort_by', 'transits_asc')} onChange={() => updateFilter('sort_by', 'transits_asc')} />
                                {t.least_transits}
                            </label>
                        </>
                    )}
                </div>
            </div>
            {/* flight filters */}
            {searchType === 'flight' && (
                <div className={styles.filterGroup}>
                    <h4>{t.transit}</h4>
                    <div className={styles.options}>
                        <label>
                            <input type="checkbox" checked={isChecked('transit', 'direct')} onChange={() => updateFilter('transit', 'direct')} />
                            {t.direct}
                        </label>
                        <label>
                            <input type="checkbox" checked={isChecked('transit', '1_transit')} onChange={() => updateFilter('transit', '1_transit')} />
                            {t.transit_flight}
                        </label>
                    </div>
                </div>
            )}
            {/* hotel filters */}
            {searchType === 'hotel' && (
                <>
                    <div className={styles.filterGroup}>
                        <h4>{t.star_rating}</h4>
                        <div className={styles.options}>
                            {[5, 4, 3].map(star => (
                                <label key={star}>
                                    <input type="checkbox" checked={isChecked('min_rating', String(star))} onChange={() => updateFilter('min_rating', String(star))} />
                                    {star} {t.star_above}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className={styles.filterGroup}>
                        <h4>{t.facilities}</h4>
                        <div className={styles.options}>
                            <label>
                                <input type="checkbox" checked={isFacilityChecked('WiFi')} onChange={() => toggleFacility('WiFi')} />
                                WiFi
                            </label>
                            <label>
                                <input type="checkbox" checked={isFacilityChecked('Pool')} onChange={() => toggleFacility('Pool')} />
                                {t.pool}
                            </label>
                            <label>
                                <input type="checkbox" checked={isFacilityChecked('Gym')} onChange={() => toggleFacility('Gym')} />
                                {t.gym}
                            </label>
                            <label>
                                <input type="checkbox" checked={isFacilityChecked('Restaurant')} onChange={() => toggleFacility('Restaurant')} />
                                {t.restaurant}
                            </label>
                        </div>
                    </div>
                </>
            )}
        </aside>
    );
};
export default FilterSidebar;