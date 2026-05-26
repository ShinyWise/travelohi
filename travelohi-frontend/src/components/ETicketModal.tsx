import React, { useEffect, useState } from 'react';
import QRCodeDisplay from './QRCodeDisplay';
import { AccountServiceClient } from '../proto/travelohi/v1/account/account.client';
import { transport } from '../utils/grpcClient';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import styles from './ETicketModal.module.scss';

const accountClient = new AccountServiceClient(transport);

interface Props {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string | null;
}

const ETicketModal: React.FC<Props> = ({ isOpen, onClose, bookingId }) => {
    const { userId } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];

    const [ticketData, setTicketData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !bookingId || !userId) return;

        const fetchETicket = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { response } = await accountClient.getETicket({ 
                    userId, 
                    bookingId 
                });
                setTicketData(response);
            } catch (err: any) {
                setError(err.message || t.tickets_error_eticket);
            } finally {
                setIsLoading(false);
            }
        };

        fetchETicket();
    }, [isOpen, bookingId, userId, t.tickets_error_eticket]);

    if (!isOpen) return null;

    // Generate real QR code image URL using QR code API
    const qrCodeUrl = ticketData?.qrCodeData
        ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticketData.qrCodeData)}`
        : undefined;

    const bookingDetails = ticketData?.bookingDetails;

    return (
        <div className={styles.overlay}>
            <div className={styles.modalContent}>
                <div className={styles.header}>
                    <h3>{t.tickets_digital_eticket}</h3>
                    <button onClick={onClose} className={styles.closeBtn}>✕</button>
                </div>

                {isLoading ? (
                    <div className={styles.loadingState}>{t.tickets_downloading}</div>
                ) : error ? (
                    <div className={styles.errorState}>{error}</div>
                ) : ticketData && bookingDetails ? (
                    <div className={styles.ticketBody}>
                        <div className={styles.qrSection}>
                            <QRCodeDisplay 
                                qrCodeUrl={qrCodeUrl} 
                                ticketId={bookingDetails.bookingReferenceCode} 
                            />
                        </div>

                        <div className={styles.detailsSection}>
                            <h4>{bookingDetails.displayName}</h4>
                            <p className={styles.subtitle}>
                                {bookingDetails.itemType === 'hotel_room' ? t.profile_hotel_voucher : t.profile_boarding_pass}
                            </p>

                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <label>{t.profile_guest_passenger_name}</label>
                                    <span>{ticketData.passengerOrGuestName}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>{t.tickets_date}</label>
                                    <span>{bookingDetails.checkInDate} - {bookingDetails.checkOutDate}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>{t.tickets_status_payment}</label>
                                    <span className={styles.statusBadge}>{t.tickets_status_paid}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ETicketModal;