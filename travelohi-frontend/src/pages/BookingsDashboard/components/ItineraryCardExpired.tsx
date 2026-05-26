import React from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './ItineraryCardExpired.module.scss';

export interface HistoryItem {
    id: string;
    hotelId?: string;
    type: 'flight' | 'hotel';
    title: string;
    subtitle: string;
    dateString: string;
    imageUrl: string;
    hasReviewed: boolean;
}

interface Props {
    item: HistoryItem;
    onLeaveReview: (item: HistoryItem) => void;
}

const ExpiredItineraryCard: React.FC<Props> = ({ item, onLeaveReview }) => {
    const { language } = useAppContext();
    const t = translations[language];

    return (
        <div className={styles.card}>
            <div className={styles.imageBox}>
                <img
                    src={item.imageUrl || (item.type === 'hotel' ? '/assets/default-hotel.jpg' : '/assets/default-flight.jpg')}
                    alt={item.title}
                    onError={(e) => {
                        e.currentTarget.src = item.type === 'hotel'
                            ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%23666">🏨 Hotel</text></svg>'
                            : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%23666">✈️ Flight</text></svg>';
                    }}
                />
            </div>

            <div className={styles.infoBox}>
                <div className={styles.header}>
                    <span className={styles.typeBadge}>
                        {item.type === 'flight' ? t.profile_booking_flight : t.profile_booking_hotel}
                    </span>
                    <span className={styles.date}>📅 {item.dateString}</span>
                </div>

                <h4>{item.title}</h4>
                <p className={styles.subtitle}>{item.subtitle}</p>
            </div>

            <div className={styles.actionBox}>
                {item.type === 'hotel' ? (
                    item.hasReviewed ? (
                        <span className={styles.reviewedBadge}>✅ {t.tickets_history_review_submitted}</span>
                    ) : (
                        <button className={styles.reviewBtn} onClick={() => onLeaveReview(item)}>
                            {t.tickets_history_btn_review}
                        </button>
                    )
                ) : null}
            </div>
        </div>
    );
};

export default ExpiredItineraryCard;