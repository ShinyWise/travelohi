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
import styles from './CheckoutPage.module.scss';
const cartClient = new CartServiceClient(transport);
const accountClient = new AccountServiceClient(transport);
const CheckoutPage: React.FC = () => {
    const { userId } = useAuth();
    const navigate = useNavigate();
    const { language } = useAppContext();
    const t = translations[language];
    // data states
    const [cartTotal, setCartTotal] = useState<number>(0);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [creditCards, setCreditCards] = useState<any[]>([]);
    const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');
    // interaction states
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
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
                const promoCode = localStorage.getItem('travelohi_applied_promo') || '';
                // parallel fetching buat cart and profile data
                const [cartRes, profileRes] = await Promise.all([
                    cartClient.viewCart({ promoCode }),
                    accountClient.getProfile({ userId })
                ]);
                const items = cartRes.response.items || [];
                if (items.length === 0) {
                    navigate('/cart'); // back to cart
                    return;
                }
                // read correct fields from viewcartresponse mapping
                setCartTotal(Number(cartRes.response.totalPrice));
                setAppliedPromoCode(cartRes.response.appliedPromoCode || '');
                setWalletBalance(Number(profileRes.response.profile?.hiWalletBalance || 0));

                const storageKey = `travelohi_credit_cards_${userId}`;
                const savedCards = localStorage.getItem(storageKey);
                if (savedCards) { // credit card
                    const parsed = JSON.parse(savedCards);
                    const mapped = parsed.map((card: any) => ({
                        id: card.id.toString(),
                        lastFour: card.lastFour,
                        type: card.type || t.cc_default_type
                    }));
                    setCreditCards(mapped);
                } else {
                    setCreditCards([]);
                }
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
        if (selectedMethod === 'credit_card' && !selectedCardId) {
            setError(t.checkout_select_card_error);
            return;
        }
        setIsProcessing(true);
        setError(null);
        try {
            const { response } = await cartClient.checkout({
                paymentMethod: selectedMethod,
                creditCardId: selectedMethod === 'credit_card' ? selectedCardId! : '',
                appliedPromoCode: appliedPromoCode || ''
            });
            if (response.success && response.transactionId) {
                localStorage.removeItem('travelohi_applied_promo');
                setTransactionId(response.transactionId);
            } else {
                setError(response.message || t.checkout_process_fail);
            }
        } catch (err: any) {
            setError(err.message || t.checkout_payment_gateway_error);
        } finally {
            setIsProcessing(false);
        }
    };
    const isFormValid = selectedMethod === 'hi_wallet' || (selectedMethod === 'credit_card' && selectedCardId !== null);
    if (isLoading) return <div className={styles.loadingState}>{t.checkout_loading}</div>;
    return (
        <div className={styles.pageContainer}>
            <h2>{t.checkout_title}</h2>
            {error && <div className={styles.errorBox}>{error}</div>}
            <div className={styles.layout}>
                <div className={styles.mainCol}>
                    <PaymentMethodSelector
                        walletBalance={walletBalance}
                        totalAmount={cartTotal}
                        creditCards={creditCards}
                        selectedMethod={selectedMethod}
                        selectedCardId={selectedCardId}
                        onSelectMethod={setSelectedMethod}
                        onSelectCard={setSelectedCardId}
                    />
                </div>
                <aside className={styles.summaryCol}>
                    <div className={styles.summaryCard}>
                        <h3>{t.checkout_total_bill}</h3>
                        <div className={styles.totalAmount}>
                            Rp {cartTotal.toLocaleString('id-ID')}
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
