import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import { MapPin } from 'lucide-react';
import styles from './ResultCard.module.scss';
import { formatCurrency } from '../utils/currencyFormatter';
import ProgressiveImage from './ProgressiveImage';

interface Props {
    hotel: any;
}
const HotelCard: React.FC<Props> = ({ hotel }) => {
    const navigate = useNavigate();
    const { language, currency } = useAppContext();
    const t = translations[language];

    const formatRupiah = (price: number) => {
        return formatCurrency(price, currency);
    };
    return (
        <div className={styles.card}>
            <div className={styles.hotelGrid}>
                <div className={styles.imageCol}>
                    <ProgressiveImage 
                        src={hotel.pictureUrls?.[0] || '/assets/default-hotel.jpg'} 
                        alt={hotel.name} 
                        wrapperStyle={{ width: '100%', height: '150px', display: 'block' }}
                        skeletonStyle={{ borderRadius: '6px' }}
                    />
                </div>
                <div className={styles.infoCol}>
                    <h3>{hotel.name}</h3>
                    <span className={styles.address} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={16} />
                        <span>{hotel.address}</span>
                    </span>
                    <div className={styles.ratingBlock}>
                        <span className={styles.ratingBadge}>{hotel.ratingAverage?.toFixed(1)}</span>
                        <span className={styles.reviews}>({hotel.totalReviews} {t.hotel_card_reviews})</span>
                    </div>
                    <div className={styles.facilities}>
                        {hotel.facilities?.slice(0, 3).map((fac: string, idx: number) => (
                            <span key={idx} className={styles.pill}>{fac}</span>
                        ))}
                        {hotel.facilities?.length > 3 && <span className={styles.pill}>+{hotel.facilities.length - 3}</span>}
                    </div>
                    {hotel.availability !== undefined && hotel.availability > 0 && (
                        <div className={styles.availability}>
                            {t.hotel_card_availability.replace('{count}', hotel.availability.toString())}
                        </div>
                    )}
                </div>
                <div className={styles.priceCol}>
                    <span className={styles.priceLabel}>{t.hotel_card_starting_from}</span>
                    <h4>{formatRupiah(Number(hotel.startingPrice))}</h4>
                    <span className={styles.priceSuffix}>{t.hotel_card_price_suffix}</span>
                    <button className={styles.selectBtn} onClick={() => navigate(`/hotel?id=${hotel.id}`)}>
                        {t.hotel_card_view_rooms}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default HotelCard;