import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentMethodSelector, { type PaymentMethod } from './components/PaymentMethodSelector';
import CheckoutConfirmationModal from './components/CheckoutConfirmationModal';
import { CartServiceClient } from '../../proto/travelohi/v1/cart/cart.client';
import { AccountServiceClient } from '../../proto/travelohi/v1/account/account.client';
import { transport } from '../../utils/grpcClient';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/ThemeContext';
import { translations } from '../../utils/translations';
import { formatCurrency } from '../../utils/currencyFormatter';
import styles from './CheckoutPage.module.scss';
const cartClient = new CartServiceClient(transport);
const accountClient = new AccountServiceClient(transport);
const CheckoutPage: React.FC = () => {
    const { userId } = useAuth();
    const navigate = useNavigate();
    const { language, currency } = useAppContext();
    const t = translations[language];
    // data states
    const [cartTotal, setCartTotal] = useState<number>(0);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [creditCards, setCreditCards] = useState<any[]>([]);
    // interaction states
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
    const [typedCardNumber, setTypedCardNumber] = useState<string>('');
    // async states
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transactionId, setTransactionId] = useState<string | null>(null);
    useEffect(() => {
        if (!userId) {
            navigate('/login');
            return;
        }
        const fetchCheckoutData = async () => {
            try {
                const [cartRes, profileRes, bankRes] = await Promise.all([
                    cartClient.viewCart({}),
                    accountClient.getProfile({ userId }),
                    accountClient.getBankAccounts({ userId })
                ]);
                const items = cartRes.response.items || [];
                if (items.length === 0) {
                    navigate('/cart');
                    return;
                }
                setCartTotal(Number(cartRes.response.totalPrice));
                setWalletBalance(Number(profileRes.response.profile?.hiWalletBalance || 0));

                const mapped = bankRes.response.accounts.map((acc: any) => ({
                    id: acc.id,
                    cardNumber: acc.cardNumber,
                    lastFour: acc.cardNumber.slice(-4),
                    type: acc.bankName
                }));
                setCreditCards(mapped);
            } catch (err: any) {
                setError(err.message || t.checkout_load_error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCheckoutData();
    }, [userId, navigate, language]);
    const handleCheckout = async () => {
        if (!selectedMethod) {
            setError(t.checkout_select_payment_error);
            return;
        }
        if (selectedMethod === 'credit_card') {
            if (!typedCardNumber || typedCardNumber.length !== 16) {
                setError(t.checkout_select_card_error);
                return;
            }
            const matchedCard = creditCards.find(c => c.cardNumber === typedCardNumber);
            if (!matchedCard) {
                setError(t.checkout_card_not_registered || "This credit card is not registered to your account.");
                return;
            }
        }
        
        setIsProcessing(true);
        setError(null);
        try {
            const { response } = await cartClient.checkout({
                paymentMethod: selectedMethod,
                creditCardId: selectedMethod === 'credit_card' ? creditCards.find(c => c.cardNumber === typedCardNumber)?.id || '' : ''
            });
            if (response.success && response.transactionId) {
                localStorage.removeItem('travelohi_applied_promo');
                setTransactionId(response.transactionId);
                window.dispatchEvent(new Event('booking_updated'));
            } else {
                setError(response.message || t.checkout_process_fail);
            }
        } catch (err: any) {
            setError(err.message || t.checkout_payment_gateway_error);
        } finally {
            setIsProcessing(false);
        }
    };
    const isFormValid = selectedMethod === 'hi_wallet' || (selectedMethod === 'credit_card' && typedCardNumber.length > 0);
    if (isLoading) return <div className={styles.loadingState}>{t.checkout_loading}</div>;
    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <button className={styles.backButton} onClick={() => navigate('/cart')}>
                    &#8592; {t.back_to_cart}
                </button>
                <h2>{t.checkout_title}</h2>
            </div>
            {error && <div className={styles.errorBox}>{error}</div>}
            <div className={styles.layout}>
                <div className={styles.mainCol}>
                    <PaymentMethodSelector
                        walletBalance={walletBalance}
                        totalAmount={cartTotal}
                        selectedMethod={selectedMethod}
                        typedCardNumber={typedCardNumber}
                        onSelectMethod={setSelectedMethod}
                        onChangeCardNumber={setTypedCardNumber}
                    />
                </div>
                <aside className={styles.summaryCol}>
                    <div className={styles.summaryCard}>
                        <h3>{t.checkout_total_bill}</h3>
                        <div className={styles.totalAmount}>
                            {formatCurrency(cartTotal, currency)}
                        </div>
                        <button
                            className={styles.payBtn}
                            onClick={handleCheckout}
                            disabled={!isFormValid || isProcessing}
                        >
                            {isProcessing ? t.checkout_processing_tx : t.checkout_pay_now}
                        </button>
                        <p className={styles.secureText}>{t.checkout_secure_tx}</p>
                    </div>
                </aside>
            </div>
            <CheckoutConfirmationModal
                isOpen={!!transactionId}
                transactionId={transactionId || ''}
            />
        </div>
    );
};
export default CheckoutPage;
