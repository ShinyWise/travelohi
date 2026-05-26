import React, { useState, useRef, useEffect } from 'react';
import FormInput from '../../../components/FormInput';
import { AuthServiceClient } from '../../../proto/travelohi/v1/auth/auth.client';
import { transport } from '../../../utils/grpcClient';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './OTPModal.module.scss';
const client = new AuthServiceClient(transport);
interface OTPModalProps {
    isOpen: boolean;
    onClose: () => void;
    email: string;
    onSuccess: (token: string, userId: string) => void;
}
const OTPModal: React.FC<OTPModalProps> = ({ isOpen, onClose, email, onSuccess }) => {
    const { language } = useAppContext();
    const t = translations[language];
    const [step, setStep] = useState<1 | 2>(1);
    const [localEmail, setLocalEmail] = useState(email);
    const [emailError, setEmailError] = useState('');
    const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0);
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);
    useEffect(() => {
        if (isOpen) {
            setLocalEmail(email);
            setEmailError('');
        } else {
            setStep(1);
            setOtpValues(Array(6).fill(''));
            setCountdown(0);
            setError(null);
            setSuccessMessage(null);
        }
    }, [isOpen, email]);
    if (!isOpen) return null;
    const handleSendOTP = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;
        if (!localEmail) {
            setEmailError(t.otp_email_required);
            return;
        }
        if (!emailRegex.test(localEmail)) {
            setEmailError(t.otp_email_format);
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const { response } = await client.sendOTP({ email: localEmail });
            if (response.success) {
                setStep(2);
                setCountdown(60);
                setSuccessMessage(t.otp_sent_success);
            } else {
                setError(response.message || t.otp_send_fail);
            }
        } catch (err: any) {
            setError(err.message || t.otp_network_error);
        } finally {
            setIsLoading(false);
        }
    };
    const handleVerifyOTP = async () => {
        const otpCode = otpValues.join('');
        if (otpCode.length < 6) {
            setError(t.otp_code_required);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const { response } = await client.loginWithOTP({ email: localEmail, otpCode });
            if (response.accessToken && response.userId) {
                onSuccess(response.accessToken, response.userId);
            } else {
                setError(response.message || t.otp_invalid);
            }
        } catch (err: any) {
            setError(err.message || t.otp_verify_fail);
        } finally {
            setIsLoading(false);
        }
    };
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otpValues];
        newOtp[index] = value.slice(-1);
        setOtpValues(newOtp);
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };
    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };
    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">✕</button>
                <h3>{t.otp_title}</h3>
                <p className={styles.description}>
                    {step === 1 ? t.otp_step1_desc : t.otp_step2_desc}
                </p>
                {error && <div className={styles.errorBox}>{error}</div>}
                {successMessage && <div className={styles.successBox}>{successMessage}</div>}
                {step === 1 ? (
                    <div className={styles.stepOneContainer}>
                        <FormInput
                            label={t.email_label}
                            type="email"
                            value={localEmail}
                            onChange={(e) => {
                                setLocalEmail(e.target.value);
                                if (emailError) setEmailError('');
                            }}
                            placeholder="name@domain.com"
                            error={emailError}
                            required
                        />
                        <button
                            className={styles.actionBtn}
                            onClick={handleSendOTP}
                            disabled={isLoading}
                        >
                            {isLoading ? t.otp_sending : t.otp_send_btn}
                        </button>
                    </div>
                ) : (
                    <div className={styles.stepTwoContainer}>
                        <div className={styles.emailPreview}>
                            <div className={styles.emailText}>
                                <strong>Email:</strong> {localEmail}
                            </div>
                            <button
                                type="button"
                                className={styles.changeEmailBtn}
                                onClick={() => {
                                    setStep(1);
                                    setError(null);
                                    setSuccessMessage(null);
                                }}
                            >
                                {t.otp_change}
                            </button>
                        </div>
                        <div className={styles.otpInputGroup}>
                            {otpValues.map((value, index) => (
                                <input
                                    key={index}
                                    ref={(el) => { inputRefs.current[index] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    className={styles.otpInputBox}
                                    value={value}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>
                        <button
                            className={styles.actionBtn}
                            onClick={handleVerifyOTP}
                            disabled={isLoading}
                        >
                            {isLoading ? t.otp_verifying : t.otp_verify_btn}
                        </button>
                        <button
                            className={`${styles.actionBtn} ${styles.resendBtn}`}
                            onClick={handleSendOTP}
                            disabled={countdown > 0 || isLoading}
                        >
                            {countdown > 0
                                ? t.otp_resend_countdown.replace('{count}', countdown.toString())
                                : t.otp_resend_btn}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
export default OTPModal;