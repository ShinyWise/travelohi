import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import { AccountServiceClient } from '../proto/travelohi/v1/account/account.client';
import { AuthServiceClient } from '../proto/travelohi/v1/auth/auth.client';
import { transport } from '../utils/grpcClient';
import ProfileForm from '../components/ProfileForm';
import CreditCardManager from '../components/CreditCardManager';
import ReviewSubmissionModal from '../components/ReviewSubmissionModal';
import LogoutConfirmationModal from '../components/LogoutConfirmationModal';
import styles from './ProfilePage.module.scss';
const accountClient = new AccountServiceClient(transport);
const authClient = new AuthServiceClient(transport);
interface Booking {
    bookingId: string;
    transactionId: string;
    itemType: string;
    displayName: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    bookingReferenceCode: string;
    hotelId?: string;
}
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

const ProfilePage: React.FC = () => {
    const { userId, logout, updateProfilePicture } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];
    const navigate = useNavigate();
    const location = useLocation();
    // tab state: 'profile' | 'bookings'
    const [activeTab, setActiveTab] = useState<'profile' | 'bookings'>(
        location.state?.activeTab || 'profile'
    );
    useEffect(() => {
        setActiveTab(location.state?.activeTab || 'profile');
    }, [location.state]);
    const [profileData, setProfileData] = useState<any>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [activeReviewBooking, setActiveReviewBooking] = useState<Booking | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // e-ticket modal state
    const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);
    const [ticketDetails, setTicketDetails] = useState<any>(null);
    const [isTicketLoading, setIsTicketLoading] = useState(false);
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
    const fetchBookings = async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const { response } = await accountClient.getBookingHistory({
                userId,
                filterStatus: 'all',
                limit: 50,
                offset: 0
            });
            const mappedBookings: Booking[] = (response.bookings || []).map((b: any) => ({
                bookingId: b.bookingId,
                transactionId: b.transactionId,
                itemType: b.itemType,
                displayName: b.displayName,
                checkInDate: b.checkInDate,
                checkOutDate: b.checkOutDate,
                status: b.status,
                bookingReferenceCode: b.bookingRefferenceCode,
                hotelId: b.hotelId
            }));
            setBookings(mappedBookings);
        } catch (err: any) {
            setError(err.message || "Gagal memuat riwayat pesanan.");
        } finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        if (activeTab === 'bookings') {
            fetchBookings();
        }
    }, [userId, activeTab]);
    const handleViewETicket = async (booking: Booking) => {
        setSelectedTicket(booking);
        setIsTicketLoading(true);
        try {
            const { response } = await accountClient.getETicket({
                userId: userId || '',
                bookingId: booking.bookingId
            });
            setTicketDetails(response);
        } catch (err: any) {
            console.error("Gagal memuat e-tiket", err);
        } finally {
            setIsTicketLoading(false);
        }
    };
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
    if (isLoading && !selectedTicket) {
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
                        className={`${styles.navItem} ${activeTab === 'profile' ? styles.active : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        {t.profile_personal_data}
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'bookings' ? styles.active : ''}`}
                        onClick={() => setActiveTab('bookings')}
                    >
                        {t.my_orders}
                    </button>
                    <button className={styles.navItem} onClick={() => setIsLogoutModalOpen(true)}>{t.logout}</button>
                </nav>
            </aside>
            <main className={styles.mainContent}>
                {activeTab === 'profile' ? (
                    <>
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
                    </>
                ) : (
                    <>
                        <h2>{t.my_orders}</h2>
                        {error && <div className={styles.errorBox}>{error}</div>}
                        {bookings.length === 0 ? (
                            <div className={styles.emptyBookings}>
                                <p>{t.profile_empty_bookings}</p>
                                <button onClick={() => navigate('/')}>{t.profile_order_hotel_flight}</button>
                            </div>
                        ) : (
                            <div className={styles.bookingsList}>
                                {bookings.map((booking) => (
                                    <div key={booking.bookingId} className={styles.bookingCard}>
                                        <div className={styles.bookingHeader}>
                                            <span className={styles.itemBadge}>
                                                {booking.itemType === 'hotel_room' ? t.profile_booking_hotel : t.profile_booking_flight}
                                            </span>
                                            <span className={`${styles.statusBadge} ${styles.paid}`}>
                                                {booking.status === 'completed' 
                                                    ? (language === 'ID' ? 'Selesai' : 'Completed') 
                                                    : booking.status === 'reviewed' 
                                                        ? (language === 'ID' ? 'Sudah Diulas' : 'Reviewed') 
                                                        : (booking.status || t.profile_status_active)}
                                            </span>
                                        </div>
                                        <h3 className={styles.bookingTitle}>{booking.displayName}</h3>
                                        <div className={styles.bookingDetails}>
                                            <div className={styles.detailCol}>
                                                <span>{booking.itemType === 'hotel_room' ? t.profile_checkin_date : t.profile_departure_time}</span>
                                                <strong>{booking.checkInDate || '-'}</strong>
                                            </div>
                                            <div className={styles.detailCol}>
                                                <span>{booking.itemType === 'hotel_room' ? t.profile_checkout_date : t.profile_arrival_time}</span>
                                                <strong>{booking.checkOutDate || '-'}</strong>
                                            </div>
                                            <div className={styles.detailCol}>
                                                <span>{t.profile_booking_code}</span>
                                                <strong style={{ color: '#0b5b9c' }}>{booking.bookingReferenceCode}</strong>
                                            </div>
                                        </div>
                                        <div className={styles.bookingActions}>
                                            <button
                                                className={styles.ticketBtn}
                                                onClick={() => handleViewETicket(booking)}
                                            >
                                                {t.profile_view_eticket}
                                            </button>
                                            {booking.itemType === 'hotel_room' && (
                                                booking.status === 'completed' ? (
                                                    <button
                                                        className={styles.reviewBtn}
                                                        onClick={() => setActiveReviewBooking(booking)}
                                                    >
                                                        {t.profile_write_review}
                                                    </button>
                                                ) : booking.status === 'reviewed' ? (
                                                    <button
                                                        className={styles.reviewBtn}
                                                        disabled
                                                    >
                                                        {t.profile_review_submitted}
                                                    </button>
                                                ) : null
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
            {/* e-ticket boarding pass modal */}
            {selectedTicket && (
                <div className={styles.ticketOverlay} onClick={() => setSelectedTicket(null)}>
                    <div className={styles.ticketModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.ticketHeaderMain}>
                            <h3>{selectedTicket.itemType === 'hotel_room' ? t.profile_hotel_voucher : t.profile_boarding_pass}</h3>
                            <button className={styles.closeBtn} onClick={() => setSelectedTicket(null)}>×</button>
                        </div>
                        {isTicketLoading ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}>{t.profile_loading_ticket}</div>
                        ) : (
                            <div className={styles.ticketBody}>
                                <div className={styles.ticketInfoGrid}>
                                    <div className={styles.detailCol}>
                                        <span>{t.profile_guest_passenger_name}</span>
                                        <strong>{ticketDetails?.passengerOrGuestName || (profileData?.firstName + ' ' + profileData?.lastName)}</strong>
                                    </div>
                                    <div className={styles.detailCol}>
                                        <span>{t.profile_issue_date}</span>
                                        <strong>{ticketDetails?.issueDate || new Date().toLocaleDateString('id-ID')}</strong>
                                    </div>
                                </div>
                                <hr style={{ border: 'none', borderTop: '1px dashed #ccc' }} />
                                <div className={styles.detailCol}>
                                    <span>{t.profile_service}</span>
                                    <strong style={{ fontSize: '1.1rem' }}>{selectedTicket.displayName}</strong>
                                </div>
                                <div className={styles.ticketInfoGrid}>
                                    <div className={styles.detailCol}>
                                        <span>{selectedTicket.itemType === 'hotel_room' ? t.profile_checkin : t.profile_departure}</span>
                                        <strong>{selectedTicket.checkInDate}</strong>
                                    </div>
                                    <div className={styles.detailCol}>
                                        <span>{selectedTicket.itemType === 'hotel_room' ? t.profile_checkout : t.profile_arrival}</span>
                                        <strong>{selectedTicket.checkOutDate}</strong>
                                    </div>
                                </div>
                                <hr style={{ border: 'none', borderTop: '1px dashed #ccc' }} />
                                <div className={styles.ticketQRBlock}>
                                    <span className={styles.qrBox}>📱</span>
                                    <span>{t.profile_show_qr_code}</span>
                                    <span className={styles.refCode}>{selectedTicket.bookingReferenceCode}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {activeReviewBooking && (
                <ReviewSubmissionModal
                    isOpen={activeReviewBooking !== null}
                    onClose={() => setActiveReviewBooking(null)}
                    hotelId={activeReviewBooking.hotelId || ''}
                    bookingId={activeReviewBooking.bookingId}
                    hotelName={activeReviewBooking.displayName}
                    onSuccess={() => {
                        setActiveReviewBooking(null);
                        fetchBookings();
                    }}
                />
            )}
            <LogoutConfirmationModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogoutConfirm}
            />
        </div>
    );
};
export default ProfilePage;