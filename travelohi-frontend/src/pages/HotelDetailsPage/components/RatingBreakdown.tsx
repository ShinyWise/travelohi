import React from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './RatingBreakdown.module.scss';
interface Props {
    cleanliness: number;
    comfort: number;
    location: number;
    service: number;
    average: number;
}
const RatingBreakdown: React.FC<Props> = ({ cleanliness, comfort, location, service, average }) => {
    const { language } = useAppContext();
    const t = translations[language];
    const renderBar = (label: string, score: number) => (
        <div className={styles.ratingRow}>
            <span className={styles.label}>{label}</span>
            <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${(score / 10) * 100}%` }}></div>
            </div>
            <span className={styles.score}>{score.toFixed(1)}</span>
        </div>
    );
    return (
        <div className={styles.breakdownContainer}>
            <div className={styles.averageBox}>
                <h3>{average.toFixed(1)}</h3>
                <span>{t.rating_excellent}</span>
            </div>
            <div className={styles.barsContainer}>
                {renderBar(t.rating_cleanliness, cleanliness)}
                {renderBar(t.rating_comfort, comfort)}
                {renderBar(t.rating_location, location)}
                {renderBar(t.rating_service, service)}
            </div>
        </div>
    );
};
export default RatingBreakdown;