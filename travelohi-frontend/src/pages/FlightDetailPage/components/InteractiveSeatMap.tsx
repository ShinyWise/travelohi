import React, { useMemo } from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import { formatCurrency } from '../../../utils/currencyFormatter';
import styles from './InteractiveSeatMap.module.scss';
interface FlightSeat {
    id: string;
    seatNumber: string;
    seatClass: string;
    price: number;
    isBooked: boolean;
}
interface Props {
    seats: FlightSeat[];
    selectedSeatId: string | null;
    onSelectSeat: (seat: FlightSeat) => void;
}
const InteractiveSeatMap: React.FC<Props> = ({ seats, selectedSeatId, onSelectSeat }) => {
    const { language, currency } = useAppContext();
    const t = translations[language];
    // group seats by row number (e.g., "12a" -> row 12, letter a)
    const rows = useMemo(() => {
        const grouped = seats.reduce((acc, seat) => {
            const rowMatch = seat.seatNumber.match(/\d+/);
            const row = rowMatch ? parseInt(rowMatch[0], 10) : 0;
            if (!acc[row]) acc[row] = [];
            acc[row].push(seat);
            return acc;
        }, {} as Record<number, FlightSeat[]>);
        return Object.keys(grouped)
            .map(Number)
            .sort((a, b) => a - b)
            .map((rowNum) => ({
                rowNum,
                seats: grouped[rowNum].sort((a, b) => a.seatNumber.localeCompare(b.seatNumber)),
            }));
    }, [seats]);
    return (
        <div className={styles.seatMapContainer}>
            <h3 className={styles.title}>{t.seat_map_title}</h3>
            <div className={styles.legend}>
                <div className={styles.legendItem}><span className={`${styles.box} ${styles.available}`}></span> {t.seat_map_legend_available}</div>
                <div className={styles.legendItem}><span className={`${styles.box} ${styles.booked}`}></span> {t.seat_map_legend_occupied}</div>
                <div className={styles.legendItem}><span className={`${styles.box} ${styles.selected}`}></span> {t.seat_map_legend_selected}</div>
                <div className={styles.legendItem}><span className={`${styles.box} ${styles.business}`}></span> Business Class</div>
            </div>
            <div className={styles.planeBody}>
                <div className={styles.cockpit}>{t.seat_map_front}</div>
                {rows.map((row) => (
                    <div key={row.rowNum} className={styles.row}>
                        <div className={styles.rowNumber}>{row.rowNum}</div>
                        <div className={`${styles.seatsGrid} ${row.seats.length === 2 ? styles.businessRow : ''}`}>
                            {row.seats.map((seat) => {
                                const isSelected = selectedSeatId === seat.id;
                                const isBusiness = seat.seatClass.toLowerCase() === 'business';
                                const stateClass = seat.isBooked
                                    ? styles.seatBooked
                                    : isSelected
                                        ? (isBusiness ? styles.seatSelectedBusiness : styles.seatSelected)
                                        : isBusiness
                                            ? styles.seatBusiness
                                            : styles.seatAvailable;
                                
                                const seatClassList = `${styles.seat} ${isBusiness ? styles.businessSeatWidth : ''} ${stateClass}`;
                                return (
                                    <button
                                        key={seat.id}
                                        className={seatClassList}
                                        disabled={seat.isBooked}
                                        onClick={() => onSelectSeat(seat)}
                                        title={`${seat.seatClass} - ${formatCurrency(seat.price, currency)}`}
                                    >
                                        {seat.seatNumber.replace(/\d+/, '')}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default InteractiveSeatMap;