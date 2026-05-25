import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AccountServiceClient } from '../proto/travelohi/v1/account/account.client';
import { transport } from '../utils/grpcClient';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import FormInput from './FormInput';
import styles from './ProfileForm.module.scss';
const client = new AccountServiceClient(transport);
interface ProfileFormProps {
    initialData: any;
    onProfileUpdated: (updatedData: any) => void;
}
const ProfileForm: React.FC<ProfileFormProps> = ({ initialData, onProfileUpdated }) => {
    const { userId, updateProfilePicture } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];
    const [formData, setFormData] = useState({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        phoneNumber: initialData.phoneNumber || '',
        address: initialData.address || '',
        profilePictureUrl: initialData.profilePictureUrl || '',
        newsletterSubscribed: initialData.newsletterSubscribed || false,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setIsLoading(true);
        setMessage(null);
        try {
            const { response } = await client.updateProfile({
                userId,
                firstName: formData.firstName,
                lastName: formData.lastName,
                profilePictureUrl: formData.profilePictureUrl,
                newsletterSubscribed: formData.newsletterSubscribed,
                phoneNumber: formData.phoneNumber,
                address: formData.address,
            });
            if (response.success && response.updatedProfile) {
                setMessage({ type: 'success', text: t.profile_update_success });
                onProfileUpdated(response.updatedProfile);
                if (response.updatedProfile.profilePictureUrl) {
                    updateProfilePicture(response.updatedProfile.profilePictureUrl);
                }
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || t.profile_update_fail });
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <form className={styles.formContainer} onSubmit={handleSubmit}>
            <h3 className={styles.sectionTitle}>{t.profile_personal_data}</h3>
            {message && (
                <div className={message.type === 'success' ? styles.successBox : styles.errorBox}>
                    {message.text}
                </div>
            )}
            <div className={styles.readOnlyGroup}>
                <p><strong>Email:</strong> {initialData.email}</p>
                <p><strong>{t.profile_dob}</strong> {initialData.dob}</p>
                <p><strong>{t.profile_gender}</strong> {initialData.gender}</p>
            </div>
            <div className={styles.formRow}>
                <FormInput label={t.first_name} name="firstName" value={formData.firstName} onChange={handleChange} required />
                <FormInput label={t.last_name} name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
            <div className={styles.formRow}>
                <FormInput label={t.profile_phone} name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />
                <FormInput label={t.profile_pic_url} name="profilePictureUrl" value={formData.profilePictureUrl} onChange={handleChange} />
            </div>
            <FormInput label={t.profile_address} name="address" value={formData.address} onChange={handleChange} />
            <div className={styles.toggleGroup}>
                <label className={styles.toggleLabel}>
                    <input
                        type="checkbox"
                        name="newsletterSubscribed"
                        checked={formData.newsletterSubscribed}
                        onChange={handleChange}
                    />
                    <span className={styles.toggleText}>{t.profile_newsletter_sub}</span>
                </label>
            </div>
            <button type="submit" className={styles.saveBtn} disabled={isLoading}>
                {isLoading ? t.profile_saving : t.profile_save_changes}
            </button>
        </form>
    );
};
export default ProfileForm;