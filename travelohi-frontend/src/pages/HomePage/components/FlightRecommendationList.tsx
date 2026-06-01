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
    if (name.includes('bali') || name.includes('dps')) {
        return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80';
    }
    if (name.includes('singapore') || name.includes('sin')) {
        return 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=600&q=80';
    }
    if (name.includes('tokyo') || name.includes('hnd') || name.includes('nrt')) {
        return 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=600&q=80';
    }
    return 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80';
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
                                src={getFlightImage(dest.destinationAirport)} 
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