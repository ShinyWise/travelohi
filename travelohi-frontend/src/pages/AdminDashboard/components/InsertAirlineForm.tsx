import React, { useState } from 'react';
import { AdminServiceClient } from '../../../proto/travelohi/v1/admin/admin.client';
import { transport } from '../../../utils/grpcClient';
import styles from './AdminForms.module.scss';

const adminClient = new AdminServiceClient(transport);

const InsertAirlineForm: React.FC = () => {
    const [name, setName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setToast(null);

        try {
            const { response } = await adminClient.insertAirline({
                name,
                logoUrl
            });

            if (response.success) {
                setToast({ type: 'success', msg: `Maskapai "${name}" berhasil ditambahkan!` });
                setName(''); setLogoUrl('');
            } else {
                setToast({ type: 'error', msg: response.message || 'Gagal menambahkan maskapai.' });
            }
        } catch (error: any) {
            setToast({ type: 'error', msg: error.message || 'Terjadi kesalahan sistem.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className={styles.adminForm} onSubmit={handleSubmit}>
            {toast && (
                <div className={`${styles.toast} ${toast.type === 'success' ? styles.success : styles.error}`}>
                    {toast.msg}
                </div>
            )}

            <div className={styles.inputGroup}>
                <label>Nama Maskapai</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Garuda Indonesia" />
            </div>



            <div className={styles.inputGroup}>
                <label>URL Logo Maskapai</label>
                <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} required placeholder="https://..." />
            </div>

            <div className={styles.formActions}>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Maskapai Baru'}
                </button>
            </div>
        </form>
    );
};

export default InsertAirlineForm;