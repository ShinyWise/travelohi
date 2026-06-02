import React, { useState, useEffect } from 'react';
import FormInput from '../../../components/FormInput';
import { useAuth } from '../../../context/AuthContext';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import { CreditCard, Trash2 } from 'lucide-react';
import styles from './CreditCardManager.module.scss';
import { AccountServiceClient } from '../../../proto/travelohi/v1/account/account.client';
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import { BankAccount } from '../../../proto/travelohi/v1/account/account';

const CreditCardManager: React.FC = () => {
    const { userId, token } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [bankName, setBankName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const transport = new GrpcWebFetchTransport({
        baseUrl: "http://localhost:8080",
        format: "binary",
        meta: { "Authorization": `Bearer ${token}` }
    });
    const client = new AccountServiceClient(transport);

    const fetchAccounts = async () => {
        if (!userId) return;
        try {
            const { response } = await client.getBankAccounts({ userId });
            setAccounts(response.accounts);
        } catch (err) {
            console.error("Failed to fetch bank accounts:", err);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [userId]);

    const handleAddAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cardNumber.length >= 16 && bankName && userId) {
            setIsLoading(true);
            try {
                const { response } = await client.addBankAccount({
                    userId,
                    bankName,
                    cardNumber
                });
                if (response.success) {
                    await fetchAccounts();
                    window.dispatchEvent(new Event('bank_updated'));
                    setIsAdding(false);
                    setBankName('');
                    setCardNumber('');
                }
            } catch (err) {
                console.error("Failed to add bank account:", err);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRemoveAccount = async (id: string) => {
        if (!userId) return;
        try {
            const { response } = await client.deleteBankAccount({
                userId,
                bankAccountId: id
            });
            if (response.success) {
                await fetchAccounts();
                window.dispatchEvent(new Event('bank_updated'));
            }
        } catch (err) {
            console.error("Failed to delete bank account:", err);
        }
    };

    const maskCardNumber = (num: string) => {
        const lastFour = num.slice(-4);
        return `**** **** **** ${lastFour}`;
    };

    return (
        <div className={styles.managerContainer}>
            <h3 className={styles.sectionTitle}>{t.cc_manager_title}</h3>
            {accounts.length === 0 ? (
                <p className={styles.emptyState}>{t.cc_manager_empty}</p>
            ) : (
                <div className={styles.cardList}>
                    {accounts.map(acc => (
                        <div key={acc.id} className={styles.cardItem}>
                            <div className={styles.cardInfo} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                <span className={styles.cardIcon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CreditCard size={18} />
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{acc.bankName}</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{maskCardNumber(acc.cardNumber)}</span>
                                </div>
                            </div>
                            <button className={styles.removeBtn} onClick={() => handleRemoveAccount(acc.id)}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {isAdding ? (
                <form onSubmit={handleAddAccount} className={styles.addCardForm}>
                    <FormInput
                        label="Bank Name"
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. BCA, Mandiri"
                        required
                    />
                    <FormInput
                        label={t.cc_manager_num_label}
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="1234 5678 9101 1121"
                        required
                        maxLength={16}
                    />
                    <div className={styles.actionButtons}>
                        <button type="submit" className={styles.saveBtn} disabled={isLoading}>
                            {isLoading ? t.profile_saving : t.cc_manager_add_btn}
                        </button>
                        <button type="button" className={styles.cancelBtn} onClick={() => setIsAdding(false)}>{t.cc_manager_cancel}</button>
                    </div>
                </form>
            ) : (
                <button className={styles.addBtn} onClick={() => setIsAdding(true)}>
                    {t.cc_manager_add_new}
                </button>
            )}
        </div>
    );
};
export default CreditCardManager;