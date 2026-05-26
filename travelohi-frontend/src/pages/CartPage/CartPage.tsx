import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CartItemList from './components/CartItemList';
import UpdateDateModal from './components/UpdateDateModal';
import type { CartItem } from './components/CartItemCard';
import { CartServiceClient } from '../../proto/travelohi/v1/cart/cart.client';
import { transport } from '../../utils/grpcClient';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/ThemeContext';
import { translations } from '../../utils/translations';
import PriceSummaryPanel from './components/PrimarySummaryPanel';
import styles from './CartPage.module.scss';
const cartClient = new CartServiceClient(transport);
const CartPage: React.FC = () => {
    const navigate = useNavigate();
    const { userId } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // promo code states
    const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [isApplyingPromo, setIsApplyingPromo] = useState<boolean>(false);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
    // modal state
    const [editingItem, setEditingItem] = useState<CartItem | null>(null);
    const previousCartRef = useRef<CartItem[]>([]);
    const fetchCart = async () => {
        if (!userId) return;
        try {
            const { response } = await cartClient.viewCart({});
            const mappedItems: CartItem[] = (response.items || []).map((item: any) => ({
                id: item.id,
                itemType: item.itemType as 'flight_seat' | 'hotel_room',
                title: item.displayName || t.cart_item_default_title,
                subtitle: item.itemType === 'hotel_room'
                    ? t.cart_item_hotel_subtitle
                    : t.cart_item_flight_subtitle,
                imageUrl: item.displayImageUrl || '',
                price: Number(item.itemPrice),
                quantity: item.quantity || 1,
                checkInDate: item.checkInDate,
                checkOutDate: item.checkOutDate,
                status: item.status as 'ongoing' | 'expired' | 'in_cart',
            }));
            setCartItems(mappedItems);
            setAppliedPromo(response.appliedPromoCode || null);
            setDiscountAmount(Number(response.discountAmount) || 0);
        } catch (err: any) {
            setError(err.message || t.cart_load_error);
        } finally {
            setIsLoading(false);
        }
    };
    const handleApplyPromo = async (code: string) => {
        setIsApplyingPromo(true);
        setPromoError(null);
        setPromoSuccess(null);
        try {
            const { response } = await cartClient.applyPromo({ promoCode: code });
            setAppliedPromo(response.appliedPromoCode || null);
            setDiscountAmount(Number(response.discountAmount) || 0);
            setPromoSuccess(
                t.cart_promo_success.replace('{code}', response.appliedPromoCode || '')
            );
            // refresh to update items/pricing
            await fetchCart();
        } catch (err: any) {
            setPromoError(err.message || t.cart_promo_invalid);
        } finally {
            setIsApplyingPromo(false);
        }
    };
    const handleRemovePromo = async () => {
        setPromoError(null);
        setPromoSuccess(null);
        try {
            // apply empty promo code to clear on server
            const { response } = await cartClient.applyPromo({ promoCode: '' });
            setAppliedPromo(response.appliedPromoCode || null);
            setDiscountAmount(Number(response.discountAmount) || 0);
        } catch (err: any) {
            console.error("Gagal menghapus kupon", err);
        }
    };
    useEffect(() => {
        fetchCart();
    }, [userId]);
    // optimistic ui implementation
    const handleRemoveItem = async (itemId: string) => {
        previousCartRef.current = [...cartItems];
        setCartItems(prev => prev.filter(item => item.id !== itemId));
        try {
            await cartClient.removeFromCart({ cartItemId: itemId });
        } catch (err) {
            console.error("Gagal menghapus item dari server", err);
            setCartItems(previousCartRef.current);
            alert(t.cart_remove_rollback_error);
        }
    };
    const handleUpdateDates = async (itemId: string, newCheckIn: string, newCheckOut: string) => {
        try {
            const { response } = await cartClient.updateCartItem({
                cartItemId: itemId,
                newCheckInDate: newCheckIn,
                newCheckOutDate: newCheckOut,
            });
            if (response.success) {
                await fetchCart();
            }
        } catch (err: any) {
            throw new Error(err.message || t.cart_update_date_error);
        }
    };
    const nowStr = new Date().toISOString().split('T')[0];
    const hasExpiredItems = cartItems.some(item => {
        if (item.status === 'expired') return true;
        if (item.itemType === 'hotel_room') {
            return item.checkOutDate && item.checkOutDate < nowStr;
        } else if (item.itemType === 'flight_seat') {
            return item.checkInDate && item.checkInDate < nowStr;
        }
        return false;
    });
    if (isLoading) return <div className={styles.centeredState}>{t.cart_loading}</div>;
    if (cartItems.length === 0) {
        return (
            <div className={styles.emptyStateContainer}>
                <div className={styles.emptyStateCard}>
                    <span className={styles.emptyIcon}>🛒</span>
                    <h2>{t.cart_empty_title}</h2>
                    <p>{t.cart_empty_desc}</p>
                    <button className={styles.exploreBtn} onClick={() => navigate('/')}>
                        {t.explore_now}
                    </button>
                </div>
            </div>
        );
    }
    return (
        <div className={styles.pageContainer}>
            <h2 className={styles.pageTitle}>{t.cart_title}</h2>
            {error && <div className={styles.errorBox}>{error}</div>}
            <div className={styles.layout}>
                <div className={styles.mainCol}>
                    {hasExpiredItems && (
                        <div className={styles.warningBanner}>
                            {t.cart_expired_warning}
                        </div>
                    )}
                    <CartItemList
                        items={cartItems}
                        onRemove={handleRemoveItem}
                        onEditDates={setEditingItem}
                    />
                </div>
                <aside className={styles.summaryCol}>
                    <PriceSummaryPanel
                        cartItems={cartItems}
                        discountAmount={discountAmount}
                        appliedPromo={appliedPromo}
                        isApplyingPromo={isApplyingPromo}
                        promoError={promoError}
                        promoSuccess={promoSuccess}
                        onApplyPromo={handleApplyPromo}
                        onRemovePromo={handleRemovePromo}
                        onCheckout={() => navigate('/checkout')}
                        checkoutDisabled={hasExpiredItems || cartItems.length === 0}
                    />
                </aside>
            </div>
            <UpdateDateModal
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                itemId={editingItem?.id || null}
                currentCheckIn={editingItem?.checkInDate || ''}
                currentCheckOut={editingItem?.checkOutDate || ''}
                onUpdate={handleUpdateDates}
            />
        </div>
    );
};
export default CartPage;