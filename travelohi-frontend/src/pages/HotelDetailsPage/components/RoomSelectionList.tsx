import React from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
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
    onAddToCart: (room: RoomType) => void;
    isProcessingId: string | null;
    cartRoomIds?: string[];
}
const RoomSelectionList: React.FC<Props> = ({ rooms, onAddToCart, isProcessingId, cartRoomIds = [] }) => {
    const { language } = useAppContext();
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
                                <img src={room.imageUrl || '/assets/default-room.jpg'} alt={room.name} />
                            </div>
                            <div className={styles.infoCol}>
                                <h4>{room.name}</h4>
                                <div className={styles.capacity}>
                                    <span className={styles.icon}>👥</span> {t.rooms_max_guests.replace('{count}', room.capacity.toString())}
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
                                    <span className={styles.price}>Rp {Number(room.pricePerNight).toLocaleString('id-ID')}</span>
                                    <span className={styles.suffix}>{t.rooms_per_night}</span>
                                </div>
                                <button
                                    className={`${styles.bookBtn} ${isInCart ? styles.inCart : ''}`}
                                    onClick={() => onAddToCart(room)}
                                    disabled={isInCart || isProcessingId === room.id}
                                >
                                    {isProcessingId === room.id 
                                        ? t.rooms_processing 
                                        : isInCart 
                                            ? t.rooms_in_cart 
                                            : t.rooms_book_btn}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
export default RoomSelectionList;