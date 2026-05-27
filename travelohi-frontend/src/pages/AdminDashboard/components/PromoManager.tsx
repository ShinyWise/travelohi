import React, { useEffect, useState, useRef } from 'react';
import { AdminServiceClient } from '../../../proto/travelohi/v1/admin/admin.client';
import { transport } from '../../../utils/grpcClient';
import styles from './PromoManager.module.scss';

const adminClient = new AdminServiceClient(transport);

interface PromoRecord {
    id: string;
    code: string;
    discountAmount: number;
    isActive: boolean;
}

const PromoManager: React.FC = () => {
    // form state
    const [code, setCode] = useState('');
    const [discountAmount, setDiscountAmount] = useState('');

    // list state
    const [promos, setPromos] = useState<PromoRecord[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const previousPromosRef = useRef<PromoRecord[]>([]);

    const fetchPromos = async () => {
        try {
            const { response } = await adminClient.getAllPromos({});
            const mapped: PromoRecord[] = (response.promos || []).map(p => ({
                id: p.id,
                code: p.promoCode,
                discountAmount: Number(p.discountAmount),
                isActive: p.isActive
            }));
            setPromos(mapped);
        } catch (err: any) {
            console.error("Failed to fetch promos:", err);
            setToast({ type: 'error', msg: 'Gagal memuat daftar promo dari server.' });
        }
    };

    useEffect(() => {
        fetchPromos();
    }, []);

    const handleCreatePromo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setToast(null);

        try {
            const promoCode = code.toUpperCase().trim();
            const { response } = await adminClient.createPromo({
                promoCode: promoCode,
                discountAmount: BigInt(discountAmount || '0')
            });

            if (response.success) {
                setToast({ type: 'success', msg: `Promo ${promoCode} berhasil dibuat!` });
                setCode('');
                setDiscountAmount('');
                await fetchPromos();
            } else {
                setToast({ type: 'error', msg: response.message || 'Gagal membuat promo.' });
            }
        } catch (err: any) {
            setToast({ type: 'error', msg: err.message || 'Terjadi kesalahan sistem.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (promoId: string, currentStatus: boolean) => {
        previousPromosRef.current = [...promos];

        // optimistic ui
        const updated = promos.map(p => p.id === promoId ? { ...p, isActive: !currentStatus } : p);
        setPromos(updated);

        try {
            const { response } = await adminClient.togglePromoStatus({ promoId, isActive: !currentStatus });
            if (!response.success) {
                throw new Error(response.message || 'Gagal mengubah status promo');
            }
        } catch (err: any) {
            console.warn("Could not toggle promo on backend:", err);
            setPromos(previousPromosRef.current);
            setToast({ type: 'error', msg: err.message || 'Gagal mengubah status promo di server.' });
        }
    };

    return (
        <div className={styles.managerContainer}>
            <div className={styles.formCard}>
                <h3>Buat Promo Baru</h3>

                {toast && (
                    <div className={`${styles.toast} ${toast.type === 'success' ? styles.success : styles.error}`}>
                        {toast.msg}
                    </div>
                )}

                <form onSubmit={handleCreatePromo} className={styles.formGrid}>
                    <div className={styles.inputGroup}>
                        <label>Kode Promo</label>
                        <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="e.g. SUMMER26" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Nilai Diskon (IDR)</label>
                        <input type="number" min="0" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} required placeholder="e.g. 50000" />
                    </div>
                    <div className={styles.actionGroup}>
                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Membuat...' : '+ Tambah Promo'}
                        </button>
                    </div>
                </form>
            </div>

            <div className={styles.listCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-color)', marginBottom: '20px', paddingBottom: '15px' }}>
                    <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Daftar Kode Promo</h3>
                </div>
                <table className={styles.promoTable}>
                    <thead>
                        <tr>
                            <th>Kode Promo</th>
                            <th>Potongan (IDR)</th>
                            <th className={styles.centerCol}>Status</th>
                            <th className={styles.centerCol}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {promos.length === 0 ? (
                            <tr><td colSpan={4} className={styles.emptyText}>Belum ada promo terdaftar.</td></tr>
                        ) : (
                            promos.map(promo => (
                                <tr key={promo.id}>
                                    <td><strong>{promo.code}</strong></td>
                                    <td>Rp {promo.discountAmount.toLocaleString('id-ID')}</td>
                                    <td className={styles.centerCol}>
                                        <span className={`${styles.badge} ${promo.isActive ? styles.active : styles.inactive}`}>
                                            {promo.isActive ? 'Aktif' : 'Non-Aktif'}
                                        </span>
                                    </td>
                                    <td className={styles.centerCol}>
                                        <button
                                            className={styles.toggleBtn}
                                            onClick={() => handleToggleStatus(promo.id, promo.isActive)}
                                        >
                                            {promo.isActive ? 'Matikan' : 'Aktifkan'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PromoManager;