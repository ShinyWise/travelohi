import React from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import { Wallet, CreditCard } from 'lucide-react';
import styles from './PaymentMethodSelector.module.scss';
export type PaymentMethod = 'hi_wallet' | 'credit_card' | null;
interface CreditCard {
    id: string;
    lastFour: string;
    type: string;
}
interface Props {
    walletBalance: number;
    totalAmount: number;
    creditCards: CreditCard[];
    selectedMethod: PaymentMethod;
    selectedCardId: string | null;
    onSelectMethod: (method: PaymentMethod) => void;
    onSelectCard: (cardId: string) => void;
}
const PaymentMethodSelector: React.FC<Props> = ({
    walletBalance,
    totalAmount,
    creditCards,
    selectedMethod,
    selectedCardId,
    onSelectMethod,
    onSelectCard
}) => {
    const { language } = useAppContext();
    const t = translations[language];
    const isWalletSufficient = walletBalance >= totalAmount;
    return (
        <div className={styles.container}>
            <h3 className={styles.title}>{t.payment_method_title}</h3>
            {/* hi-wallet option */}
            <div
                className={`${styles.methodCard} ${selectedMethod === 'hi_wallet' ? styles.active : ''} ${!isWalletSufficient ? styles.disabled : ''}`}
                onClick={() => isWalletSufficient && onSelectMethod('hi_wallet')}
            >
                <div className={styles.methodHeader}>
                    <div className={styles.methodName} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span className={styles.icon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wallet size={18} />
                        </span>
                        <strong>HI-Wallet</strong>
                    </div>
                    <div className={styles.radioCircle}>
                        {selectedMethod === 'hi_wallet' && <div className={styles.innerCircle} />}
                    </div>
                </div>
                <div className={styles.methodDetails}>
                    <span>{t.payment_wallet_balance}Rp {walletBalance.toLocaleString('id-ID')}</span>
                    {!isWalletSufficient && (
                        <span className={styles.errorText}>{t.payment_wallet_insufficient}</span>
                    )}
                </div>
            </div>
            {/* credit card option */}
            <div
                className={`${styles.methodCard} ${selectedMethod === 'credit_card' ? styles.active : ''}`}
                onClick={() => onSelectMethod('credit_card')}
            >
                <div className={styles.methodHeader}>
                    <div className={styles.methodName} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span className={styles.icon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={18} />
                        </span>
                        <strong>{t.payment_cc_label}</strong>
                    </div>
                    <div className={styles.radioCircle}>
                        {selectedMethod === 'credit_card' && <div className={styles.innerCircle} />}
                    </div>
                </div>
                {selectedMethod === 'credit_card' && (
                    <div className={styles.cardDropdownArea}>
                        {creditCards.length > 0 ? (
                            <>
                                <p>{t.payment_cc_select}</p>
                                <div className={styles.cardList}>
                                    {creditCards.map(card => (
                                        <label key={card.id} className={styles.cardLabel}>
                                            <input
                                                type="radio"
                                                name="credit_card"
                                                value={card.id}
                                                checked={selectedCardId === card.id}
                                                onChange={() => onSelectCard(card.id)}
                                            />
                                            <span>
                                                {card.type === 'Kartu Kredit' && language === 'EN' ? 'Credit Card' : card.type} {t.payment_cc_ending_in} {card.lastFour}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className={styles.noCardWarning}>
                                {t.payment_cc_none}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
export default PaymentMethodSelector;