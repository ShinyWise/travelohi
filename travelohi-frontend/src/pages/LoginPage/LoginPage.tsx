import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import FormInput from '../../components/FormInput';
import OTPModal from './components/OTPModal';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/ThemeContext';
import { translations } from '../../utils/translations';
import { AuthServiceClient } from '../../proto/travelohi/v1/auth/auth.client';
import { CartServiceClient } from '../../proto/travelohi/v1/cart/cart.client';
import { transport } from '../../utils/grpcClient';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '../../components/Toast';
import styles from './LoginPage.module.scss';
const client = new AuthServiceClient(transport);
const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];
    const { showToast } = useToast();
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [grpcError, setGrpcError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    const [isInactive, setIsInactive] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const queryParams = new URLSearchParams(window.location.search);
    const isSessionExpired = queryParams.get('expired') === 'true';
    const message = location.state?.message;
    const displayMessage = isSessionExpired ? t.session_expired_message : message;
    const hasShownToastRef = useRef(false);
    useEffect(() => {
        if (displayMessage && !hasShownToastRef.current) {
            hasShownToastRef.current = true;
            showToast(displayMessage, isSessionExpired ? 'error' : 'success');
            if (isSessionExpired) {
                const url = new URL(window.location.href);
                url.searchParams.delete('expired');
                window.history.replaceState({}, '', url.pathname + url.search);
            }
            if (message) {
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [displayMessage, isSessionExpired, showToast, message, navigate, location.pathname]);
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
                if (!response.isActive) {
                    setIsInactive(true);
                    recaptchaRef.current?.reset();
                } else {
                    setStep(2);
                    recaptchaRef.current?.reset();
                }
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
                await login(response.accessToken, response.userId);

                const pendingFlightBooking = sessionStorage.getItem('pendingFlightBooking');
                if (pendingFlightBooking) {
                    try {
                        const bookingData = JSON.parse(pendingFlightBooking);
                        const cartClient = new CartServiceClient(transport);
                        await cartClient.addToCart(bookingData);
                        sessionStorage.removeItem('pendingFlightBooking');
                        showToast("Seat added to cart successfully!", "success");
                        navigate('/cart', { replace: true });
                        return;
                    } catch (e: any) {
                        console.error("Failed to process pending booking:", e);
                        sessionStorage.removeItem('pendingFlightBooking');
                        showToast(e.message || "Failed to add seat. It may have been booked.", "error");
                    }
                }

                const pendingHotelBooking = sessionStorage.getItem('pendingHotelBooking');
                if (pendingHotelBooking) {
                    try {
                        const bookingData = JSON.parse(pendingHotelBooking);
                        const cartClient = new CartServiceClient(transport);
                        await cartClient.addToCart(bookingData);
                        sessionStorage.removeItem('pendingHotelBooking');
                        showToast("Room added to cart successfully!", "success");
                        if (bookingData.redirect) {
                            navigate('/cart', { replace: true });
                            return;
                        }
                    } catch (e: any) {
                        console.error("Failed to process pending hotel booking:", e);
                        sessionStorage.removeItem('pendingHotelBooking');
                        showToast(e.message || "Failed to add room.", "error");
                    }
                }

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
    const handleOTPLoginSuccess = async (token: string, userId: string) => {
        await login(token, userId);
        setIsOtpModalOpen(false);

        const pendingFlightBooking = sessionStorage.getItem('pendingFlightBooking');
        if (pendingFlightBooking) {
            try {
                const bookingData = JSON.parse(pendingFlightBooking);
                const cartClient = new CartServiceClient(transport);
                await cartClient.addToCart(bookingData);
                sessionStorage.removeItem('pendingFlightBooking');
                showToast("Seat added to cart successfully!", "success");
                navigate('/cart', { replace: true });
                return;
            } catch (e: any) {
                console.error("Failed to process pending booking:", e);
                sessionStorage.removeItem('pendingFlightBooking');
                showToast(e.message || "Failed to add seat. It may have been booked.", "error");
            }
        }

        const pendingHotelBooking = sessionStorage.getItem('pendingHotelBooking');
        if (pendingHotelBooking) {
            try {
                const bookingData = JSON.parse(pendingHotelBooking);
                const cartClient = new CartServiceClient(transport);
                await cartClient.addToCart(bookingData);
                sessionStorage.removeItem('pendingHotelBooking');
                showToast("Room added to cart successfully!", "success");
                if (bookingData.redirect) {
                    navigate('/cart', { replace: true });
                    return;
                }
            } catch (e: any) {
                console.error("Failed to process pending hotel booking:", e);
                sessionStorage.removeItem('pendingHotelBooking');
                showToast(e.message || "Failed to add room.", "error");
            }
        }

        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
    };
    const handleResendActivation = async () => {
        setIsResending(true);
        setGrpcError(null);
        try {
            await client.resendActivationEmail({ email });
            showToast("Activation email sent! Please check your inbox.", "success");
            setIsInactive(false);
            setEmail('');
        } catch (err: any) {
            setGrpcError(err.message || "Failed to resend activation email.");
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <div className={styles.formCard}>
                <h2>{t.login_title}</h2>
                {grpcError && <div className={styles.serverError}>{grpcError}</div>}

                {isInactive ? (
                    <div className={styles.inactiveState}>
                        <div className={styles.inactiveIcon}>
                            <AlertTriangle size={48} color="#f1c40f" />
                        </div>
                        <h3>Account Not Activated</h3>
                        <p>Your account ({email}) has not been activated yet. You must activate it before logging in.</p>
                        <button
                            className={styles.loginBtn}
                            onClick={handleResendActivation}
                            disabled={isResending}
                        >
                            {isResending ? 'Sending...' : 'Resend Activation Email'}
                        </button>
                        <button
                            className={styles.otpBtn}
                            onClick={() => setIsInactive(false)}
                            style={{ width: '100%', marginTop: '10px' }}
                        >
                            Back to Login
                        </button>
                    </div>
                ) : step === 1 ? (
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
                                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
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
                                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
                            />
                        </div>
                        <button type="submit" className={styles.loginBtn} disabled={isLoading}>
                            {isLoading ? "..." : t.login}
                        </button>
                    </form>
                )}
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