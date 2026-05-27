import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import InsertHotelForm from './components/InsertHotelForm';
import InsertAirlineForm from './components/InsertAirlineForm';
import PromoManager from './components/PromoManager';
import UserManagerTable from './components/UserManagerTable';
import BroadcastEmailForm from './components/BroadcastEmailForm';
import { Hotel, Plane, Ticket, Users, Megaphone } from 'lucide-react';
import styles from './AdminDashboard.module.scss';

type AdminTab = 'hotel' | 'airline' | 'promo' | 'users' | 'broadcast';

const AdminDashboard: React.FC = () => {
    const { isAuthenticated, isLoading, isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<AdminTab>(() => {
        const saved = localStorage.getItem('admin_active_tab') as AdminTab | null;
        const allowedTabs: AdminTab[] = ['hotel', 'airline', 'promo', 'users', 'broadcast'];
        return saved && allowedTabs.includes(saved) ? saved : 'hotel';
    });

    const changeTab = (tab: AdminTab) => {
        setActiveTab(tab);
        localStorage.setItem('admin_active_tab', tab);
    };

    if (isLoading) {
        return (
            <div className={styles.adminContainer}>
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h3>Admin Panel</h3>
                        <span className={styles.badge} style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Loading...</span>
                    </div>
                    <nav className={styles.navMenu}>
                        <div className={styles.navItemLoading} />
                        <div className={styles.navItemLoading} />
                        <div className={styles.navItemLoading} />
                        <div className={styles.navItemLoading} />
                        <div className={styles.navItemLoading} />
                    </nav>
                </aside>

                <main className={styles.mainContent}>
                    <div className={styles.contentHeader}>
                        <div className={styles.headerLoading} />
                    </div>
                    <div className={styles.formWrapper}>
                        <div className={styles.skeletonBody}>
                            <div className={styles.skeletonLine} style={{ width: '40%', height: '24px' }} />
                            <div className={styles.skeletonLine} style={{ width: '100%', height: '120px' }} />
                            <div className={styles.skeletonLine} style={{ width: '60%', height: '24px' }} />
                            <div className={styles.skeletonLine} style={{ width: '100%', height: '250px' }} />
                        </div>
                    </div>
                </main>
            </div>
        );
    }
    if (!isAuthenticated || !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className={styles.adminContainer}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h3>Admin Panel</h3>
                    <span className={styles.badge}>Restricted Access</span>
                </div>
                <nav className={styles.navMenu}>
                    <button
                        className={`${styles.navItem} ${activeTab === 'hotel' ? styles.active : ''}`}
                        onClick={() => changeTab('hotel')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Hotel size={18} />
                        <span>Manajemen Hotel</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'airline' ? styles.active : ''}`}
                        onClick={() => changeTab('airline')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Plane size={18} />
                        <span>Manajemen Maskapai</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'promo' ? styles.active : ''}`}
                        onClick={() => changeTab('promo')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Ticket size={18} />
                        <span>Manajemen Promo</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'users' ? styles.active : ''}`}
                        onClick={() => changeTab('users')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Users size={18} />
                        <span>Manajemen Pengguna</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'broadcast' ? styles.active : ''}`}
                        onClick={() => changeTab('broadcast')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Megaphone size={18} />
                        <span>Broadcast Email</span>
                    </button>
                </nav>
            </aside>

            <main className={styles.mainContent}>
                <div className={styles.contentHeader}>
                    <h2>
                        {activeTab === 'hotel' && 'Tambah Inventaris Hotel'}
                        {activeTab === 'airline' && 'Tambah Inventaris Maskapai'}
                        {activeTab === 'promo' && 'Manajemen Promo'}
                        {activeTab === 'users' && 'Daftar Pengguna'}
                        {activeTab === 'broadcast' && 'Kirim Broadcast Email'}
                    </h2>
                </div>

                <div className={styles.formWrapper}>
                    {activeTab === 'hotel' && <InsertHotelForm />}
                    {activeTab === 'airline' && <InsertAirlineForm />}
                    {activeTab === 'promo' && <PromoManager />}
                    {activeTab === 'users' && <UserManagerTable />}
                    {activeTab === 'broadcast' && <BroadcastEmailForm />}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;