import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/ThemeContext';
import { translations } from '../../utils/translations';
import { AccountServiceClient } from '../../proto/travelohi/v1/account/account.client';
import { AuthServiceClient } from '../../proto/travelohi/v1/auth/auth.client';
import { transport } from '../../utils/grpcClient';
import ProfileForm from './components/ProfileForm';
import CreditCardManager from './components/CreditCardManager';
import LogoutConfirmationModal from '../../components/LogoutConfirmationModal';
import styles from './ProfilePage.module.scss';

const accountClient = new AccountServiceClient(transport);
const authClient = new AuthServiceClient(transport);

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

const ProfilePage: React.FC = () => {
    const { userId, logout, updateProfilePicture } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];
    const navigate = useNavigate();

    const [profileData, setProfileData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId) return;
            try {
                const { response } = await accountClient.getProfile({ userId });
                setProfileData(response.profile);
                if (response.profile?.profilePictureUrl) {
                    updateProfilePicture(response.profile.profilePictureUrl);
                }
            } catch (err: any) {
                setError(err.message || "Gagal memuat data profil.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [userId, updateProfilePicture]);

    const handleLogoutConfirm = async () => {
        if (!userId) return;
        setIsLogoutModalOpen(false);
        try {
            await authClient.logout({ userId });
        } catch (err) {
            console.warn("Server logout failed, clearing local session anyway.", err);
        } finally {
            logout();
            navigate('/login', { replace: true });
        }
    };

    if (isLoading) {
        return <div className={styles.loadingSpinner}>{t.profile_loading_data}</div>;
    }

    return (
        <div className={styles.profileContainer}>
            <aside className={styles.sidebar}>
                <div className={styles.userInfoMini}>
                    <img
                        src={profileData?.profilePictureUrl || DEFAULT_AVATAR}
                        alt="Profile"
                        className={styles.avatarMini}
                    />
                    <div className={styles.nameMini}>
                        <h4>{profileData?.firstName} {profileData?.lastName}</h4>
                        <span>{profileData?.email}</span>
                    </div>
                </div>
                <nav className={styles.navMenu}>
                    <button
                        className={`${styles.navItem} ${styles.active}`}
                        onClick={() => {}}
                    >
                        {t.profile_personal_data}
                    </button>
                    <button
                        className={styles.navItem}
                        onClick={() => navigate('/bookings')}
                    >
                        {t.my_orders}
                    </button>
                    <button className={styles.navItem} onClick={() => setIsLogoutModalOpen(true)}>{t.logout}</button>
                </nav>
            </aside>
            <main className={styles.mainContent}>
                <h2>{t.profile_settings_title}</h2>
                {error && <div className={styles.errorBox}>{error}</div>}
                {profileData && (
                    <>
                        <ProfileForm
                            initialData={profileData}
                            onProfileUpdated={(updatedData) => setProfileData(updatedData)}
                        />
                        <CreditCardManager />
                    </>
                )}
            </main>
            <LogoutConfirmationModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogoutConfirm}
            />
        </div>
    );
};

export default ProfilePage;