import React from 'react';
import { type CartItem } from './CartItemCard';
import PromoCodeInput from './PromoCodeInput';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './PriceSummaryPanel.module.scss';
interface Props {
    cartItems: CartItem[];
    discountAmount: number;
    appliedPromo: string | null;
    isApplyingPromo: boolean;
    promoError: string | null;
    promoSuccess: string | null;
    onApplyPromo: (code: string) => Promise<void>;
    onRemovePromo: () => void;
    onCheckout: () => void;
    checkoutDisabled: boolean;
}
const PriceSummaryPanel: React.FC<Props> = ({
    cartItems,
    discountAmount,
    appliedPromo,
    isApplyingPromo,
    promoError,
    promoSuccess,
    onApplyPromo,
    onRemovePromo,
    onCheckout,
    checkoutDisabled
}) => {
    const { language } = useAppContext();
    const t = translations[language];
    const subtotal = cartItems
        .filter(item => item.status !== 'expired')
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // ensure total never drops below 0
    const total = Math.max(0, subtotal - discountAmount);
    return (
        <div className={styles.summaryCard}>
            <h3>{t.summary_title}</h3>
            <PromoCodeInput
                onApply={onApplyPromo}
                onRemove={onRemovePromo}
                appliedCode={appliedPromo}
                isApplying={isApplyingPromo}
                error={promoError}
                successMessage={promoSuccess}
            />
            <div className={styles.summaryList}>
                <div className={styles.summaryItem}>
                    <span className={styles.label}>{t.summary_total_items}</span>
                    <span className={styles.value}>Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                {discountAmount > 0 && (
                    <div className={`${styles.summaryItem} ${styles.discountRow}`}>
                        <span className={styles.label}>{t.summary_total_discount}</span>
                        <span className={styles.value}>- Rp {discountAmount.toLocaleString('id-ID')}</span>
                    </div>
                )}
            </div>
            <hr />
            <div className={styles.totalRow}>
                <span>{t.summary_total_price}</span>
                <span className={styles.totalPrice}>Rp {total.toLocaleString('id-ID')}</span>
            </div>
            <button
                className={styles.checkoutBtn}
                disabled={checkoutDisabled || subtotal === 0}
                onClick={onCheckout}
            >
                {t.summary_proceed_btn}
            </button>
        </div>
    );
};
export default PriceSummaryPanel;