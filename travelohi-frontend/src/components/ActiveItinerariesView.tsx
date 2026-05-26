import React, { useEffect, useState, useMemo } from 'react';
import ItineraryCard, { type BookingItem } from './ItineraryCard';
import ETicketModal from './ETicketModal';
import { AccountServiceClient } from '../proto/travelohi/v1/account/account.client';
import { transport } from '../utils/grpcClient';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import styles from './ActiveItinerariesView.module.scss';

const accountClient = new AccountServiceClient(transport);

interface Props {
    searchQuery: string;
    itemTypeFilter: 'all' | 'flight' | 'hotel';
}

const ActiveItinerariesView: React.FC<Props> = ({ searchQuery, itemTypeFilter }) => {
    const { userId } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];

    const [bookings, setBookings] = useState<BookingItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;

        const fetchActiveBookings = async () => {
            try {
                const { response } = await accountClient.getBookingHistory({
                    userId,
                    filterStatus: 'ongoing',
                    limit: 100,
                    offset: 0
                });
                setBookings(response.bookings as BookingItem[] || []);
            } catch (err: any) {
                setError(err.message || t.tickets_error_load);
            } finally {
                setIsLoading(false);
            }
        };

        fetchActiveBookings();
    }, [userId, t.tickets_error_load]);

    const filteredBookings = useMemo(() => {
        const lowerQuery = searchQuery.toLowerCase().trim();
        const nowStr = new Date().toISOString().split('T')[0];

        return bookings.filter(item => {
            const matchesType =
                itemTypeFilter === 'all' ||
                (itemTypeFilter === 'hotel' && item.itemType === 'hotel_room') ||
                (itemTypeFilter === 'flight' && item.itemType === 'flight_seat');

            if (!matchesType) return false;

            // Date validation controls
            if (item.itemType === 'hotel_room') {
                if (item.checkOutDate && item.checkOutDate < nowStr) {
                    return false;
                }
            } else if (item.itemType === 'flight_seat') {
                if (item.checkInDate && item.checkInDate < nowStr) {
                    return false;
                }
            }

            return (
                item.displayName.toLowerCase().includes(lowerQuery) ||
                item.bookingReferenceCode.toLowerCase().includes(lowerQuery)
            );
        });
    }, [bookings, searchQuery, itemTypeFilter]);

    if (isLoading) {
        return <div className={styles.centeredState}>{t.tickets_loading_itinerary}</div>;
    }

    if (error) {
        return <div className={styles.errorBox}>{error}</div>;
    }

    if (filteredBookings.length === 0) {
        return (
            <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🧳</span>
                <h3>{t.tickets_empty_active}</h3>
                <p>{t.tickets_empty_desc}</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.listContainer}>
                {filteredBookings.map(booking => (
                    <ItineraryCard
                        key={booking.bookingId}
                        booking={booking}
                        onViewTicket={(id) => setSelectedBookingId(id)}
                    />
                ))}
            </div>

            <ETicketModal
                isOpen={!!selectedBookingId}
                onClose={() => setSelectedBookingId(null)}
                bookingId={selectedBookingId}
            />
        </div>
    );
};

export default ActiveItinerariesView;
