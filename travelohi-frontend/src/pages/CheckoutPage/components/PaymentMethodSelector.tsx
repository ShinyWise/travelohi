import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { Wallet, CreditCard } from 'lucide-react';
import styles from './PaymentMethodSelector.module.scss';
export type PaymentMethod = 'hi_wallet' | 'credit_card' | null;

interface Props {
    walletBalance: number;
    totalAmount: number;
    selectedMethod: PaymentMethod;
    typedCardNumber: string;
    onSelectMethod: (method: PaymentMethod) => void;
    onChangeCardNumber: (cardNumber: string) => void;
}
const PaymentMethodSelector: React.FC<Props> = ({
    walletBalance,
    totalAmount,
    selectedMethod,
    typedCardNumber,
    onSelectMethod,
    onChangeCardNumber
}) => {
    const { language, currency } = useAppContext();
    const t = translations[language];
    const isWalletSufficient = walletBalance >= totalAmount;

    const [displayCardNumber, setDisplayCardNumber] = useState('');
    useEffect(() => {
        if (typedCardNumber === '') setDisplayCardNumber('');
    }, [typedCardNumber]);

    const handleCardInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
        const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
        setDisplayCardNumber(formatted);
        onChangeCardNumber(raw);
    };
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
                    <span>{t.payment_wallet_balance}{formatCurrency(walletBalance, currency)}</span>
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
                        <p>{t.payment_cc_select}</p>
                        <input
                            type="text"
                            inputMode="numeric"
                            className={styles.ccInput}
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                            value={displayCardNumber}
                            onChange={handleCardInput}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                color: 'var(--text-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                                marginTop: '8px',
                                fontFamily: 'monospace',
                                letterSpacing: '0.1em'
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
export default PaymentMethodSelector;