import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import { formatCurrency } from '../../../utils/currencyFormatter';
import ProgressiveImage from '../../../components/ProgressiveImage';
import { Users } from 'lucide-react';
import styles from './RoomSelectionList.module.scss';
interface RoomType {
    id: string;
    name: string;
    capacity: number;
    pricePerNight: number;
    availableCount: number;
    facilities: string[];
    imageUrl: string;
}
interface Props {
    rooms: RoomType[];
    onAddToCart: (room: RoomType, redirect?: boolean) => void;
    isProcessingId: string | null;
    cartRoomIds?: string[];
}
const RoomSelectionList: React.FC<Props> = ({ rooms, onAddToCart, isProcessingId, cartRoomIds = [] }) => {
    const navigate = useNavigate();
    const { language, currency } = useAppContext();
    const t = translations[language];
    if (!rooms || rooms.length === 0) {
        return (
            <div className={styles.emptyState}>
                {t.rooms_empty_state}
            </div>
        );
    }
    return (
        <div className={styles.roomListContainer}>
            <h3 className={styles.sectionTitle}>{t.rooms_section_title}</h3>
            <div className={styles.list}>
                {rooms.map((room) => {
                    const isInCart = cartRoomIds.includes(room.id);
                    return (
                        <div key={room.id} className={styles.roomCard}>
                            <div className={styles.imageCol}>
                                <ProgressiveImage 
                                    src={room.imageUrl || '/assets/default-room.jpg'} 
                                    alt={room.name} 
                                    wrapperStyle={{ width: '100%', height: '100%', display: 'block' }}
                                />
                            </div>
                            <div className={styles.infoCol}>
                                <h4>{room.name}</h4>
                                <div className={styles.capacity} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span className={styles.icon} style={{ display: 'inline-flex', alignItems: 'center' }}><Users size={16} /></span> 
                                    <span>{t.rooms_max_guests.replace('{count}', room.capacity.toString())}</span>
                                </div>
                                <div className={styles.facilities}>
                                    {room.facilities?.map((fac, idx) => (
                                        <span key={idx} className={styles.pill}>✓ {fac}</span>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.actionCol}>
                                {room.availableCount < 5 && (
                                    <div className={styles.scarcityAlert}>
                                        {t.rooms_left.replace('{count}', room.availableCount.toString())}
                                    </div>
                                )}
                                <div className={styles.priceBlock}>
                                    <span className={styles.price}>{formatCurrency(Number(room.pricePerNight), currency)}</span>
                                    <span className={styles.suffix}>{t.rooms_per_night}</span>
                                </div>
                                <div className={styles.buttonGroup}>
                                    <button
                                        className={`${styles.cartBtn} ${isInCart ? styles.inCart : ''}`}
                                        onClick={() => onAddToCart(room, false)}
                                        disabled={isInCart || isProcessingId === room.id}
                                    >
                                        {isProcessingId === room.id 
                                            ? t.rooms_processing 
                                            : isInCart 
                                                ? t.rooms_in_cart 
                                                : t.add_to_cart_btn || 'Add to Cart'}
                                    </button>
                                    <button
                                        className={styles.buyBtn}
                                        onClick={() => isInCart ? navigate('/cart') : onAddToCart(room, true)}
                                        disabled={!isInCart && isProcessingId === room.id}
                                    >
                                        {isInCart ? (language === 'ID' ? 'Ke Keranjang' : 'Go to Cart') : (t.checkout_pay_now || 'Buy Now')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
export default RoomSelectionList;