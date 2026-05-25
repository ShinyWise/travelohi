import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FormInput from '../components/FormInput';
import SecurityQuestionDropdown from '../components/SecurityQuestionDropdown';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import { AuthServiceClient } from '../proto/travelohi/v1/auth/auth.client';
import { transport } from '../utils/grpcClient';
import styles from './ForgotPasswordPage.module.scss';
const client = new AuthServiceClient(transport);
const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const { language } = useAppContext();
    const t = translations[language];
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [formData, setFormData] = useState({
        securityQuestionId: 0,
        securityAnswer: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [grpcError, setGrpcError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const validateEmail = (val: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;
        return emailRegex.test(val);
    };
    const handleFetchQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setGrpcError(null);
        setErrors({});
        if (!validateEmail(email)) {
            setErrors({ email: t.email_format_error });
            return;
        }
        setIsLoading(true);
        try {
            // cek emailnya ad ga
            await client.getSecurityQuestion({ email });
            setStep(2);
        } catch (err: any) {
            if (err.message && err.message.toLowerCase().includes("suspended")) {
                setGrpcError(t.account_suspended_error);
            } else {
                setGrpcError(t.email_not_found_error);
            }
        } finally {
            setIsLoading(false);
        }
    };
    const validateStepTwo = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (formData.securityQuestionId === 0) {
            newErrors.securityQuestionId = t.question_validation_error;
        }
        if (!formData.securityAnswer.trim()) {
            newErrors.securityAnswer = t.answer_validation_error;
        }
        const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,30}$/;
        if (!pwdRegex.test(formData.newPassword)) {
            newErrors.newPassword = t.password_validation_error;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = t.password_match_error;
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setGrpcError(null);
        if (!validateStepTwo()) return;
        setIsLoading(true);
        try {
            await client.resetPassword({
                email,
                securityQuestionId: formData.securityQuestionId,
                securityAnswer: formData.securityAnswer,
                newPassword: formData.newPassword,
            });
            // redict kalo bener
            navigate('/login', {
                state: { message: t.forgot_reset_success }
            });
        } catch (err: any) {
            if (err.message && err.message.toLowerCase().includes("suspended")) {
                setGrpcError(t.account_suspended_error);
            } else {
                setGrpcError(err.message || t.forgot_reset_failed);
            }
        } finally {
            setIsLoading(false);
        }
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };
    return (
        <div className={styles.forgotContainer}>
            <div className={styles.formCard}>
                <h2>{t.forgot_password_title}</h2>
                <p className={styles.subtitle}>
                    {step === 1
                        ? t.forgot_password_subtitle_step1
                        : t.forgot_password_subtitle_step2}
                </p>
                {grpcError && <div className={styles.serverError}>{grpcError}</div>}
                {step === 1 ? (
                    <form onSubmit={handleFetchQuestion}>
                        <FormInput
                            label={t.email_label}
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (errors.email) setErrors({});
                            }}
                            error={errors.email}
                            required
                            placeholder="name@domain.com"
                        />
                        <button type="submit" className={styles.actionBtn} disabled={isLoading}>
                            {isLoading ? t.fetch_question_loading : t.continue_btn}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <div className={styles.emailLockedBlock}>
                            <span className={styles.lockedEmail}>{email}</span>
                            <button
                                type="button"
                                className={styles.changeEmailBtn}
                                onClick={() => {
                                    setStep(1);
                                    setGrpcError(null);
                                    setFormData({ securityQuestionId: 0, securityAnswer: '', newPassword: '', confirmPassword: '' });
                                }}
                            >
                                {t.change_email_btn}
                            </button>
                        </div>
                        <SecurityQuestionDropdown
                            value={formData.securityQuestionId}
                            onChange={(id) => {
                                setFormData(prev => ({ ...prev, securityQuestionId: id }));
                                if (errors.securityQuestionId) {
                                    setErrors(prev => ({ ...prev, securityQuestionId: '' }));
                                }
                            }}
                            error={errors.securityQuestionId}
                        />
                        <FormInput
                            label={t.security_answer}
                            name="securityAnswer"
                            type="text"
                            value={formData.securityAnswer}
                            onChange={handleChange}
                            error={errors.securityAnswer}
                            placeholder={t.security_answer_placeholder}
                            required
                        />
                        <FormInput
                            label={t.new_password}
                            name="newPassword"
                            type="password"
                            value={formData.newPassword}
                            onChange={handleChange}
                            error={errors.newPassword}
                            required
                        />
                        <FormInput
                            label={t.confirm_new_password}
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            error={errors.confirmPassword}
                            required
                        />
                        <button type="submit" className={styles.actionBtn} disabled={isLoading}>
                            {isLoading ? t.reset_loading : t.reset_btn}
                        </button>
                    </form>
                )}
                <div className={styles.footerLinks}>
                    {t.remember_password_prompt} <Link to="/login">{t.back_to_login}</Link>
                </div>
            </div>
        </div>
    );
};
export default ForgotPasswordPage;