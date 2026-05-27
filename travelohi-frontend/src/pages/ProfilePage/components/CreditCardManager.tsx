import React, { useState, useEffect } from 'react';
import FormInput from '../../../components/FormInput';
import { useAuth } from '../../../context/AuthContext';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import { CreditCard } from 'lucide-react';
import styles from './CreditCardManager.module.scss';
const CreditCardManager: React.FC = () => {
    const { userId } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];
    const [cards, setCards] = useState<{ id: number; lastFour: string; type: string }[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newCardNumber, setNewCardNumber] = useState('');
    const storageKey = `travelohi_credit_cards_${userId}`;
    useEffect(() => {
        if (!userId) return;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            setCards(JSON.parse(saved));
        }
    }, [userId, storageKey]);
    const handleAddCard = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCardNumber.length >= 16 && userId) {
            const lastFour = newCardNumber.slice(-4);
            const updated = [...cards, { id: Date.now(), lastFour, type: t.card_type_cc }];
            setCards(updated);
            localStorage.setItem(storageKey, JSON.stringify(updated));
            setIsAdding(false);
            setNewCardNumber('');
        }
    };
    const handleRemoveCard = (id: number) => {
        const updated = cards.filter(c => c.id !== id);
        setCards(updated);
        localStorage.setItem(storageKey, JSON.stringify(updated));
    };
    return (
        <div className={styles.managerContainer}>
            <h3 className={styles.sectionTitle}>{t.cc_manager_title}</h3>
            {cards.length === 0 ? (
                <p className={styles.emptyState}>{t.cc_manager_empty}</p>
            ) : (
                <div className={styles.cardList}>
                    {cards.map(card => (
                        <div key={card.id} className={styles.cardItem}>
                            <div className={styles.cardInfo} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                <span className={styles.cardIcon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CreditCard size={18} />
                                </span>
                                <span>**** **** **** {card.lastFour}</span>
                            </div>
                            <button className={styles.removeBtn} onClick={() => handleRemoveCard(card.id)}>{t.cc_manager_delete}</button>
                        </div>
                    ))}
                </div>
            )}
            {isAdding ? (
                <form onSubmit={handleAddCard} className={styles.addCardForm}>
                    <FormInput
                        label={t.cc_manager_num_label}
                        type="text"
                        value={newCardNumber}
                        onChange={(e) => setNewCardNumber(e.target.value)}
                        placeholder="1234 5678 9101 1121"
                        required
                        maxLength={16}
                    />
                    <div className={styles.actionButtons}>
                        <button type="submit" className={styles.saveBtn}>{t.cc_manager_add_btn}</button>
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