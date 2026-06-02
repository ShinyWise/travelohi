import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import InteractiveSeatMap from './components/InteractiveSeatMap';
import LuggageSelector from './components/LuggageSelector';
import CheckoutActionBanner from './components/CheckoutActionBanner';
import { FlightServiceClient } from '../../proto/travelohi/v1/flight/flight.client';
import { CartServiceClient } from '../../proto/travelohi/v1/cart/cart.client';
import { transport } from '../../utils/grpcClient';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/ThemeContext';
import { translations } from '../../utils/translations';
import { formatCurrency } from '../../utils/currencyFormatter';
import { useToast } from '../../components/Toast';
import styles from './FlightDetailPage.module.scss';
const flightClient = new FlightServiceClient(transport);
const cartClient = new CartServiceClient(transport);
const FlightDetailsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const flightId = searchParams.get('id');
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { language, currency } = useAppContext();
    const t = translations[language];
    const { showToast } = useToast();
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
                else showToast(t.flight_add_cart_success, 'success');
            } else {
                setError(response.message || t.flight_add_cart_fail);
            }
        } catch (err: any) {
            setError(err.message || t.flight_cart_system_error);
        } finally {
            setIsProcessing(false);
        }
    };
    if (isLoading) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.headerBannerSkeleton} />
                <div className={styles.contentLayout}>
                    <div className={styles.mainCol}>
                        <div className={styles.seatMapSkeleton} />
                        <div className={styles.luggageSkeleton} />
                    </div>
                    <aside className={styles.sideCol}>
                        <div className={styles.summaryCardSkeleton} />
                    </aside>
                </div>
            </div>
        );
    }
    if (error && !flightData) return <div className={styles.errorWrapper}>{error}</div>;
    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerBanner}>
                <div className={styles.flightSummary}>
                    <h2>{t.flight_detail_title.replace('{destination}', flightData?.destinationAirport || '')}</h2>
                    <div className={styles.flightMeta}>
                        <div className={styles.flightMetaItem}>
                            <span className={styles.flightMetaLabel}>{t.flight_airline}</span>
                            <span className={styles.flightMetaValue}>{flightData?.airline?.name || '—'}</span>
                        </div>
                        <div className={styles.flightMetaItem}>
                            <span className={styles.flightMetaLabel}>{t.flight_aircraft}</span>
                            <span className={styles.flightMetaValue}>{flightData?.flightCode || '—'}</span>
                        </div>
                        <div className={styles.flightMetaItem}>
                            <span className={styles.flightMetaLabel}>{t.flight_departure}</span>
                            <span className={styles.flightMetaValue}>
                                {flightData?.departureTime
                                    ? new Date(flightData.departureTime).toLocaleString(language === 'ID' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })
                                    : '—'}
                            </span>
                        </div>
                        <div className={styles.flightMetaItem}>
                            <span className={styles.flightMetaLabel}>{t.flight_arrival}</span>
                            <span className={styles.flightMetaValue}>
                                {flightData?.arrivalTime
                                    ? new Date(flightData.arrivalTime).toLocaleString(language === 'ID' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })
                                    : '—'}
                            </span>
                        </div>
                    </div>
                    <p className={styles.flightRoute}>
                        {flightData?.originAirport} ➔ {flightData?.destinationAirport}
                        <span className={styles.flightDuration}>
                            &nbsp;·&nbsp;{t.flight_duration_minutes.replace('{minutes}', flightData?.durationMinutes?.toString() || '')}
                        </span>
                    </p>
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
                            <span>{formatCurrency(Number(flightData?.startingPrice || 0), currency)}</span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span>{t.flight_seat_choice} ({selectedSeat ? selectedSeat.seatNumber : '-'})</span>
                            <span>{selectedSeat ? formatCurrency(Number(selectedSeat.price - flightData.startingPrice), currency) : formatCurrency(0, currency)}</span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span>{t.flight_extra_baggage} ({selectedLuggage ? `${selectedLuggage.weightKg}kg` : '-'})</span>
                            <span>{selectedLuggage ? formatCurrency(Number(selectedLuggage.price), currency) : formatCurrency(0, currency)}</span>
                        </div>
                        <hr />
                        <div className={`${styles.summaryItem} ${styles.total}`}>
                            <span>{t.flight_total}</span>
                            <span>{formatCurrency(totalPrice, currency)}</span>
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