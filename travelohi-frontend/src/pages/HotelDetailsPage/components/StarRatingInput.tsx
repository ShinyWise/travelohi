import React, { useState } from 'react';
import styles from './StarRatingInput.module.scss';

interface Props {
    label: string;
    value: number;
    onChange: (rating: number) => void;
}

const StarRatingInput: React.FC<Props> = ({ label, value, onChange }) => {
    const [hoverValue, setHoverValue] = useState(0);

    return (
        <div className={styles.ratingContainer}>
            <span className={styles.label}>{label}</span>
            <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        className={`${styles.starBtn} ${star <= (hoverValue || value) ? styles.active : ''}`}
                        onMouseEnter={() => setHoverValue(star)}
                        onMouseLeave={() => setHoverValue(0)}
                        onClick={() => onChange(star)}
                        aria-label={`Rate ${star} stars out of 5 for ${label}`}
                    >
                        ★
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StarRatingInput;