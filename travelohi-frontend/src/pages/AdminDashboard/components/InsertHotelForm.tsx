import React, { useState, useRef, useEffect } from 'react';
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

    const MAX_SLOTS = 4;
    const [imageSlots, setImageSlots] = useState<({ file: File; previewUrl: string; bytes: Uint8Array } | null)[]>(
        Array(4).fill(null)
    );
    const activeUrlsRef = useRef<string[]>([]);
    const slotInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

    // Facilities states
    const [checkedFacilities, setCheckedFacilities] = useState<string[]>([]);
    const [customFacilities, setCustomFacilities] = useState<string[]>([]);
    const [newCustomFacility, setNewCustomFacility] = useState('');

    // ui state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    useEffect(() => {
        return () => {
            activeUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const handleSlotFileChange = async (slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxBytes = 2097152; // 2MB
        if (file.size > maxBytes) {
            setToast({ type: 'error', msg: `Gambar slot ${slotIndex + 1} melebihi batas 2MB.` });
            e.target.value = '';
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            const previewUrl = URL.createObjectURL(file);
            activeUrlsRef.current.push(previewUrl);

            setImageSlots(prev => {
                const updated = [...prev];
                if (updated[slotIndex]?.previewUrl) {
                    URL.revokeObjectURL(updated[slotIndex]!.previewUrl);
                    activeUrlsRef.current = activeUrlsRef.current.filter(u => u !== updated[slotIndex]!.previewUrl);
                }
                updated[slotIndex] = { file, previewUrl, bytes };
                return updated;
            });
            setToast(null);
        } catch (err) {
            setToast({ type: 'error', msg: 'Gagal membaca berkas gambar.' });
        }
        e.target.value = '';
    };

    const removeSlot = (slotIndex: number) => {
        setImageSlots(prev => {
            const updated = [...prev];
            if (updated[slotIndex]?.previewUrl) {
                URL.revokeObjectURL(updated[slotIndex]!.previewUrl);
                activeUrlsRef.current = activeUrlsRef.current.filter(u => u !== updated[slotIndex]!.previewUrl);
            }
            updated[slotIndex] = null;
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setToast(null);

        try {
            const cleanFacilities = [...checkedFacilities, ...customFacilities.filter(fac => fac.trim() !== '')];
            const rawPictures = imageSlots.filter(Boolean).map(slot => slot!.bytes);

            if (rawPictures.length === 0) {
                setToast({ type: 'error', msg: 'Harap unggah minimal 1 foto hotel.' });
                setIsSubmitting(false);
                return;
            }

            const { response } = await adminClient.insertHotel({
                name,
                description,
                address,
                startingPrice: BigInt(startingPrice || '0'),
                pictures: rawPictures,
                facilities: cleanFacilities
            });

            if (response.success) {
                setToast({ type: 'success', msg: `Hotel "${name}" berhasil ditambahkan ke dalam sistem!` });
                setName(''); setDescription(''); setAddress(''); setStartingPrice('');
                activeUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
                activeUrlsRef.current = [];
                setImageSlots(Array(MAX_SLOTS).fill(null));
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
                <label>Galeri Foto Hotel <span className={styles.slotHint}>(Maks. 4 foto — sesuai tampilan thumbnail)</span></label>
                <div className={styles.imageSlotGrid}>
                    {imageSlots.map((slot, idx) => (
                        <div key={idx} className={styles.imageSlotCard}>
                            <input
                                ref={el => { slotInputRefs.current[idx] = el; }}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleSlotFileChange(idx, e)}
                            />
                            {slot ? (
                                <>
                                    <div
                                        className={styles.slotPreview}
                                        onClick={() => slotInputRefs.current[idx]?.click()}
                                        title="Klik untuk ganti foto"
                                    >
                                        <img src={slot.previewUrl} alt={`Foto ${idx + 1}`} />
                                        <div className={styles.slotOverlay}>
                                            <span>🔄 Ganti</span>
                                        </div>
                                    </div>
                                    <div className={styles.slotFooter}>
                                        <span className={styles.slotLabel}>Foto {idx + 1}</span>
                                        <button
                                            type="button"
                                            className={styles.removeCardBtn}
                                            onClick={() => removeSlot(idx)}
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div
                                    className={styles.slotEmpty}
                                    onClick={() => slotInputRefs.current[idx]?.click()}
                                >
                                    <span className={styles.slotPlusIcon}>＋</span>
                                    <span className={styles.slotEmptyLabel}>Foto {idx + 1}</span>
                                    <span className={styles.slotEmptyHint}>Klik untuk unggah</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <p className={styles.galleryNote}>Foto akan ditampilkan sebagai galeri 1 besar + 4 thumbnail di halaman detail hotel.</p>
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