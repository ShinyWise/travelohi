import React from 'react';
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
    const isHotel = item.itemType === 'hotel_room';
    const isExpired = item.status === 'expired';
    return (
        <div className={`${styles.card} ${isExpired ? styles.expiredCard : ''}`}>
            <div className={styles.imageCol}>
                <img src={item.imageUrl || (isHotel ? '/assets/default-hotel.jpg' : '/assets/default-flight.jpg')} alt={item.title} />
            </div>
            <div className={styles.infoCol}>
                <div className={styles.headerRow}>
                    <h4>{item.title}</h4>
                    <span className={`${styles.badge} ${isExpired ? styles.badgeExpired : styles.badgeOngoing}`}>
                        {isExpired ? 'Waktu Habis (Expired)' : 'Tersedia'}
                    </span>
                </div>
                <p className={styles.subtitle}>{item.subtitle}</p>
                <div className={styles.dateInfo}>
                    {isHotel ? (
                        <span>📅 {item.checkInDate} s/d {item.checkOutDate}</span>
                    ) : (
                        <span>🛫 {item.checkInDate} (Kedatangan: {item.checkOutDate})</span>
                    )}
                </div>
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