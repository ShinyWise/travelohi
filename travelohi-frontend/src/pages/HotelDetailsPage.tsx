import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ImageGallery from '../components/ImageGallery';
import RatingBreakdown from '../components/RatingBreakdown';
import StarRating from '../components/StarRating';
import ReviewList from '../components/ReviewList';
import RoomSelectionList from '../components/RoomSelectionList';
import { HotelServiceClient } from '../proto/travelohi/v1/hotel/hotel.client';
import { CartServiceClient } from '../proto/travelohi/v1/cart/cart.client';
import { transport } from '../utils/grpcClient';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import styles from './HotelDetailsPage.module.scss';
const hotelClient = new HotelServiceClient(transport);
const cartClient = new CartServiceClient(transport);
const HotelDetailsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const hotelId = searchParams.get('id');
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];
    // initialize dates: check-in today, check-out tomorrow
    const getToday = () => new Date().toISOString().split('T')[0];
    const getTomorrow = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    };
    const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || getToday());
    const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || getTomorrow());
    const [hotelData, setHotelData] = useState<any>(null);
    const [rooms, setRooms] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingRoomId, setProcessingRoomId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cartRoomIds, setCartRoomIds] = useState<string[]>([]);
    const fetchCartItems = async () => {
        if (!isAuthenticated) return;
        try {
            const { response } = await cartClient.viewCart({});
            const ids = (response.items || [])
                .filter((item: any) => item.itemType === 'hotel_room')
                .map((item: any) => item.referenceId);
            setCartRoomIds(ids);
        } catch (err) {
            console.error('Failed to fetch cart items:', err);
        }
    };
    useEffect(() => {
        fetchCartItems();
    }, [isAuthenticated]);
    // sync dates to url kalo berubah
    useEffect(() => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('checkIn', checkIn);
        newParams.set('checkOut', checkOut);
        setSearchParams(newParams, { replace: true });
    }, [checkIn, checkOut, setSearchParams]);
    useEffect(() => {
        if (!hotelId) return;
        const fetchHotelDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { response } = await hotelClient.getHotelDetails({
                    hotelId,
                    checkInDate: checkIn,
                    checkOutDate: checkOut
                });
                setHotelData(response.hotel);
                setRooms(response.availableRooms || []);
                setReviews(response.recentReviews || []);
            } catch (err: any) {
                setError(err.message || t.hotel_load_error);
            } finally {
                setIsLoading(false);
            }
        };
        const timer = setTimeout(() => fetchHotelDetails(), 300);
        return () => clearTimeout(timer);
    }, [hotelId, checkIn, checkOut, language]);
    const handleAddToCart = async (room: any) => {
        if (!isAuthenticated) {
            navigate('/login', {
                state: {
                    message: t.hotel_login_required
                }
            });
            return;
        }
        setProcessingRoomId(room.id);
        try {
            const { response } = await cartClient.addToCart({
                itemType: 'hotel_room',
                referenceId: room.id,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                quantity: 1, // default
                luggageWeight: 0,
            });
            if (response.success) {
                alert(t.hotel_add_cart_success);
                fetchCartItems();
            } else {
                setError(response.message || t.hotel_add_cart_fail);
            }
        } catch (err: any) {
            setError(err.message || t.hotel_cart_system_error);
        } finally {
            setProcessingRoomId(null);
        }
    };
    if (isLoading && !hotelData) return <div className={styles.centeredMessage}>{t.hotel_loading}</div>;
    if (error && !hotelData) return <div className={`${styles.centeredMessage} ${styles.error}`}>{error}</div>;
    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <div className={styles.headerTitles}>
                    <h2>{hotelData?.name}</h2>
                    <div className={styles.stars}>
                        <StarRating rating={(hotelData?.ratingAverage || 0) / 2} />
                    </div>
                </div>
                <p className={styles.address}>📍 {hotelData?.address}</p>
            </div>
            {error && <div className={styles.errorBox}>{error}</div>}
            <ImageGallery images={hotelData?.pictureUrls || []} />
            <div className={styles.layoutGrid}>
                <div className={styles.mainContent}>
                    <section className={styles.descriptionSection}>
                        <h3>{t.hotel_about}</h3>
                        <p>{hotelData?.description}</p>
                    </section>
                    <section className={styles.facilitiesSection}>
                        <h3>{t.hotel_main_facilities}</h3>
                        <div className={styles.facilityGrid}>
                            {hotelData?.facilities?.map((fac: string, idx: number) => (
                                <div key={idx} className={styles.facilityItem}>✓ {fac}</div>
                            ))}
                        </div>
                    </section>
                    <section className={styles.ratingSection}>
                        <h3>{t.hotel_reviews}</h3>
                        <RatingBreakdown
                            average={hotelData?.ratingAverage || 0}
                            cleanliness={hotelData?.ratingCleanliness || 0}
                            comfort={hotelData?.ratingComfort || 0}
                            location={hotelData?.ratingLocation || 0}
                            service={hotelData?.ratingService || 0}
                        />
                    </section>
                </div>
                <div className={styles.sidebar}>
                    <div className={styles.datePickerCard}>
                        <h3>{t.hotel_search_rooms}</h3>
                        <div className={styles.inputGroup}>
                            <label>{t.hotel_check_in}</label>
                            <input
                                type="date"
                                value={checkIn}
                                min={getToday()}
                                onChange={(e) => {
                                    setCheckIn(e.target.value);
                                    if (e.target.value >= checkOut) {
                                        const next = new Date(e.target.value);
                                        next.setDate(next.getDate() + 1);
                                        setCheckOut(next.toISOString().split('T')[0]);
                                    }
                                }}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>{t.hotel_check_out}</label>
                            <input
                                type="date"
                                value={checkOut}
                                min={checkIn}
                                onChange={(e) => setCheckOut(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* renders conditionally based on dates */}
            <RoomSelectionList
                rooms={rooms}
                onAddToCart={handleAddToCart}
                isProcessingId={processingRoomId}
                cartRoomIds={cartRoomIds}
            />
            <ReviewList reviews={reviews} />
        </div>
    );
};
export default HotelDetailsPage;