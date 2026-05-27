import React, { useState } from 'react';
import { AdminServiceClient } from '../../../proto/travelohi/v1/admin/admin.client';
import { transport } from '../../../utils/grpcClient';
import { formatCurrency } from '../../../utils/currencyFormatter';
import styles from './AdminForms.module.scss';

const adminClient = new AdminServiceClient(transport);

const COMMON_FACILITIES = [
    { id: 'wifi', label: 'WiFi Gratis', value: 'WiFi Gratis' },
    { id: 'pool', label: 'Kolam Renang', value: 'Kolam Renang' },
    { id: 'gym', label: 'Pusat Kebugaran (Gym)', value: 'Pusat Kebugaran' },
    { id: 'restaurant', label: 'Restoran', value: 'Restoran' },
    { id: 'parking', label: 'Parkir Gratis', value: 'Parkir Gratis' },
    { id: 'receptionist', label: 'Resepsionis 24 Jam', value: 'Resepsionis 24 Jam' },
    { id: 'ac', label: 'AC', value: 'AC' },
    { id: 'spa', label: 'Spa', value: 'Spa' }
];

const InsertHotelForm: React.FC = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [startingPrice, setStartingPrice] = useState('');

    //dynamic arr
    const [pictureUrls, setPictureUrls] = useState<string[]>(['']);

    // Facilities states
    const [checkedFacilities, setCheckedFacilities] = useState<string[]>([]);
    const [customFacilities, setCustomFacilities] = useState<string[]>([]);
    const [newCustomFacility, setNewCustomFacility] = useState('');

    // ui state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    // dynamic ar handler
    const handleArrayChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
        setter(prev => {
            const updated = [...prev];
            updated[index] = value;
            return updated;
        });
    };

    const addArrayField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setter(prev => [...prev, '']);
    };

    const removeArrayField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
        setter(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setToast(null);

        try {
            // difilter dlu
            const cleanUrls = pictureUrls.filter(url => url.trim() !== '');
            const cleanFacilities = [...checkedFacilities, ...customFacilities.filter(fac => fac.trim() !== '')];

            const { response } = await adminClient.insertHotel({
                name,
                description,
                address,
                startingPrice: BigInt(startingPrice || '0'),
                pictureUrls: cleanUrls,
                facilities: cleanFacilities
            });

            if (response.success) {
                setToast({ type: 'success', msg: `Hotel "${name}" berhasil ditambahkan ke dalam sistem!` });
                // reset 
                setName(''); setDescription(''); setAddress(''); setStartingPrice('');
                setPictureUrls(['']);
                setCheckedFacilities([]);
                setCustomFacilities([]);
                setNewCustomFacility('');
            } else {
                setToast({ type: 'error', msg: response.message || 'Gagal menambahkan hotel.' });
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
                <label>Nama Hotel</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. The Ritz-Carlton Bali" />
            </div>

            <div className={styles.inputGroup}>
                <label>Alamat Lengkap</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={2} />
            </div>

            <div className={styles.inputGroup}>
                <label>Deskripsi Hotel</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} />
            </div>

            <div className={styles.inputGroup}>
                <label>Harga Mulai Dari (IDR)</label>
                <input type="number" min="0" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} required placeholder="e.g. 1500000" />
                {startingPrice && !isNaN(Number(startingPrice)) && (
                    <span className={styles.pricePreview}>
                        Pratinjau: {formatCurrency(BigInt(startingPrice), 'IDR')}
                    </span>
                )}
            </div>

            <div className={styles.dynamicGroup}>
                <label>Galeri Foto Hotel</label>
                <div className={styles.imageGrid}>
                    {pictureUrls.map((url, idx) => (
                        <div key={idx} className={styles.imageInputCard}>
                            <div className={styles.previewContainer}>
                                {url.trim().startsWith('http') ? (
                                    <img
                                        src={url}
                                        alt={`Preview ${idx + 1}`}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23e74c3c"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/%3E%3C/svg%3E';
                                        }}
                                    />
                                ) : (
                                    <div className={styles.emptyPreview}>Tidak ada pratinjau</div>
                                )}
                            </div>
                            <div className={styles.imageInputRow}>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => handleArrayChange(setPictureUrls, idx, e.target.value)}
                                    placeholder="https://..."
                                    required={idx === 0}
                                />
                                {pictureUrls.length > 1 && (
                                    <button type="button" className={styles.removeCardBtn} onClick={() => removeArrayField(setPictureUrls, idx)}>Hapus</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <button type="button" className={styles.addBtn} onClick={() => addArrayField(setPictureUrls)}>+ Tambah URL Gambar</button>
            </div>

            <div className={styles.dynamicGroup}>
                <label>Fasilitas Utama (Pilih dari daftar)</label>
                <div className={styles.checkboxGrid}>
                    {COMMON_FACILITIES.map(facility => (
                        <label key={facility.id} className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={checkedFacilities.includes(facility.value)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setCheckedFacilities(prev => [...prev, facility.value]);
                                    } else {
                                        setCheckedFacilities(prev => prev.filter(v => v !== facility.value));
                                    }
                                }}
                            />
                            <span>{facility.label}</span>
                        </label>
                    ))}
                </div>

                <div className={styles.customFacilitiesSection}>
                    <label className={styles.subLabel}>Fasilitas Tambahan (Kustom)</label>
                    <div className={styles.customTagInputRow}>
                        <input
                            type="text"
                            value={newCustomFacility}
                            onChange={(e) => setNewCustomFacility(e.target.value)}
                            placeholder="e.g. Ramah Hewan Peliharaan"
                        />
                        <button
                            type="button"
                            className={styles.addTagBtn}
                            onClick={() => {
                                const trimmed = newCustomFacility.trim();
                                if (trimmed && !customFacilities.includes(trimmed) && !checkedFacilities.includes(trimmed)) {
                                    setCustomFacilities(prev => [...prev, trimmed]);
                                    setNewCustomFacility('');
                                }
                            }}
                        >
                            Tambah
                        </button>
                    </div>
                    <div className={styles.tagsContainer}>
                        {customFacilities.map((fac, idx) => (
                            <span key={idx} className={styles.tagBadge}>
                                {fac}
                                <button
                                    type="button"
                                    className={styles.removeTagBtn}
                                    onClick={() => setCustomFacilities(prev => prev.filter((_, i) => i !== idx))}
                                >
                                    &times;
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.formActions}>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Hotel Baru'}
                </button>
            </div>
        </form>
    );
};

export default InsertHotelForm;