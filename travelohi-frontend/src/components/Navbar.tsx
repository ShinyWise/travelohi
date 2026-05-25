import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AccountServiceClient } from '../proto/travelohi/v1/account/account.client';
import { AuthServiceClient } from '../proto/travelohi/v1/auth/auth.client';
import { transport } from '../utils/grpcClient';
import { translations } from '../utils/translations';
import { formatCurrency } from '../utils/currencyFormatter';
import SearchInput from './SearchInput';
import styles from './Navbar.module.scss';

const Navbar: React.FC = () => {
    const { theme, toggleTheme, currency, setCurrency, language, setLanguage } = useAppContext();
    const { isAuthenticated, userId, logout, profilePictureUrl } = useAuth();
    const navigate = useNavigate();
    const t = translations[language];

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const [isCurrDropdownOpen, setIsCurrDropdownOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
    const [ongoingCount, setOngoingCount] = useState<number>(0);
    const [profileInfo, setProfileInfo] = useState<{ firstName: string; hiWalletBalance?: bigint } | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const currDropdownRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const paymentDropdownRef = useRef<HTMLDivElement>(null);

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsLangDropdownOpen(false);
            }
            if (currDropdownRef.current && !currDropdownRef.current.contains(event.target as Node)) {
                setIsCurrDropdownOpen(false);
            }
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setIsUserDropdownOpen(false);
            }
            if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target as Node)) {
                setIsPaymentDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchProfileAndOngoingBookings = async () => {
            if (!userId) return;
            try {
                const client = new AccountServiceClient(transport);
                const { response } = await client.getProfile({ userId });
                if (response.profile) {
                    setProfileInfo({
                        firstName: response.profile.firstName,
                        hiWalletBalance: response.profile.hiWalletBalance
                    });
                }

                const { response: bookingRes } = await client.getBookingHistory({
                    userId,
                    filterStatus: 'ongoing',
                    limit: 100,
                    offset: 0
                });
                if (bookingRes.bookings) {
                    setOngoingCount(bookingRes.bookings.length);
                }
            } catch (err) {
                console.warn("Failed to fetch profile or bookings in Navbar", err);
            }
        };

        if (isAuthenticated) {
            fetchProfileAndOngoingBookings();
        } else {
            setProfileInfo(null);
            setOngoingCount(0);
        }
    }, [isAuthenticated, userId]);

    const handleLanguageSelect = (lang: 'ID' | 'EN') => {
        setLanguage(lang);
        setIsLangDropdownOpen(false);
    };

    const handleCurrencySelect = (curr: 'IDR' | 'USD') => {
        setCurrency(curr);
        setIsCurrDropdownOpen(false);
    };

    const handleLogout = async () => {
        setIsUserDropdownOpen(false);
        if (userId) {
            try {
                const authClient = new AuthServiceClient(transport);
                await authClient.logout({ userId });
            } catch (err) {
                console.warn("Server logout failed, clearing local session anyway.", err);
            }
        }
        logout();
        navigate('/login', { replace: true });
    };

    const currentFlag = language === 'ID'
        ? 'https://hatscripts.github.io/circle-flags/flags/id.svg'
        : 'https://hatscripts.github.io/circle-flags/flags/gb.svg';

    return (
        <header className={styles.navbar}>
            <div className={styles.navContainer}>
                <div className={styles.logo} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <h2>TraveloHI</h2>
                </div>

                <SearchInput />

                <button className={styles.hamburger} onClick={toggleMenu} aria-label="Toggle Menu">
                    <span className={styles.bar}></span>
                    <span className={styles.bar}></span>
                    <span className={styles.bar}></span>
                </button>

                <nav className={`${styles.navLinks} ${isMobileMenuOpen ? styles.active : ''}`}>
                    <div className={styles.navItems}>
                        <button onClick={toggleTheme} className={`${styles.themeToggle} ${styles[theme]}`} aria-label="Toggle Theme">
                            {theme === 'light' ? (
                                <img src="/dark-mode-night-moon-svgrepo-com.svg" alt="Dark Mode" className={styles.themeIcon} />
                            ) : (
                                <img src="/light-mode-svgrepo-com.svg" alt="Light Mode" className={styles.themeIcon} />
                            )}
                        </button>

                        {isAuthenticated && (
                            <>
                                <span
                                    className={styles.navItemText}
                                    onClick={() => navigate('/profile', { state: { activeTab: 'bookings' } })}
                                >
                                    {t.my_orders} {ongoingCount > 0 && <span className={styles.badge}>{ongoingCount}</span>}
                                </span>
                                <span className={styles.navItemText} onClick={() => navigate('/cart')}>
                                    🛒 {t.cart}
                                </span>
                            </>
                        )}

                        <div className={styles.preferencesGroup}>
                            <div className={styles.customDropdown} ref={paymentDropdownRef}>
                                <button
                                    className={styles.dropdownToggle}
                                    onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                                    aria-label="Select Payment Info"
                                >
                                    <span>💳 {t.payment}</span>
                                    <span className={styles.caret}>▼</span>
                                </button>

                                {isPaymentDropdownOpen && (
                                    <div className={`${styles.dropdownMenu} ${styles.paymentMenu}`}>
                                        <div className={styles.paymentHeader}>{t.payment_methods}</div>

                                        <div className={styles.paymentSection}>
                                            <div className={styles.sectionTitle}>{t.from_travelohi}</div>
                                            <div className={styles.paymentOption}>
                                                <span className={styles.paymentIcon}>👛</span>
                                                <div className={styles.paymentDetails}>
                                                    <span className={styles.optionName}>HI Wallet</span>
                                                    {isAuthenticated && profileInfo?.hiWalletBalance !== undefined ? (
                                                        <span className={styles.optionInfo}>
                                                            {t.wallet_balance}: {formatCurrency(profileInfo.hiWalletBalance, currency)}
                                                        </span>
                                                    ) : (
                                                        <span className={styles.optionInfo}>{t.login_to_see_balance}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.paymentOption}>
                                                <span className={styles.paymentIcon}>💳</span>
                                                <div className={styles.paymentDetails}>
                                                    <span className={styles.optionName}>Credit Card</span>
                                                    <span className={styles.optionInfo}>Visa, Mastercard, JCB</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.paymentSection}>
                                            <div className={styles.sectionTitle}>{t.other_methods}</div>
                                            <div className={styles.paymentOption}>
                                                <span className={styles.paymentIcon}>🏦</span>
                                                <div className={styles.paymentDetails}>
                                                    <span className={styles.optionName}>HI Debt</span>
                                                    <span className={styles.optionInfo}>Transfer Bank VA</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={styles.customDropdown} ref={dropdownRef}>
                                <button
                                    className={styles.dropdownToggle}
                                    onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                                    aria-label="Select Language"
                                >
                                    <img src={currentFlag} alt={`${language} Flag`} className={styles.flagIcon} />
                                    <span>{language}</span>
                                    <span className={styles.caret}>▼</span>
                                </button>

                                {isLangDropdownOpen && (
                                    <div className={styles.dropdownMenu}>
                                        <button onClick={() => handleLanguageSelect('ID')} className={styles.dropdownItem}>
                                            <img src="https://hatscripts.github.io/circle-flags/flags/id.svg" alt="ID Flag" className={styles.flagIcon} /> ID
                                        </button>
                                        <button onClick={() => handleLanguageSelect('EN')} className={styles.dropdownItem}>
                                            <img src="https://hatscripts.github.io/circle-flags/flags/gb.svg" alt="EN Flag" className={styles.flagIcon} /> EN
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className={styles.customDropdown} ref={currDropdownRef}>
                                <button
                                    className={styles.dropdownToggle}
                                    onClick={() => setIsCurrDropdownOpen(!isCurrDropdownOpen)}
                                    aria-label="Select Currency"
                                >
                                    <span>{currency}</span>
                                    <span className={styles.caret}>▼</span>
                                </button>

                                {isCurrDropdownOpen && (
                                    <div className={`${styles.dropdownMenu} ${styles.currencyMenu}`}>
                                        <button onClick={() => handleCurrencySelect('IDR')} className={`${styles.dropdownItem} ${styles.currencyItem}`}>
                                            IDR
                                        </button>
                                        <button onClick={() => handleCurrencySelect('USD')} className={`${styles.dropdownItem} ${styles.currencyItem}`}>
                                            USD
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isAuthenticated ? (
                            <div className={styles.customDropdown} ref={userDropdownRef}>
                                <button
                                    className={styles.userDropdownToggle}
                                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                    aria-label="User Menu"
                                >
                                    <img
                                        src={profilePictureUrl || '/assets/default-avatar.png'}
                                        alt="Avatar"
                                        className={styles.userAvatar}
                                    />
                                    <span className={styles.userName}>
                                        {profileInfo ? profileInfo.firstName : 'Memuat...'}
                                    </span>
                                    <span className={styles.caret}>▼</span>
                                </button>

                                {isUserDropdownOpen && (
                                    <div className={`${styles.dropdownMenu} ${styles.userMenu}`}>
                                        <button
                                            onClick={() => {
                                                setIsUserDropdownOpen(false);
                                                navigate('/profile');
                                            }}
                                            className={styles.dropdownItem}
                                        >
                                            {t.profile}
                                        </button>
                                        <button onClick={handleLogout} className={styles.dropdownItem}>
                                            {t.logout}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={styles.authButtons}>
                                <button className={styles.loginBtn} onClick={() => navigate('/login')}>{t.login}</button>
                                <button className={styles.registerBtn} onClick={() => navigate('/register')}>{t.register}</button>
                            </div>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    );
};

export default Navbar;