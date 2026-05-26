import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './CheckoutConfirmationModal.module.scss';
interface Props {
    isOpen: boolean;
    transactionId: string;
}
const CheckoutConfirmationModal: React.FC<Props> = ({ isOpen, transactionId }) => {
    const navigate = useNavigate();
    const { language } = useAppContext();
    const t = translations[language];
    if (!isOpen) return null;
    return (
        <div className={styles.overlay}>
            <div className={styles.modalContent}>
                <div className={styles.successIcon}>🎉</div>
                <h2>{t.confirm_modal_title}</h2>
                <p className={styles.subtitle}>{t.confirm_modal_subtitle}</p>
                <div className={styles.transactionBox}>
                    <span>{t.confirm_modal_tx_label}</span>
                    <strong>{transactionId}</strong>
                </div>
                <p className={styles.emailNotice}>
                    {t.confirm_modal_email_notice}
                </p>
                <div className={styles.actions}>
                    <button className={styles.primaryBtn} onClick={() => navigate('/bookings', { replace: true })}>
                        {t.confirm_modal_view_bookings}
                    </button>
                    <button className={styles.secondaryBtn} onClick={() => navigate('/', { replace: true })}>
                        {t.confirm_modal_back_to_home}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default CheckoutConfirmationModal;