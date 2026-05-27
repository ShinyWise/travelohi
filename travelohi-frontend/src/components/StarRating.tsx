import React from 'react';
import { Star, StarHalf } from 'lucide-react';
import styles from './StarRating.module.scss';

interface Props {
    rating: number;
    maxStars?: number;
}

const StarRating: React.FC<Props> = ({ rating, maxStars = 5 }) => {
    return (
        <div className={styles.starsContainer} aria-label={`Rating: ${rating} out of ${maxStars} stars`}>
            {Array.from({ length: maxStars }).map((_, index) => {
                const starValue = index + 1;
                const isFull = rating >= starValue;
                const isHalf = rating >= starValue - 0.5 && !isFull;

                if (isFull) {
                    return (
                        <Star 
                            key={index} 
                            className={`${styles.star} ${styles.filled}`} 
                            size={16} 
                            fill="#F59E0B" 
                            stroke="#F59E0B" 
                        />
                    );
                } else if (isHalf) {
                    return (
                        <StarHalf 
                            key={index} 
                            className={styles.star} 
                            size={16} 
                            fill="#F59E0B" 
                            stroke="#F59E0B" 
                        />
                    );
                } else {
                    return (
                        <Star 
                            key={index} 
                            className={styles.star} 
                            size={16} 
                            fill="transparent" 
                            stroke="#e0e0e0" 
                        />
                    );
                }
            })}
        </div>
    );
};

export default StarRating;
