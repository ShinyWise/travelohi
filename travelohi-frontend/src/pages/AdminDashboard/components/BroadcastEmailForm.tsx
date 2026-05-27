import React, { useState } from 'react';
import { AdminServiceClient } from '../../../proto/travelohi/v1/admin/admin.client';
import { transport } from '../../../utils/grpcClient';
import styles from './BroadcastEmailForm.module.scss';

const adminClient = new AdminServiceClient(transport);

const BroadcastEmailForm: React.FC = () => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setToast(null);

        try {
            const { response } = await adminClient.sendBroadcast({ subject, body });

            if (response.success) {
                setToast({ type: 'success', msg: `Email Broadcast "${subject}" sedang diproses untuk dikirim ke seluruh pelanggan!` });
                setSubject(''); setBody('');
            } else {
                setToast({ type: 'error', msg: response.message || 'Gagal mengirim broadcast email.' });
            }
        } catch (error: any) {
            setToast({ type: 'error', msg: error.message || 'Terjadi kesalahan sistem.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.broadcastContainer}>
            <div className={styles.headerBox}>
                <h3>Kirim Broadcast Email</h3>
                <p>Gunakan form ini untuk mengirimkan newsletter, promo, atau pengumuman massal ke seluruh pengguna TraveloHI yang telah mensubscribe newsletter.</p>
            </div>

            <form className={styles.emailForm} onSubmit={handleSubmit}>
                {toast && (
                    <div className={`${styles.toast} ${toast.type === 'success' ? styles.success : styles.error}`}>
                        {toast.msg}
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <label>Subjek Email</label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                        placeholder="e.g. Promo Musim Panas TraveloHI - Diskon Hingga 50%!"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>Isi Pesan (Standard Text)</label>
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        required
                        rows={5}
                        placeholder="Ketik isi pesan broadcast di sini..."
                    />
                </div>

                <div className={styles.formActions}>
                    <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                        {isSubmitting ? 'Mengirim Broadcast...' : 'Kirim Sekarang'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BroadcastEmailForm;