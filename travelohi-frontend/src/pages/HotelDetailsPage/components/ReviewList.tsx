import React, { useState } from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './ReviewList.module.scss';
interface HotelReview {
    id: string;
    userName: string;
    ratingAverage: number;
    comment: string;
    createdAt: string;
}
interface Props {
    reviews: HotelReview[];
}
const REVIEWS_PER_PAGE = 5;
const ReviewList: React.FC<Props> = ({ reviews }) => {
    const { language } = useAppContext();
    const t = translations[language];
    const [currentPage, setCurrentPage] = useState(1);
    if (!reviews || reviews.length === 0) {
        return <div className={styles.emptyState}>{t.no_reviews}</div>;
    }
    const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
    const currentReviews = reviews.slice(
        (currentPage - 1) * REVIEWS_PER_PAGE,
        currentPage * REVIEWS_PER_PAGE
    );
    return (
        <div className={styles.reviewContainer}>
            <h3 className={styles.title}>{t.guest_reviews}</h3>
            <div className={styles.list}>
                {currentReviews.map((review) => {
                    const isAnonymous = !review.userName || review.userName.trim() === '' || review.userName.toLowerCase() === 'anonymous';
                    const displayName = isAnonymous ? t.anonymous_traveler : review.userName;
                    // basic avatar placeholder
                    const initial = isAnonymous ? '?' : displayName.charAt(0).toUpperCase();
                    return (
                        <div key={review.id} className={styles.reviewCard}>
                            <div className={styles.userInfo}>
                                <div className={styles.avatar}>{initial}</div>
                                <div className={styles.meta}>
                                    <span className={styles.name}>{displayName}</span>
                                    <span className={styles.date}>{review.createdAt || t.just_now}</span>
                                </div>
                                <div className={styles.ratingBadge}>
                                    {review.ratingAverage.toFixed(1)} / 10
                                </div>
                            </div>
                            <p className={styles.comment}>{review.comment}</p>
                        </div>
                    );
                })}
            </div>
            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        &laquo; {t.previous}
                    </button>
                    <span>{t.page} {currentPage} {t.of} {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        {t.next} &raquo;
                    </button>
                </div>
            )}
        </div>
    );
};
export default ReviewList;