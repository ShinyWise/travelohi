import React from 'react';
import styles from './FormInput.module.scss';
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}
const FormInput: React.FC<FormInputProps> = ({ label, error, ...props }) => {
    return (
        <div className={styles.inputGroup}>
            <label className={styles.label}>{label}</label>
            <input
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                {...props}
            />
            {error && <span className={styles.errorMessage}>{error}</span>}
        </div>
    );
};
export default FormInput;