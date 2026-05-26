import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './RecommendationGrids.module.scss';

interface PopularHotel {
    hotelId: string;
    name: string;
    location: string;
    imageUrl: string;
    bookingCount: number;
}

interface Props {
    hotels: PopularHotel[];
}

const getHotelImage = (hotelName: string): string => {
    const name = hotelName.toLowerCase();
    if (name.includes('asrilia') || name.includes('grand')) {
        return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
    }
    if (name.includes('hilton') || name.includes('ritz')) {
        return 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80';
    }
    return 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80';
};

const HotelRecommendationList: React.FC<Props> = ({ hotels }) => {
    const navigate = useNavigate();
    const { language } = useAppContext();
    const t = translations[language];

    if (!hotels || hotels.length === 0) return null;

    const handleCardClick = (hotelId: string) => {
        navigate(`/hotel?id=${hotelId}`);
    };

    return (
        <section className={styles.sectionContainer}>
            <h2 className={styles.sectionTitle}>{t.home_favorite_hotels}</h2>
            <div className={styles.grid}>
                {hotels.map((hotel, idx) => (
                    <div
                        key={idx}
                        className={styles.card}
                        onClick={() => handleCardClick(hotel.hotelId)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className={styles.imageWrapper}>
                            <img src={getHotelImage(hotel.name)} alt={hotel.name} />
                        </div>
                        <div className={styles.cardContent}>
                            <h4>{hotel.name}</h4>
                            <span className={styles.location}>{hotel.location}</span>
                            <p>
                                {t.home_hotel_booked_count.replace('{count}', hotel.bookingCount.toString())}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default HotelRecommendationList;