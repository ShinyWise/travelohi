import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import styles from './UpdateDateModal.module.scss';
interface Props {
    isOpen: boolean;
    onClose: () => void;
    itemId: string | null;
    currentCheckIn: string;
    currentCheckOut: string;
    onUpdate: (itemId: string, checkIn: string, checkOut: string) => Promise<void>;
}
const UpdateDateModal: React.FC<Props> = ({ isOpen, onClose, itemId, currentCheckIn, currentCheckOut, onUpdate }) => {
    const { language } = useAppContext();
    const t = translations[language];
    const [checkIn, setCheckIn] = useState(currentCheckIn);
    const [checkOut, setCheckOut] = useState(currentCheckOut);
    const [isUpdating, setIsUpdating] = useState(false);
    // reset local state when modal opens with new props
    useEffect(() => {
        if (isOpen) {
            setCheckIn(currentCheckIn);
            setCheckOut(currentCheckOut);
        }
    }, [isOpen, currentCheckIn, currentCheckOut]);
    if (!isOpen || !itemId) return null;
    const getToday = () => new Date().toISOString().split('T')[0];
    const handleSave = async () => {
        setIsUpdating(true);
        try {
            await onUpdate(itemId, checkIn, checkOut);
            onClose();
        } catch (error) {
            alert(t.modal_date_error);
        } finally {
            setIsUpdating(false);
        }
    };
    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3>{t.modal_date_title}</h3>
                <div className={styles.inputGroup}>
                    <label>Check-In</label>
                    <input
                        type="date"
                        value={checkIn}
                        min={getToday()}
                        onChange={(e) => {
                            setCheckIn(e.target.value);
                            if (e.target.value >= checkOut) {
                                const next = new Date(e.target.value);
                                next.setDate(next.getDate() + 1);
                                setCheckOut(next.toISOString().split('T')[0]);
                            }
                        }}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label>Check-Out</label>
                    <input
                        type="date"
                        value={checkOut}
                        min={checkIn}
                        onChange={(e) => setCheckOut(e.target.value)}
                    />
                </div>
                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onClose} disabled={isUpdating}>{t.cancel}</button>
                    <button className={styles.saveBtn} onClick={handleSave} disabled={isUpdating}>
                        {isUpdating ? t.profile_saving : t.profile_save_changes}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default UpdateDateModal;