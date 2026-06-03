import React from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import { formatCurrency } from '../../../utils/currencyFormatter';
import styles from './LuggageSelector.module.scss';
interface BaggageAddon {
    id: string;
    weightKg: number;
    price: number;
}
interface Props {
    options: BaggageAddon[];
    selectedLuggageId: string | null;
    onSelectLuggage: (addon: BaggageAddon | null) => void;
}
const LuggageSelector: React.FC<Props> = ({ options, selectedLuggageId, onSelectLuggage }) => {
    const { language, currency } = useAppContext();
    const t = translations[language];
    return (
        <div className={styles.luggageContainer}>
            <h3>{t.flight_extra_baggage}</h3>
            <p className={styles.subtitle}>
                {t.luggage_desc}
            </p>
            <div className={styles.optionsGrid}>
                <div
                    className={`${styles.optionCard} ${selectedLuggageId === null ? styles.selected : ''}`}
                    onClick={() => onSelectLuggage(null)}
                >
                    <h4>{t.luggage_no_addon}</h4>
                    <span>{formatCurrency(0, currency)}</span>
                </div>
                {options.map((addon) => (
                    <div
                        key={addon.id}
                        className={`${styles.optionCard} ${selectedLuggageId === addon.id ? styles.selected : ''}`}
                        onClick={() => onSelectLuggage(addon)}
                    >
                        <h4>+ {addon.weightKg} kg</h4>
                        <span>+ {formatCurrency(addon.price, currency)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default LuggageSelector;