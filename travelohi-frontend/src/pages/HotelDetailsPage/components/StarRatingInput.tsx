import React, { useState } from 'react';
import { Star } from 'lucide-react';
import styles from './StarRatingInput.module.scss';

interface Props {
    label: string;
    value: number;
    onChange: (rating: number) => void;
}

const StarRatingInput: React.FC<Props> = ({ label, value, onChange }) => {
    const [hoverValue, setHoverValue] = useState(0);
    const isActive = (star: number) => star <= (hoverValue || value);

    return (
        <div className={styles.ratingContainer}>
            <span className={styles.label}>{label}</span>
            <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        className={`${styles.starBtn} ${isActive(star) ? styles.active : ''}`}
                        onMouseEnter={() => setHoverValue(star)}
                        onMouseLeave={() => setHoverValue(0)}
                        onClick={() => onChange(star)}
                        aria-label={`Rate ${star} stars out of 5 for ${label}`}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Star
                            size={20}
                            fill={isActive(star) ? '#f59e0b' : 'transparent'}
                            stroke={isActive(star) ? '#f59e0b' : '#cbd5e1'}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StarRatingInput;