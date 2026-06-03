import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import ProgressiveImage from '../../../components/ProgressiveImage';
import { getDisplayAirportName } from '../../../utils/airportMapper';
import styles from './RecommendationGrids.module.scss';

interface PopularDestination {
    destinationAirport: string;
    imageUrl: string;
    bookingCount: number;
}

interface Props {
    destinations: PopularDestination[];
}

const getFlightImage = (airportName: string): string => {
    const name = airportName.toLowerCase();
    if (name.includes('bali') || name.includes('dps')) return '/assets/destinations/bali.jpg';
    if (name.includes('medan') || name.includes('kno')) return '/assets/destinations/medan.jpg';
    if (name.includes('palembang') || name.includes('plm')) return '/assets/destinations/palembang.jpg';
    if (name.includes('makassar') || name.includes('upg')) return '/assets/destinations/makassar.jpg';
    if (name.includes('lombok') || name.includes('lop')) return '/assets/destinations/lombok.jpg';
    if (name.includes('jakarta') || name.includes('cgk')) return '/assets/destinations/jakarta.jpg';
    if (name.includes('bandung') || name.includes('bdo')) return '/assets/destinations/bandung.jpg';
    if (name.includes('surabaya') || name.includes('sub')) return '/assets/destinations/surabaya.jpg';
    if (name.includes('yogyakarta') || name.includes('yia')) return '/assets/destinations/yogyakarta.jpg';

    return '/assets/destinations/generic.jpg';
};

const FlightRecommendationList: React.FC<Props> = ({ destinations }) => {
    const navigate = useNavigate();
    const { language } = useAppContext();
    const t = translations[language];

    if (!destinations || destinations.length === 0) return null;

    const handleCardClick = (airportName: string) => {
        const friendlyName = getDisplayAirportName(airportName);
        navigate(`/search?type=flight&q=${encodeURIComponent(friendlyName)}`);
    };

    return (
        <section className={styles.sectionContainer}>
            <h2 className={styles.sectionTitle}>{t.home_popular_flights}</h2>
            <div className={styles.grid}>
                {destinations.map((dest, idx) => (
                    <div
                        key={idx}
                        className={styles.card}
                        onClick={() => handleCardClick(dest.destinationAirport)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className={styles.imageWrapper}>
                            <ProgressiveImage
                                src={dest.imageUrl || getFlightImage(dest.destinationAirport)}
                                alt={dest.destinationAirport}
                                wrapperStyle={{ width: '100%', height: '100%', display: 'block' }}
                            />
                        </div>
                        <div className={styles.cardContent}>
                            <h4>{getDisplayAirportName(dest.destinationAirport)}</h4>
                            <p>
                                {t.home_flight_booked_count.replace('{count}', dest.bookingCount.toString())}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FlightRecommendationList;