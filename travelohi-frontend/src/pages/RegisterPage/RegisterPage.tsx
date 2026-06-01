import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import FormInput from '../../components/FormInput';
import SecurityQuestionDropdown from '../../components/SecurityQuestionDropdown';
import { useAppContext } from '../../context/ThemeContext';
import { translations } from '../../utils/translations';
import { isValidPassword } from '../../utils/validation';
import { AuthServiceClient } from '../../proto/travelohi/v1/auth/auth.client';
import { transport } from '../../utils/grpcClient';
import styles from './RegisterPage.module.scss';
const client = new AuthServiceClient(transport);
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { language } = useAppContext();
    const t = translations[language];
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const prefilledEmail = location.state?.prefilledEmail || '';
    const [formData, setFormData] = useState({
        email: prefilledEmail,
        firstName: '',
        lastName: '',
        dob: '',
        gender: '',
        password: '',
        confirmPassword: '',
        securityQuestionId: 0,
        securityAnswer: '',
        subscribeNewsletter: false,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [grpcError, setGrpcError] = useState<string | null>(null);
    const [profilePictureBase64, setProfilePictureBase64] = useState<string>('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2097152) {
            setErrors(prev => ({ ...prev, profilePicture: 'File too large. Maximum size is 2MB.' }));
            e.target.value = '';
            return;
        }

        setErrors(prev => ({ ...prev, profilePicture: '' }));

        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        const newPreview = URL.createObjectURL(file);
        setPreviewUrl(newPreview);

        const reader = new FileReader();
        reader.onload = (event) => {
            const b64 = event.target?.result as string;
            setProfilePictureBase64(b64);
        };
        reader.readAsDataURL(file);
    };

    React.useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;
        if (!emailRegex.test(formData.email)) {
            newErrors.email = t.email_format_error;
        }
        // > 5 chars, no symbols/numbers
        const nameRegex = /^[a-zA-Z]{6,}$/;
        if (!nameRegex.test(formData.firstName)) newErrors.firstName = t.name_validation_error;
        if (!nameRegex.test(formData.lastName)) newErrors.lastName = t.name_validation_error;
        // >= 13 years
        const birthDate = new Date(formData.dob);
        const ageDiffMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDiffMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        if (!formData.dob || age < 13) newErrors.dob = t.age_validation_error;
        if (!formData.gender) newErrors.gender = t.gender_validation_error;
        if (!isValidPassword(formData.password)) {
            newErrors.password = t.password_validation_error;
        }
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = t.password_match_error;
        }
        if (formData.securityQuestionId === 0) newErrors.securityQuestionId = t.question_validation_error;
        if (formData.securityAnswer.trim() === '') newErrors.securityAnswer = t.answer_validation_error;
        if (!profilePictureBase64) newErrors.profilePicture = (t as any).profile_pic_validation_error || 'Profile picture is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGrpcError(null);
        if (!validateForm()) return;
        const captchaToken = recaptchaRef.current?.getValue();
        if (!captchaToken) {
            setGrpcError(t.recaptcha_error);
            return;
        }
        setIsLoading(true);
        try {
            await client.register({
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName,
                dob: formData.dob,
                gender: formData.gender,
                subscribeNewsletter: formData.subscribeNewsletter,
                captchaToken: captchaToken,
                securityQuestionId: formData.securityQuestionId,
                securityAnswer: formData.securityAnswer,
                profilePicture: profilePictureBase64,
            });
            navigate('/login', { state: { message: t.register_success } });
        } catch (err: any) {
            // handle grpc errors (e.g., email already exists)
            setGrpcError(err.message || t.register_failed);
            recaptchaRef.current?.reset();
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className={styles.registerContainer}>
            <div className={styles.formCard}>
                <h2>{t.register_title}</h2>
                {grpcError && <div className={styles.serverError}>{grpcError}</div>}
                <form onSubmit={handleSubmit}>
                    <FormInput label={t.email_label} type="email" name="email" value={formData.email} onChange={handleChange} error={errors.email} required />
                    <div className={styles.row}>
                        <FormInput label={t.first_name} name="firstName" value={formData.firstName} onChange={handleChange} error={errors.firstName} />
                        <FormInput label={t.last_name} name="lastName" value={formData.lastName} onChange={handleChange} error={errors.lastName} />
                    </div>
                    <div className={styles.row}>
                        <FormInput label={t.dob} type="date" name="dob" value={formData.dob} onChange={handleChange} error={errors.dob} />
                        <div className={styles.genderGroup}>
                            <label>{t.gender}</label>
                            <select 
                                name="gender" 
                                value={formData.gender} 
                                onChange={handleChange} 
                                className={`${errors.gender ? styles.errorBorder : ''} ${!formData.gender ? styles.placeholderSelect : ''}`}
                            >
                                <option value="" disabled>{t.gender_placeholder}</option>
                                <option value="Male">{t.gender_male}</option>
                                <option value="Female">{t.gender_female}</option>
                            </select>
                            {errors.gender && <span className={styles.errorText}>{errors.gender}</span>}
                        </div>
                    </div>
                    <div className={styles.row}>
                        <FormInput label={t.password_label} type="password" name="password" value={formData.password} onChange={handleChange} error={errors.password} />
                        <FormInput label={t.confirm_password} type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
                    </div>
                    <div className={styles.row}>
                        <div className={styles.fileInputGroup}>
                            <label className={styles.fileInputLabel}>{t.profile_pic_url || "Foto Profil"}</label>
                            <div className={styles.fileInputWrapper}>
                                <img 
                                    src={previewUrl || DEFAULT_AVATAR} 
                                    alt="Preview" 
                                    className={styles.formAvatarPreview} 
                                />
                                <input 
                                    type="file" 
                                    accept="image/png, image/jpeg" 
                                    onChange={handleFileChange} 
                                    className={styles.fileInput} 
                                />
                            </div>
                            {errors.profilePicture && <span className={styles.errorText}>{errors.profilePicture}</span>}
                        </div>
                    </div>
                    <SecurityQuestionDropdown
                        value={formData.securityQuestionId}
                        onChange={(id) => setFormData(prev => ({ ...prev, securityQuestionId: id }))}
                        error={errors.securityQuestionId}
                    />
                    <FormInput label={t.security_answer} name="securityAnswer" value={formData.securityAnswer} onChange={handleChange} error={errors.securityAnswer} />
                    <div className={styles.checkboxGroup}>
                        <input type="checkbox" id="newsletter" name="subscribeNewsletter" checked={formData.subscribeNewsletter} onChange={handleChange} />
                        <label htmlFor="newsletter">{t.subscribe_newsletter}</label>
                    </div>
                    <div className={styles.captchaContainer}>
                        <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "dummy-key-for-local-dev"}
                        />
                    </div>
                    <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                        {isLoading ? t.registering_btn : t.register_btn}
                    </button>
                    <div className={styles.footerLinks}>
                        {t.already_have_account} <span onClick={() => navigate('/login')}>{t.login_here}</span>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default RegisterPage;