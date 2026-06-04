import React, { useState } from 'react';
import FormInput from '../../../components/FormInput';
import { useAuth } from '../../../context/AuthContext';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { Wallet, Gift } from 'lucide-react';
import styles from './WalletCouponRedeemer.module.scss';
import { AccountServiceClient } from '../../../proto/travelohi/v1/account/account.client';
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';

interface Props {
    currentBalance: bigint | number;
    onRedeemSuccess: () => void;
}

const WalletCouponRedeemer: React.FC<Props> = ({ currentBalance, onRedeemSuccess }) => {
    const { userId, token } = useAuth();
    const { language, currency } = useAppContext();
    const t = translations[language];

    const [couponCode, setCouponCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const transport = new GrpcWebFetchTransport({
        baseUrl: "http://localhost:8080",
        format: "binary",
        meta: { "Authorization": `Bearer ${token}` }
    });
    const client = new AccountServiceClient(transport);

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!couponCode.trim() || !userId) return;

        setIsLoading(true);
        setSuccessMessage(null);
        setErrorMessage(null);

        try {
            const { response } = await client.redeemWalletCoupon({
                userId,
                couponCode: couponCode.trim()
            });

            if (response.success) {
                setSuccessMessage(t.wallet_coupon_success || "Coupon successfully redeemed!");
                setCouponCode('');
                onRedeemSuccess();
                window.dispatchEvent(new Event('bank_updated'));
            } else {
                setErrorMessage(response.message || t.wallet_coupon_invalid || "Invalid coupon.");
            }
        } catch (err: any) {
            console.error("Failed to redeem wallet coupon:", err);
            setErrorMessage(err.message || t.wallet_coupon_invalid || "Invalid or expired coupon.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.walletContainer}>
            <h3 className={styles.sectionTitle}>HI-Wallet</h3>

            <div className={styles.balanceCard}>
                <div className={styles.balanceInfo}>
                    <span className={styles.walletIcon}>
                        <Wallet size={24} />
                    </span>
                    <div className={styles.balanceDetails}>
                        <span className={styles.balanceLabel}>{t.wallet_balance}</span>
                        <span className={styles.balanceAmount}>{formatCurrency(currentBalance, currency)}</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleRedeem} className={styles.redeemForm}>
                <h4 className={styles.redeemTitle}>
                    <Gift size={16} />
                    <span>{t.wallet_coupon_title || "Redeem Balance Coupon"}</span>
                </h4>

                {successMessage && <div className={styles.successBox}>{successMessage}</div>}
                {errorMessage && <div className={styles.errorBox}>{errorMessage}</div>}

                <div className={styles.inputGroupRow}>
                    <div style={{ flex: 1 }}>
                        <FormInput
                            label=""
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            placeholder={t.wallet_coupon_placeholder || "Enter balance coupon code..."}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <button type="submit" className={styles.redeemBtn} disabled={isLoading || !couponCode.trim()}>
                        {isLoading ? t.rooms_processing || "Processing..." : t.wallet_coupon_btn || "Redeem"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default WalletCouponRedeemer;
