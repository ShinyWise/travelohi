import React, { useState } from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './PromoCodeInput.module.scss';
interface Props {
    onApply: (code: string) => Promise<void>;
    onRemove: () => void;
    appliedCode: string | null;
    isApplying: boolean;
    error: string | null;
    successMessage: string | null;
}
const PromoCodeInput: React.FC<Props> = ({
    onApply,
    onRemove,
    appliedCode,
    isApplying,
    error,
    successMessage
}) => {
    const { language } = useAppContext();
    const t = translations[language];
    const [inputCode, setInputCode] = useState('');
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputCode.trim()) return;
        await onApply(inputCode.toUpperCase());
        setInputCode('');
    };
    if (appliedCode) {
        return (
            <div className={styles.appliedContainer}>
                <div className={styles.successBadge}>
                    <span className={styles.icon}>✅</span>
                    <div className={styles.details}>
                        <strong>{t.promo_applied}</strong>
                        <span>{appliedCode}</span>
                    </div>
                </div>
                <button className={styles.removeBtn} onClick={onRemove}>{t.promo_remove}</button>
            </div>
        );
    }
    return (
        <div className={styles.promoContainer}>
            <h4>{t.promo_use_title}</h4>
            <form className={styles.inputGroup} onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder={t.promo_placeholder}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    disabled={isApplying}
                />
                <button type="submit" disabled={isApplying || !inputCode.trim()}>
                    {isApplying ? t.promo_checking : t.promo_apply_btn}
                </button>
            </form>
            {error && <p className={styles.errorMessage}>{error}</p>}
            {successMessage && <p className={styles.successMessage}>{successMessage}</p>}
        </div>
    );
};
export default PromoCodeInput;