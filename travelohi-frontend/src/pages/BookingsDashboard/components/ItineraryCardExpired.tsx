import React from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import { Calendar, CheckCircle } from 'lucide-react';
import styles from './ItineraryCardExpired.module.scss';

export interface HistoryItem {
    id: string;
    hotelId?: string;
    type: 'flight' | 'hotel';
    title: string;
    subtitle: string;
    dateString: string;
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

            <div className={styles.infoBox}>
                <div className={styles.header}>
                    <span className={styles.typeBadge}>
                        {item.type === 'flight' ? t.profile_booking_flight : t.profile_booking_hotel}
                    </span>
                    <span className={styles.date} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        <span>{item.dateString}</span>
                    </span>
                </div>

                <h4>{item.title}</h4>
                <p className={styles.subtitle}>{item.subtitle}</p>
            </div>

            <div className={styles.actionBox}>
                {item.type === 'hotel' ? (
                    item.hasReviewed ? (
                        <span className={styles.reviewedBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} />
                            <span>{t.tickets_history_review_submitted}</span>
                        </span>
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