import React from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './ItineraryCard.module.scss';

export interface BookingItem {
    bookingId: string;
    transactionId: string;
    itemType: string;
    displayName: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    bookingReferenceCode: string;
    hotelId: string;
}

interface Props {
    booking: BookingItem;
    onViewTicket: (bookingId: string) => void;
}

const ItineraryCard: React.FC<Props> = ({ booking, onViewTicket }) => {
    const { language } = useAppContext();
    const t = translations[language];

    const isHotel = booking.itemType === 'hotel_room';

    return (
        <div className={styles.card}>
            <div className={styles.imageBox}>
                <img
                    src={isHotel ? '/assets/default-hotel.jpg' : '/assets/default-flight.jpg'}
                    alt={booking.displayName}
                    onError={(e) => {
                        e.currentTarget.src = isHotel
                            ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%23666">🏨 Hotel</text></svg>'
                            : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%23666">✈️ Flight</text></svg>';
                    }}
                />
            </div>

            <div className={styles.infoBox}>
                <div className={styles.header}>
                    <span className={styles.typeBadge}>
                        {isHotel ? t.profile_booking_hotel : t.profile_booking_flight}
                    </span>
                    <span className={styles.statusBadge}>
                        {booking.status === 'completed'
                            ? (language === 'ID' ? 'Selesai' : 'Completed')
                            : booking.status === 'cancelled'
                            ? (language === 'ID' ? 'Dibatalkan' : 'Cancelled')
                            : t.profile_status_active}
                    </span>
                </div>

                <h4>{booking.displayName.split('|')[0]}</h4>
                <p className={styles.subtitle}>
                    {t.profile_booking_code}: <strong>{booking.bookingReferenceCode}</strong>
                </p>
                <span className={styles.date}>
                    📅 {booking.checkInDate} - {booking.checkOutDate}
                </span>
            </div>

            <div className={styles.actionBox}>
                <button className={styles.ticketBtn} onClick={() => onViewTicket(booking.bookingId)}>
                    {t.profile_view_eticket}
                </button>
            </div>
        </div>
    );
};

export default ItineraryCard;