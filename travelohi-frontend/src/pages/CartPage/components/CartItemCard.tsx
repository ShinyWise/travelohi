import React from 'react';
import { Calendar, Plane } from 'lucide-react';
import ProgressiveImage from '../../../components/ProgressiveImage';
import { useAppContext } from '../../../context/ThemeContext';
import { formatFlightTimeline } from '../../../utils/dateUtils';
import styles from './CartItemCard.module.scss';
export interface CartItem {
    id: string;
    itemType: 'flight_seat' | 'hotel_room';
    title: string;
    subtitle: string;
    imageUrl: string;
    price: number;
    quantity: number;
    checkInDate: string;
    checkOutDate: string;
    status: 'ongoing' | 'expired' | 'in_cart';
}
interface Props {
    item: CartItem;
    onRemove: (id: string) => void;
    onEditDates: (item: CartItem) => void;
}
const CartItemCard: React.FC<Props> = ({ item, onRemove, onEditDates }) => {
    const { language } = useAppContext();
    const isHotel = item.itemType === 'hotel_room';
    const isExpired = item.status === 'expired';
    const isValidFlightLogo = !isHotel && item.imageUrl && item.imageUrl !== 'data:image/jpeg;base64,';

    const renderDateInfo = () => {
        if (isHotel) {
            return (
                <div className={styles.dateInfo}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        <span>{item.checkInDate} s/d {item.checkOutDate}</span>
                    </span>
                </div>
            );
        }

        const timeline = formatFlightTimeline(item.checkInDate, item.checkOutDate, language);
        return (
            <div className={styles.flightDateInfo}>
                <div className={styles.flightDateLabel}>
                    <Plane size={14} />
                    <span>{timeline.dateLabel}</span>
                </div>
                <div className={styles.flightTimeRange}>
                    {timeline.timeRange}
                </div>
            </div>
        );
    };

    return (
        <div className={`${styles.card} ${isExpired ? styles.expiredCard : ''}`}>
            <div className={styles.imageCol}>
                {isHotel || isValidFlightLogo ? (
                    <ProgressiveImage
                        src={isHotel ? (item.imageUrl || '/assets/default-hotel.jpg') : item.imageUrl}
                        alt={item.title}
                        wrapperStyle={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            backgroundColor: isHotel ? 'transparent' : '#ffffff'
                        }}
                        style={{ objectFit: isHotel ? 'cover' : 'contain', padding: isHotel ? '0' : '10px' }}
                    />
                ) : (
                    <div className={styles.flightIconWrapper}>
                        <Plane size={40} color="var(--accent-color)" />
                    </div>
                )}
            </div>
            <div className={styles.infoCol}>
                <div className={styles.headerRow}>
                    <h4>{item.title}</h4>
                    <span className={`${styles.badge} ${isExpired ? styles.badgeExpired : styles.badgeOngoing}`}>
                        {isExpired ? 'Waktu Habis (Expired)' : 'Tersedia'}
                    </span>
                </div>
                <p className={styles.subtitle}>{item.subtitle}</p>
                {renderDateInfo()}
                <div className={styles.actions}>
                    <button className={styles.removeBtn} onClick={() => onRemove(item.id)}>Hapus</button>
                    {isHotel && (
                        <>
                            <span className={styles.separator}>|</span>
                            <button className={styles.editBtn} onClick={() => onEditDates(item)}>Ubah Tanggal</button>
                        </>
                    )}
                </div>
            </div>
            <div className={styles.priceCol}>
                <span className={styles.price}>Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                {item.quantity > 1 && <span className={styles.qty}>({item.quantity}x)</span>}
            </div>
        </div>
    );
};
export default CartItemCard;