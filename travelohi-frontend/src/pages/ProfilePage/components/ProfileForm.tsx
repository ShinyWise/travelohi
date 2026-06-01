import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { AccountServiceClient } from '../../../proto/travelohi/v1/account/account.client';
import { transport } from '../../../utils/grpcClient';
import { bytesToDataUrl } from '../../../utils/imageUtils';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import FormInput from '../../../components/FormInput';
import styles from './ProfileForm.module.scss';

const client = new AccountServiceClient(transport);
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

interface ProfileFormProps {
    initialData: any;
    onProfileUpdated: (updatedData: any) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ initialData, onProfileUpdated }) => {
    const { userId, updateProfilePicture, profilePictureUrl } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];

    const [formData, setFormData] = useState({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        phoneNumber: initialData.phoneNumber || '',
        address: initialData.address || '',
        newsletterSubscribed: initialData.newsletterSubscribed || false,
    });
    
    const [profilePictureBytes, setProfilePictureBytes] = useState<Uint8Array | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2097152) {
            setMessage({ type: 'error', text: 'File too large. Maximum size is 2MB.' });
            e.target.value = '';
            return;
        }

        setMessage(null);

        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }

        const newPreview = URL.createObjectURL(file);
        setPreviewUrl(newPreview);

        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const uint8Array = new Uint8Array(arrayBuffer);
            setProfilePictureBytes(uint8Array);
        };
        reader.readAsArrayBuffer(file);
    };

    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

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
                profilePicture: profilePictureBytes ?? new Uint8Array(),
                newsletterSubscribed: formData.newsletterSubscribed,
                phoneNumber: formData.phoneNumber,
                address: formData.address,
            });
            if (response.success && response.updatedProfile) {
                setMessage({ type: 'success', text: t.profile_update_success });
                onProfileUpdated(response.updatedProfile);
                
                if (response.updatedProfile.profilePicture && response.updatedProfile.profilePicture.length > 0) {
                    const dataUrl = bytesToDataUrl(response.updatedProfile.profilePicture);
                    updateProfilePicture(dataUrl);
                }
                
                setProfilePictureBytes(null);
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
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
                <div className={styles.fileInputGroup}>
                    <label className={styles.fileInputLabel}>{t.profile_pic_url || "Foto Profil"}</label>
                    <div className={styles.fileInputWrapper}>
                        <img 
                            src={previewUrl || profilePictureUrl || DEFAULT_AVATAR} 
                            alt="Preview" 
                            className={styles.formAvatarPreview} 
                        />
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            className={styles.fileInput} 
                        />
                    </div>
                </div>
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