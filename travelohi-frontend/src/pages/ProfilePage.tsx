import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AccountServiceClient } from '../proto/travelohi/v1/account/account.client';
import { AuthServiceClient } from '../proto/travelohi/v1/auth/auth.client';
import { transport } from '../utils/grpcClient';
import ProfileForm from '../components/ProfileForm';
import CreditCardManager from '../components/CreditCardManager';
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
}
const ProfilePage: React.FC = () => {
    const { userId, logout, updateProfilePicture } = useAuth();
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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // e-ticket modal state
    const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);
    const [ticketDetails, setTicketDetails] = useState<any>(null);
    const [isTicketLoading, setIsTicketLoading] = useState(false);
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
    useEffect(() => {
        const fetchBookings = async () => {
            if (!userId || activeTab !== 'bookings') return;
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
                    bookingReferenceCode: b.bookingReferenceCode
                }));
                setBookings(mappedBookings);
            } catch (err: any) {
                setError(err.message || "Gagal memuat riwayat pesanan.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchBookings();
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
    const handleLogout = async () => {
        if (!userId) return;
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
        return <div className={styles.loadingSpinner}>Memuat data profil...</div>;
    }
    return (
        <div className={styles.profileContainer}>
            <aside className={styles.sidebar}>
                <div className={styles.userInfoMini}>
                    <img
                        src={profileData?.profilePictureUrl || '/assets/default-avatar.png'}
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
                        Data Pribadi
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'bookings' ? styles.active : ''}`}
                        onClick={() => setActiveTab('bookings')}
                    >
                        Pesanan Saya
                    </button>
                    <button className={styles.navItem} onClick={handleLogout}>Keluar dari akun</button>
                </nav>
            </aside>
            <main className={styles.mainContent}>
                {activeTab === 'profile' ? (
                    <>
                        <h2>Pengaturan Akun</h2>
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
                        <h2>Pesanan Saya</h2>
                        {error && <div className={styles.errorBox}>{error}</div>}
                        {bookings.length === 0 ? (
                            <div className={styles.emptyBookings}>
                                <p>Anda belum memiliki riwayat pemesanan.</p>
                                <button onClick={() => navigate('/')}>Pesan Hotel & Penerbangan</button>
                            </div>
                        ) : (
                            <div className={styles.bookingsList}>
                                {bookings.map((booking) => (
                                    <div key={booking.bookingId} className={styles.bookingCard}>
                                        <div className={styles.bookingHeader}>
                                            <span className={styles.itemBadge}>
                                                {booking.itemType === 'hotel_room' ? '🏨 Hotel' : '✈ Penerbangan'}
                                            </span>
                                            <span className={`${styles.statusBadge} ${styles.paid}`}>
                                                {booking.status || 'Aktif'}
                                            </span>
                                        </div>
                                        <h3 className={styles.bookingTitle}>{booking.displayName}</h3>
                                        <div className={styles.bookingDetails}>
                                            <div className={styles.detailCol}>
                                                <span>{booking.itemType === 'hotel_room' ? 'Tanggal Check-In' : 'Waktu Keberangkatan'}</span>
                                                <strong>{booking.checkInDate || '-'}</strong>
                                            </div>
                                            <div className={styles.detailCol}>
                                                <span>{booking.itemType === 'hotel_room' ? 'Tanggal Check-Out' : 'Waktu Kedatangan'}</span>
                                                <strong>{booking.checkOutDate || '-'}</strong>
                                            </div>
                                            <div className={styles.detailCol}>
                                                <span>Kode Booking</span>
                                                <strong style={{ color: '#0b5b9c' }}>{booking.bookingReferenceCode}</strong>
                                            </div>
                                        </div>
                                        <button
                                            className={styles.ticketBtn}
                                            onClick={() => handleViewETicket(booking)}
                                        >
                                            Lihat E-Tiket / Voucher
                                        </button>
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
                            <h3>{selectedTicket.itemType === 'hotel_room' ? 'Voucer Hotel' : 'Boarding Pass'}</h3>
                            <button className={styles.closeBtn} onClick={() => setSelectedTicket(null)}>×</button>
                        </div>
                        {isTicketLoading ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}>Memuat tiket...</div>
                        ) : (
                            <div className={styles.ticketBody}>
                                <div className={styles.ticketInfoGrid}>
                                    <div className={styles.detailCol}>
                                        <span>Nama Tamu/Penumpang</span>
                                        <strong>{ticketDetails?.passengerOrGuestName || (profileData?.firstName + ' ' + profileData?.lastName)}</strong>
                                    </div>
                                    <div className={styles.detailCol}>
                                        <span>Tanggal Penerbitan</span>
                                        <strong>{ticketDetails?.issueDate || new Date().toLocaleDateString('id-ID')}</strong>
                                    </div>
                                </div>
                                <hr style={{ border: 'none', borderTop: '1px dashed #ccc' }} />
                                <div className={styles.detailCol}>
                                    <span>Layanan</span>
                                    <strong style={{ fontSize: '1.1rem' }}>{selectedTicket.displayName}</strong>
                                </div>
                                <div className={styles.ticketInfoGrid}>
                                    <div className={styles.detailCol}>
                                        <span>{selectedTicket.itemType === 'hotel_room' ? 'Check-In' : 'Keberangkatan'}</span>
                                        <strong>{selectedTicket.checkInDate}</strong>
                                    </div>
                                    <div className={styles.detailCol}>
                                        <span>{selectedTicket.itemType === 'hotel_room' ? 'Check-Out' : 'Kedatangan'}</span>
                                        <strong>{selectedTicket.checkOutDate}</strong>
                                    </div>
                                </div>
                                <hr style={{ border: 'none', borderTop: '1px dashed #ccc' }} />
                                <div className={styles.ticketQRBlock}>
                                    <span className={styles.qrBox}>📱</span>
                                    <span>Tunjukkan QR Code ini kepada petugas</span>
                                    <span className={styles.refCode}>{selectedTicket.bookingReferenceCode}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default ProfilePage;