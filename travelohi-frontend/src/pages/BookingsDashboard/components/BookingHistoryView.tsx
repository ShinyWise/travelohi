import React, { useEffect, useState, useCallback, useMemo } from 'react';
import ExpiredItineraryCard from './ItineraryCardExpired';
import ScrollObserverTrigger from '../../../components/ScrollObserverTrigger';
import ReviewSubmissionModal from '../../HotelDetailsPage/components/ReviewSubmissionModal';
import { AccountServiceClient } from '../../../proto/travelohi/v1/account/account.client';
import { BookingItem } from '../../../proto/travelohi/v1/account/account';
import { transport } from '../../../utils/grpcClient';
import { useAuth } from '../../../context/AuthContext';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import { History } from 'lucide-react';
import styles from './BookingHistoryView.module.scss';

const accountClient = new AccountServiceClient(transport);
const LIMIT = 10;

interface Props {
    searchQuery: string;
    itemTypeFilter: 'all' | 'flight' | 'hotel';
}

const BookingHistoryView: React.FC<Props> = ({ searchQuery, itemTypeFilter }) => {
    const { userId } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];

    // data states
    const [rawHistoryItems, setRawHistoryItems] = useState<BookingItem[]>([]);

    // infinite scroll states
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // rev modal state
    const [reviewModalData, setReviewModalData] = useState<{ id: string; hotelId: string; title: string } | null>(null);

    const fetchHistory = useCallback(async (currentOffset: number, isReset: boolean) => {
        if (!userId) return;

        setIsLoading(true);
        setError(null);

        try {
            const { response } = await accountClient.getBookingHistory({
                userId,
                filterStatus: 'past',
                limit: LIMIT,
                offset: currentOffset,
            });

            const newItems = response.bookings || [];

            setRawHistoryItems(prev => isReset ? newItems : [...prev, ...newItems]);
            setHasMore(newItems.length === LIMIT);
        } catch (err: any) {
            setError(err.message || t.tickets_error_history);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [userId, t.tickets_error_history]);

    // init
    useEffect(() => {
        if (userId) {
            setRawHistoryItems([]);
            setOffset(0);
            setHasMore(true);
            fetchHistory(0, true);
        }
    }, [userId, fetchHistory]);

    const handleLoadMore = () => {
        if (isLoading || !hasMore) return;
        const nextOffset = offset + LIMIT;
        setOffset(nextOffset);
        fetchHistory(nextOffset, false);
    };

    const handleReviewSuccess = () => {
        if (!reviewModalData) return;

        setRawHistoryItems(prev => prev.map(item =>
            item.bookingId === reviewModalData.id ? { ...item, status: 'reviewed' } : item
        ));
    };

    // filter and format
    const filteredHistoryItems = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const nowStr = new Date().toISOString().split('T')[0];

        return rawHistoryItems
            .map(b => ({
                id: b.bookingId,
                hotelId: b.hotelId,
                type: b.itemType === 'hotel_room' ? 'hotel' as const : 'flight' as const,
                title: b.displayName.split('|')[0],
                subtitle: `${t.profile_booking_code}: ${b.bookingReferenceCode}`,
                dateString: `${b.checkInDate} - ${b.checkOutDate}`,
                hasReviewed: b.status === 'reviewed',
                checkInDate: b.checkInDate,
                checkOutDate: b.checkOutDate,
                itemType: b.itemType,
            }))
            .filter(item => {
                const matchesType = itemTypeFilter === 'all' || item.type === itemTypeFilter;
                if (!matchesType) return false;

                // Date validation controls
                if (item.itemType === 'hotel_room') {
                    if (item.checkOutDate && item.checkOutDate >= nowStr) {
                        return false;
                    }
                } else if (item.itemType === 'flight_seat') {
                    if (item.checkInDate && item.checkInDate >= nowStr) {
                        return false;
                    }
                }

                const matchesQuery = !query ||
                    item.title.toLowerCase().includes(query) ||
                    item.subtitle.toLowerCase().includes(query);
                return matchesQuery;
            });
    }, [rawHistoryItems, searchQuery, itemTypeFilter, t.profile_booking_code]);

    return (
        <div className={styles.container}>
            {error && <div className={styles.errorBox}>{error}</div>}

            <div className={styles.listContainer}>
                {filteredHistoryItems.length === 0 && !isLoading && !error ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon} style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
                            <History size={48} />
                        </span>
                        <h3>{t.tickets_empty_history}</h3>
                        <p>{t.tickets_empty_history_desc}</p>
                    </div>
                ) : (
                    filteredHistoryItems.map(item => (
                        <ExpiredItineraryCard
                            key={item.id}
                            item={item}
                            onLeaveReview={(clickedItem) => setReviewModalData({
                                id: clickedItem.id,
                                hotelId: clickedItem.hotelId || '',
                                title: clickedItem.title
                            })}
                        />
                    ))
                )}
            </div>

            {rawHistoryItems.length > 0 && (
                <ScrollObserverTrigger
                    onLoadMore={handleLoadMore}
                    isLoading={isLoading}
                    hasMore={hasMore}
                />
            )}

            {reviewModalData && (
                <ReviewSubmissionModal
                    isOpen={!!reviewModalData}
                    onClose={() => setReviewModalData(null)}
                    hotelId={reviewModalData.hotelId}
                    bookingId={reviewModalData.id}
                    hotelName={reviewModalData.title}
                    onSuccess={handleReviewSuccess}
                />
            )}
        </div>
    );
};

export default BookingHistoryView;
