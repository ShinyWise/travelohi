import React, { useEffect, useState } from 'react';
import PromoSlider from './components/PromoSlider';
import FlightRecommendationList from './components/FlightRecommendationList';
import HotelRecommendationList from './components/HotelRecommendationList';
import { TelemetryServiceClient } from '../../proto/travelohi/v1/telemetry/telemetry.client';
import { transport } from '../../utils/grpcClient';
import { useAppContext } from '../../context/ThemeContext';
import { translations } from '../../utils/translations';
import { CreditCard, RefreshCw, Headphones } from 'lucide-react';
import styles from './HomePage.module.scss';
const telemetryClient = new TelemetryServiceClient(transport);
const HomePage: React.FC = () => {
    const { language } = useAppContext();
    const t = translations[language];
    const [popularFlights, setPopularFlights] = useState<any[]>([]);
    const [popularHotels, setPopularHotels] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                // run both grpc calls in parallel for better performance
                const [flightsRes, hotelsRes] = await Promise.all([
                    telemetryClient.getPopularFlightDestinations({}),
                    telemetryClient.getPopularHotels({})
                ]);
                setPopularFlights(flightsRes.response.destinations || []);
                setPopularHotels(hotelsRes.response.hotels || []);
            } catch (error) {
                console.error("Failed to fetch telemetry data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRecommendations();
    }, []);
    return (
        <div className={styles.homeContainer}>
            <PromoSlider />
            {isLoading ? (
                <div className={styles.loadingState}>{t.loading_recommendations}</div>
            ) : (
                <>
                    <FlightRecommendationList destinations={popularFlights} />
                    <HotelRecommendationList hotels={popularHotels} />
                </>
            )}

            <section className={styles.whyUsSection}>
                <h2>{t.why_choose_us}</h2>
                <div className={styles.featuresGrid}>
                    <div className={styles.featureCard}>
                        <span className={styles.featureIcon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={28} />
                        </span>
                        <h3>{t.best_price_title}</h3>
                        <p>{t.best_price_desc}</p>
                    </div>
                    <div className={styles.featureCard}>
                        <span className={styles.featureIcon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw size={28} />
                        </span>
                        <h3>{t.easy_reschedule_title}</h3>
                        <p>{t.easy_reschedule_desc}</p>
                    </div>
                    <div className={styles.featureCard}>
                        <span className={styles.featureIcon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Headphones size={28} />
                        </span>
                        <h3>{t.support_title}</h3>
                        <p>{t.support_desc}</p>
                    </div>
                </div>
            </section>
        </div>
    );
};
export default HomePage;