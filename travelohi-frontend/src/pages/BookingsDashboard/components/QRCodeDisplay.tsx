import React from 'react';
import styles from './QRCodeDisplay.module.scss';

interface Props {
    qrCodeUrl?: string;
    ticketId: string;
}

const QRCodeDisplay: React.FC<Props> = ({ qrCodeUrl, ticketId }) => {
    return (
        <div className={styles.qrContainer}>
            {qrCodeUrl ? (
                <img src={qrCodeUrl} alt={`QR Code for Ticket ${ticketId}`} className={styles.qrImage} />
            ) : (
                <div className={styles.qrPlaceholder}>
                    <span>Scan QR</span>
                </div>
            )}
            <span className={styles.ticketId}>ID: {ticketId}</span>
        </div>
    );
};

export default QRCodeDisplay;
