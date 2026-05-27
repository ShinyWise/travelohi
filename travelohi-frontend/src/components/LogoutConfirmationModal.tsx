import React from 'react';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import { AlertTriangle } from 'lucide-react';
import styles from './LogoutConfirmationModal.module.scss';

interface LogoutConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { language } = useAppContext();
    const t = translations[language];

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.warningIcon} style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px', color: '#eab308' }}>
                    <AlertTriangle size={48} />
                </div>
                <h2>{t.logout_confirm_title}</h2>
                <p className={styles.subtitle}>{t.logout_confirm_message}</p>
                <div className={styles.actions}>
                    <button className={styles.primaryBtn} onClick={onConfirm}>
                        {t.logout_confirm_yes}
                    </button>
                    <button className={styles.secondaryBtn} onClick={onClose}>
                        {t.cancel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutConfirmationModal;
