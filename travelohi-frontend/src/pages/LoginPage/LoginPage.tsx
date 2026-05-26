import React, { useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import FormInput from '../../components/FormInput';
import OTPModal from './components/OTPModal';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/ThemeContext';
import { translations } from '../../utils/translations';
import { AuthServiceClient } from '../../proto/travelohi/v1/auth/auth.client';
import { transport } from '../../utils/grpcClient';
import styles from './LoginPage.module.scss';
const client = new AuthServiceClient(transport);
const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    // core flow state
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    // ui states
    const [grpcError, setGrpcError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    // success messages from redirect state
    const queryParams = new URLSearchParams(location.search);
    const isSessionExpired = queryParams.get('expired') === 'true';
    const message = location.state?.message;
    const displayMessage = isSessionExpired ? t.session_expired_message : message;
    const validateEmail = (val: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;
        if (!emailRegex.test(val)) {
            setEmailError(t.email_format_error);
            return false;
        }
        setEmailError('');
        return true;
    };
    const handleStepOneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGrpcError(null);
        if (!validateEmail(email)) return;
        const captchaToken = recaptchaRef.current?.getValue();
        if (!captchaToken) {
            setGrpcError(t.recaptcha_error);
            return;
        }
        setIsLoading(true);
        try {
            const { response } = await client.checkEmail({ email, captchaToken });
            if (response.exists) {
                setStep(2);
                recaptchaRef.current?.reset();
            } else {
                navigate('/register', { state: { prefilledEmail: email } });
            }
        } catch (err: any) {
            setGrpcError(err.message || t.email_verify_error);
            recaptchaRef.current?.reset();
        } finally {
            setIsLoading(false);
        }
    };
    const handleStepTwoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGrpcError(null);
        if (!password) {
            setGrpcError(t.password_required_error);
            return;
        }
        const captchaToken = recaptchaRef.current?.getValue();
        if (!captchaToken) {
            setGrpcError(t.recaptcha_error);
            return;
        }
        setIsLoading(true);
        try {
            const { response } = await client.login({
                email,
                password,
                captchaToken,
            });
            if (response.accessToken && response.userId) {
                login(response.accessToken, response.userId);
                const from = location.state?.from?.pathname || "/";
                navigate(from, { replace: true });
            } else {
                setGrpcError(response.message || t.login_fail_wrong_password);
                recaptchaRef.current?.reset();
            }
        } catch (err: any) {
            setGrpcError(err.message || t.login_unexpected_error);
            recaptchaRef.current?.reset();
        } finally {
            setIsLoading(false);
        }
    };
    const handleOTPLoginSuccess = (token: string, userId: string) => {
        login(token, userId);
        setIsOtpModalOpen(false);
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
    };
    return (
        <div className={styles.loginContainer}>
            <div className={styles.formCard}>
                <h2>{t.login_title}</h2>
                {displayMessage && <div className={styles.successMessage}>{displayMessage}</div>}
                {grpcError && <div className={styles.serverError}>{grpcError}</div>}
                {/* conditional forms for step 1 and step 2 */}
                {step === 1 ? (
                    <form onSubmit={handleStepOneSubmit}>
                        <FormInput
                            label={t.email_label}
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (emailError) setEmailError('');
                            }}
                            onBlur={() => validateEmail(email)}
                            error={emailError}
                            required
                            placeholder="name@domain.com"
                        />
                        <div className={styles.captchaContainer}>
                            <ReCAPTCHA
                                ref={recaptchaRef}
                                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "dummy-key-for-local-dev"}
                            />
                        </div>
                        <button type="submit" className={styles.loginBtn} disabled={isLoading}>
                            {isLoading ? "..." : t.continue_btn}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleStepTwoSubmit}>
                        <div className={styles.emailLockedBlock}>
                            <span className={styles.lockedEmail}>{email}</span>
                            <button
                                type="button"
                                className={styles.changeEmailBtn}
                                onClick={() => {
                                    setStep(1);
                                    setPassword('');
                                    setGrpcError(null);
                                    recaptchaRef.current?.reset();
                                }}
                            >
                                 {t.otp_change}
                            </button>
                        </div>
                        <div className={styles.emailExistsMessage}>
                            {t.login_email_registered_notice}
                        </div>
                        <FormInput
                            label={t.password_label}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <div className={styles.captchaContainer}>
                            <ReCAPTCHA
                                ref={recaptchaRef}
                                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "dummy-key-for-local-dev"}
                            />
                        </div>
                        <button type="submit" className={styles.loginBtn} disabled={isLoading}>
                            {isLoading ? "..." : t.login}
                        </button>
                    </form>
                )}
                {/* global options visible in both steps */}
                <div className={styles.divider}>
                    <span>{t.login_or_divider}</span>
                </div>
                <button
                    className={styles.otpBtn}
                    onClick={() => setIsOtpModalOpen(true)}
                    type="button"
                >
                    {t.login_otp_btn}
                </button>
                <button
                    className={styles.registerBtn}
                    onClick={() => navigate('/register', { state: { prefilledEmail: email } })}
                    type="button"
                >
                    {t.register_title}
                </button>
                <div className={styles.footerLinks}>
                    <Link to="/forgot-password">{t.forgot_password_link}</Link>
                </div>
            </div>
            <OTPModal
                isOpen={isOtpModalOpen}
                onClose={() => setIsOtpModalOpen(false)}
                email={email}
                onSuccess={handleOTPLoginSuccess}
            />
        </div>
    );
};
export default LoginPage;