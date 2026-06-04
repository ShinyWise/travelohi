import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import { Star } from 'lucide-react';
import styles from './FilterSidebar.module.scss';


const PRICE_BUCKETS = [
    { id: 0, min: null, max: null },
    { id: 1, min: null, max: 500000 },
    { id: 2, min: 500000, max: 1000000 },
    { id: 3, min: 1000000, max: 3000000 },
    { id: 4, min: 3000000, max: null },
];

interface Props {
    searchType: 'all' | 'flight' | 'hotel';
}
const FilterSidebar: React.FC<Props> = ({ searchType }) => {
    const { language, currency } = useAppContext();
    const t = translations[language];
    const [searchParams, setSearchParams] = useSearchParams();
    const [localPriceBucketIndex, setLocalPriceBucketIndex] = useState<number>(0);
    const [localSortBy, setLocalSortBy] = useState('');
    const [localTransit, setLocalTransit] = useState('');
    const [localMinRating, setLocalMinRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [localFacilities, setLocalFacilities] = useState<string[]>([]);

    useEffect(() => {
        const minUrl = searchParams.get('min_price') || '';
        const maxUrl = searchParams.get('max_price') || '';

        const index = PRICE_BUCKETS.findIndex(b => 
            (b.min === null ? minUrl === '' : String(b.min) === minUrl) &&
            (b.max === null ? maxUrl === '' : String(b.max) === maxUrl)
        );
        setLocalPriceBucketIndex(index >= 0 ? index : 0);

        setLocalSortBy(searchParams.get('sort_by') || '');
        setLocalTransit(searchParams.get('transit') || '');
        const ratingUrl = searchParams.get('min_rating');
        setLocalMinRating(ratingUrl ? Number(ratingUrl) : 0);
        setLocalFacilities(searchParams.getAll('facility'));
    }, [searchParams, currency]);

    const renderBucketLabel = (bucket: typeof PRICE_BUCKETS[0]) => {
        if (bucket.id === 0) return t.price_any;
        
        const prefix = currency === 'USD' ? '$' : 'Rp ';
        const format = (val: number) => {
            if (currency === 'USD') {
                return Math.round((val / 20000) / 10) * 10;
            }
            return parseInt(String(val), 10).toLocaleString('id-ID');
        };

        if (bucket.min === null) return `< ${prefix}${format(bucket.max!)}`;
        if (bucket.max === null) return `> ${prefix}${format(bucket.min!)}`;
        return `${prefix}${format(bucket.min)} - ${prefix}${format(bucket.max)}`;
    };

    const toggleArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
        setter(prev => prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]);
    };

    const applyAllFilters = () => {
        const newParams = new URLSearchParams(searchParams);
        
        const bucket = PRICE_BUCKETS[localPriceBucketIndex];
        if (bucket.min) newParams.set('min_price', String(bucket.min));
        else newParams.delete('min_price');

        if (bucket.max) newParams.set('max_price', String(bucket.max));
        else newParams.delete('max_price');

        if (localSortBy) newParams.set('sort_by', localSortBy);
        else newParams.delete('sort_by');

        if (localTransit) newParams.set('transit', localTransit);
        else newParams.delete('transit');

        if (localMinRating > 0) newParams.set('min_rating', String(localMinRating));
        else newParams.delete('min_rating');

        newParams.delete('facility');
        localFacilities.forEach(f => newParams.append('facility', f));

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
                        setLocalPriceBucketIndex(0);
                        setSearchParams(reset);
                    }}
                >
                    {t.reset}
                </button>
            </div>
            <div className={styles.filterGroup}>
                <h4>{t.price_limit}</h4>
                <select 
                    className={styles.priceDropdown}
                    value={localPriceBucketIndex}
                    onChange={(e) => setLocalPriceBucketIndex(Number(e.target.value))}
                >
                    {PRICE_BUCKETS.map((bucket, idx) => (
                        <option key={idx} value={idx}>
                            {renderBucketLabel(bucket)}
                        </option>
                    ))}
                </select>
            </div>
            {searchType !== 'all' && (
                <div className={styles.filterGroup}>
                    <h4>{t.sort_by}</h4>
                    <div className={styles.options}>
                        {searchType === 'hotel' ? (
                        <>
                            <label>
                                <input type="radio" checked={localSortBy === 'price_asc'} onChange={() => setLocalSortBy('price_asc')} />
                                {t.lowest_price}
                            </label>
                            <label>
                                <input type="radio" checked={localSortBy === 'price_desc'} onChange={() => setLocalSortBy('price_desc')} />
                                {t.highest_price}
                            </label>
                            <label>
                                <input type="radio" checked={localSortBy === 'rating_desc'} onChange={() => setLocalSortBy('rating_desc')} />
                                {t.highest_rating}
                            </label>
                            <label>
                                <input type="radio" checked={localSortBy === 'reviews_desc'} onChange={() => setLocalSortBy('reviews_desc')} />
                                {t.most_reviews}
                            </label>
                            <label>
                                <input type="radio" checked={localSortBy === 'availability_desc'} onChange={() => setLocalSortBy('availability_desc')} />
                                {t.room_availability}
                            </label>
                        </>
                    ) : (
                        <>
                            <label>
                                <input type="radio" checked={localSortBy === 'duration_asc'} onChange={() => setLocalSortBy('duration_asc')} />
                                {t.fastest_duration}
                            </label>
                            <label>
                                <input type="radio" checked={localSortBy === 'price_asc'} onChange={() => setLocalSortBy('price_asc')} />
                                {t.lowest_price}
                            </label>
                            <label>
                                <input type="radio" checked={localSortBy === 'price_desc'} onChange={() => setLocalSortBy('price_desc')} />
                                {t.highest_price}
                            </label>
                            <label>
                                <input type="radio" checked={localSortBy === 'transits_asc'} onChange={() => setLocalSortBy('transits_asc')} />
                                {t.least_transits}
                            </label>
                        </>
                    )}
                </div>
            </div>
            )}
            {searchType === 'flight' && (
                <div className={styles.filterGroup}>
                    <h4>{t.transit}</h4>
                    <div className={styles.options}>
                        <label>
                            <input type="radio" checked={localTransit === ''} onChange={() => setLocalTransit('')} />
                            {t.search_tab_all}
                        </label>
                        <label>
                            <input type="radio" checked={localTransit === 'direct'} onChange={() => setLocalTransit('direct')} />
                            {t.direct}
                        </label>
                        <label>
                            <input type="radio" checked={localTransit === '1_transit'} onChange={() => setLocalTransit('1_transit')} />
                            {t.transit_flight}
                        </label>
                    </div>
                </div>
            )}
            {searchType === 'hotel' && (
                <>
                    <div className={styles.filterGroup}>
                        <h4>{t.star_rating}</h4>
                        <div className={styles.starContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className={styles.starBtn}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setLocalMinRating(star === localMinRating ? 0 : star)}
                                >
                                    <Star 
                                        size={28} 
                                        fill={(hoverRating || localMinRating) >= star ? '#3b82f6' : 'none'}
                                        color={(hoverRating || localMinRating) >= star ? '#3b82f6' : 'var(--text-secondary)'}
                                        style={{ transition: 'all 0.2s ease' }}
                                    />
                                </button>
                            ))}
                        </div>
                        {localMinRating > 0 && <div className={styles.starLabel}>{localMinRating} {t.star_above}</div>}
                    </div>
                    <div className={styles.filterGroup}>
                        <h4>{t.facilities}</h4>
                        <div className={styles.options}>
                            <label>
                                <input type="checkbox" checked={localFacilities.includes('WiFi')} onChange={() => toggleArrayItem(setLocalFacilities, 'WiFi')} />
                                WiFi
                            </label>
                            <label>
                                <input type="checkbox" checked={localFacilities.includes('Swimming Pool')} onChange={() => toggleArrayItem(setLocalFacilities, 'Swimming Pool')} />
                                {t.pool}
                            </label>
                            <label>
                                <input type="checkbox" checked={localFacilities.includes('Gym')} onChange={() => toggleArrayItem(setLocalFacilities, 'Gym')} />
                                {t.gym}
                            </label>
                            <label>
                                <input type="checkbox" checked={localFacilities.includes('Restaurant')} onChange={() => toggleArrayItem(setLocalFacilities, 'Restaurant')} />
                                {t.restaurant}
                            </label>
                            <label>
                                <input type="checkbox" checked={localFacilities.includes('Spa')} onChange={() => toggleArrayItem(setLocalFacilities, 'Spa')} />
                                {t.spa}
                            </label>
                            <label>
                                <input type="checkbox" checked={localFacilities.includes('24-Hour Front Desk')} onChange={() => toggleArrayItem(setLocalFacilities, '24-Hour Front Desk')} />
                                {t.front_desk}
                            </label>
                            <label>
                                <input type="checkbox" checked={localFacilities.includes('Elevator')} onChange={() => toggleArrayItem(setLocalFacilities, 'Elevator')} />
                                {t.elevator}
                            </label>
                            <label>
                                <input type="checkbox" checked={localFacilities.includes('Parking')} onChange={() => toggleArrayItem(setLocalFacilities, 'Parking')} />
                                {t.parking}
                            </label>
                            <label>
                                <input type="checkbox" checked={localFacilities.includes('Airport Shuttle')} onChange={() => toggleArrayItem(setLocalFacilities, 'Airport Shuttle')} />
                                {t.airport_shuttle}
                            </label>
                        </div>
                    </div>
                </>
            )}

            <button className={styles.applyAllBtn} onClick={applyAllFilters}>
                {t.apply_all_filters}
            </button>
        </aside>
    );
};
export default FilterSidebar;