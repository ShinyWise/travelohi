import React from 'react';
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
                        <svg key={index} className={`${styles.star} ${styles.filled}`} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    );
                } else if (isHalf) {
                    return (
                        <svg key={index} className={styles.star} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id={`half-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="50%" stopColor="#F59E0B" />
                                    <stop offset="50%" stopColor="#e0e0e0" />
                                </linearGradient>
                            </defs>
                            <path fill={`url(#half-${index})`} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    );
                } else {
                    return (
                        <svg key={index} className={styles.star} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    );
                }
            })}
        </div>
    );
};

export default StarRating;
