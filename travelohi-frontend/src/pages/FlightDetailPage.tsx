import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import InteractiveSeatMap from '../components/InteractiveSeatMap';
import LuggageSelector from '../components/LuggageSelector';
import CheckoutActionBanner from '../components/CheckoutActionBanner';
import { FlightServiceClient } from '../proto/travelohi/v1/flight/flight.client';
import { CartServiceClient } from '../proto/travelohi/v1/cart/cart.client';
import { transport } from '../utils/grpcClient';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import styles from './FlightDetailPage.module.scss';
const flightClient = new FlightServiceClient(transport);
const cartClient = new CartServiceClient(transport);
const FlightDetailsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const flightId = searchParams.get('id');
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];
    const [flightData, setFlightData] = useState<any>(null);
    const [seats, setSeats] = useState<any[]>([]);
    const [baggageOptions, setBaggageOptions] = useState<any[]>([]);
    const [selectedSeat, setSelectedSeat] = useState<any>(null);
    const [selectedLuggage, setSelectedLuggage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (!flightId) return;
        const fetchDetails = async () => {
            try {
                const { response } = await flightClient.getFlightDetails({ flightId });
                setFlightData(response.flight);
                setSeats(response.seats || []);
                setBaggageOptions(response.baggageOptions || []);
            } catch (err: any) {
                setError(err.message || t.flight_load_error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetails();
    }, [flightId, language]);
    const totalPrice = Number(selectedSeat?.price || flightData?.startingPrice || 0) + Number(selectedLuggage?.price || 0);
    const handleAddToCart = async (redirect: boolean = false) => {
        if (!isAuthenticated) {
            navigate('/login', {
                state: {
                    message: t.flight_login_required
                }
            });
            return;
        }
        if (!selectedSeat) return;
        setIsProcessing(true);
        try {
            const { response } = await cartClient.addToCart({
                itemType: 'flight_seat',
                referenceId: selectedSeat.id,
                checkInDate: flightData.departureTime,
                checkOutDate: flightData.arrivalTime,
                quantity: 1,
                luggageWeight: selectedLuggage?.weightKg || 0,
            });
            if (response.success) {
                if (redirect) navigate('/cart');
                else alert(t.flight_add_cart_success);
            } else {
                setError(response.message || t.flight_add_cart_fail);
            }
        } catch (err: any) {
            setError(err.message || t.flight_cart_system_error);
        } finally {
            setIsProcessing(false);
        }
    };
    if (isLoading) return <div className={styles.loadingWrapper}>{t.flight_loading}</div>;
    if (error && !flightData) return <div className={styles.errorWrapper}>{error}</div>;
    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerBanner}>
                <div className={styles.flightSummary}>
                    <h2>{t.flight_detail_title.replace('{destination}', flightData?.destinationAirport || '')}</h2>
                    <p>{flightData?.originAirport} ➔ {flightData?.destinationAirport} | {t.flight_duration_minutes.replace('{minutes}', flightData?.durationMinutes?.toString() || '')}</p>
                </div>
            </div>
            {error && <div className={styles.errorBox}>{error}</div>}
            <div className={styles.contentLayout}>
                <div className={styles.mainCol}>
                    <InteractiveSeatMap
                        seats={seats}
                        selectedSeatId={selectedSeat?.id || null}
                        onSelectSeat={setSelectedSeat}
                    />
                    <LuggageSelector
                        options={baggageOptions}
                        selectedLuggageId={selectedLuggage?.id || null}
                        onSelectLuggage={setSelectedLuggage}
                    />
                </div>
                <aside className={styles.sideCol}>
                    <div className={styles.summaryCard}>
                        <h3>{t.flight_detail_summary}</h3>
                        <div className={styles.summaryItem}>
                            <span>{t.flight_base_fare}</span>
                            <span>Rp {Number(flightData?.startingPrice || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span>{t.flight_seat_choice} ({selectedSeat ? selectedSeat.seatNumber : '-'})</span>
                            <span>Rp {selectedSeat ? Number(selectedSeat.price - flightData.startingPrice).toLocaleString('id-ID') : 0}</span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span>{t.flight_extra_baggage} ({selectedLuggage ? `${selectedLuggage.weightKg}kg` : '-'})</span>
                            <span>Rp {selectedLuggage ? Number(selectedLuggage.price).toLocaleString('id-ID') : 0}</span>
                        </div>
                        <hr />
                        <div className={`${styles.summaryItem} ${styles.total}`}>
                            <span>{t.flight_total}</span>
                            <span>Rp {totalPrice.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </aside>
            </div>
            <CheckoutActionBanner
                totalPrice={totalPrice}
                isReady={!!selectedSeat}
                onAddToCart={() => handleAddToCart(false)}
                onBuyNow={() => handleAddToCart(true)}
                isLoading={isProcessing}
            />
        </div>
    );
};
export default FlightDetailsPage;