import React from 'react';
import styles from './FormInput.module.scss';
interface Props {
    value: number;
    onChange: (id: number) => void;
    error?: string;
}
const SecurityQuestionDropdown: React.FC<Props> = ({ value, onChange, error }) => {
    const questions = [
        { id: 1, text: "What is your favorite childhood pet's name?" },
        { id: 2, text: "In which city where you born?" },
        { id: 3, text: "What is the name of your favorite book or movie?" },
        { id: 4, text: "What is the name of the elementary school you attended?" },
        { id: 5, text: "What is the model of your first car?" },
    ];
    return (
        <div className={styles.inputGroup}>
            <label className={styles.label}>Pertanyaan Keamanan Pribadi</label>
            <select
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            >
                <option value={0} disabled>Pilih pertanyaan keamanan</option>
                {questions.map((q) => (
                    <option key={q.id} value={q.id}>{q.text}</option>
                ))}
            </select>
            {error && <span className={styles.errorMessage}>{error}</span>}
        </div>
    );
};
export default SecurityQuestionDropdown;