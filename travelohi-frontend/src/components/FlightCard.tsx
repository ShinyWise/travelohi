import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import styles from './ResultCard.module.scss';
import { formatCurrency } from '../utils/currencyFormatter';

interface Props {
    flight: any;
}
const FlightCard: React.FC<Props> = ({ flight }) => {
    const navigate = useNavigate();
    const { language, currency } = useAppContext();
    const t = translations[language];

    const formatRupiah = (price: any) => {
        return formatCurrency(price, currency);
    };
    const handleSelect = () => {
        navigate(`/flight?id=${flight.id}`);
    };
    const formatTime = (isoString: string) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return isoString;
            return date.toLocaleTimeString(language === 'ID' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return isoString;
        }
    };
    const formatDate = (isoString: string) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return '';
        }
    };
    const formatDuration = (minutes: number) => {
        if (!minutes) return '0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}${t.flight_duration_hour_symbol} ${mins}m`;
        }
        return `${mins}m`;
    };
    return (
        <div className={styles.card}>
            <div className={styles.flightHeader}>
                <div className={styles.airlineInfo}>
                    <img src={flight.airline?.logoUrl || '/assets/default-airline.png'} alt={flight.airline?.name} />
                    <span>{flight.airline?.name}</span>
                    <small>{flight.flightCode}</small>
                </div>
                <div className={styles.priceInfo}>
                    <h4>{formatRupiah(flight.startingPrice)}<span>/pax</span></h4>
                </div>
            </div>
            <div className={styles.flightBody}>
                <div className={styles.timeBlock}>
                    <strong>{formatTime(flight.departureTime)}</strong>
                    <span className={styles.date}>{formatDate(flight.departureTime)}</span>
                    <span className={styles.airport}>{flight.originAirport}</span>
                </div>
                <div className={styles.durationBlock}>
                    <span className={styles.duration}>{formatDuration(flight.durationMinutes)}</span>
                    <div className={styles.line}></div>
                    <span className={styles.transit}>{flight.isTransit ? t.flight_transit_1_stop : t.flight_direct}</span>
                </div>
                <div className={styles.timeBlock}>
                    <strong>{formatTime(flight.arrivalTime)}</strong>
                    <span className={styles.date}>{formatDate(flight.arrivalTime)}</span>
                    <span className={styles.airport}>{flight.destinationAirport}</span>
                </div>
                <div className={styles.actionBlock}>
                    <button className={styles.selectBtn} onClick={handleSelect}>
                        {t.card_select_btn}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default FlightCard;