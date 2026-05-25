import React from 'react';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import styles from './CheckoutActionBanner.module.scss';
interface Props {
    totalPrice: number;
    isReady: boolean;
    onAddToCart: () => void;
    onBuyNow: () => void;
    isLoading: boolean;
}
const CheckoutActionBanner: React.FC<Props> = ({ totalPrice, isReady, onAddToCart, onBuyNow, isLoading }) => {
    const { language } = useAppContext();
    const t = translations[language];
    return (
        <div className={styles.bannerContainer}>
            <div className={styles.content}>
                <div className={styles.priceSection}>
                    <span className={styles.label}>{t.summary_total_price}</span>
                    <h2 className={styles.price}>Rp {totalPrice.toLocaleString('id-ID')}</h2>
                </div>
                <div className={styles.actionSection}>
                    <button
                        className={styles.cartBtn}
                        disabled={!isReady || isLoading}
                        onClick={onAddToCart}
                    >
                        {isLoading ? t.rooms_processing : t.add_to_cart_btn}
                    </button>
                    <button
                        className={styles.buyBtn}
                        disabled={!isReady || isLoading}
                        onClick={onBuyNow}
                    >
                        {t.checkout_pay_now}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default CheckoutActionBanner;