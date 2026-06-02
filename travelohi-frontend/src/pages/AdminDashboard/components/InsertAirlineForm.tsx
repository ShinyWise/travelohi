import React, { useState, useRef, useEffect } from 'react';
import { AdminServiceClient } from '../../../proto/travelohi/v1/admin/admin.client';
import { transport } from '../../../utils/grpcClient';
import styles from './AdminForms.module.scss';

const adminClient = new AdminServiceClient(transport);

const InsertAirlineForm: React.FC = () => {
    const [name, setName] = useState('');
    const [iataCode, setIataCode] = useState('');
    const [selectedFile, setSelectedFile] = useState<{ file: File; previewUrl: string; bytes: Uint8Array } | null>(null);

    const previewUrlRef = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
        };
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxBytes = 2097152; // 2MB
        if (file.size > maxBytes) {
            setToast({ type: 'error', msg: 'Logo image exceeds the 2MB limit.' });
            e.target.value = '';
            return;
        }

        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const bytes = new Uint8Array(arrayBuffer);
            const previewUrl = URL.createObjectURL(file);
            previewUrlRef.current = previewUrl;
            setSelectedFile({ file, previewUrl, bytes });
            setToast(null);
        };
        reader.onerror = () => {
            setToast({ type: 'error', msg: 'Gagal membaca berkas logo.' });
        };
        reader.readAsArrayBuffer(file);
    };

    const removeFile = () => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setToast(null);

        try {
            if (!selectedFile) {
                setToast({ type: 'error', msg: 'Harap pilih logo maskapai.' });
                setIsSubmitting(false);
                return;
            }

            const { response } = await adminClient.insertAirline({
                name,
                iataCode,
                logo: selectedFile.bytes
            });

            if (response.success) {
                setToast({ type: 'success', msg: `Maskapai "${name}" (${iataCode}) berhasil ditambahkan!` });
                setName('');
                setIataCode('');
                removeFile();
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
                <label>Kode IATA</label>
                <input type="text" value={iataCode} onChange={(e) => setIataCode(e.target.value.toUpperCase())} required placeholder="e.g. GA" maxLength={3} />
            </div>

            <div className={styles.dynamicGroup}>
                <label>Logo Maskapai</label>
                <div className={styles.imageInputRow}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        required={!selectedFile}
                    />
                </div>
                {selectedFile && (
                    <div className={styles.imageGrid} style={{ marginTop: '10px' }}>
                        <div className={styles.imageInputCard}>
                            <div className={styles.previewContainer}>
                                <img
                                    src={selectedFile.previewUrl}
                                    alt="Logo Preview"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23e74c3c"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/%3E%3C/svg%3E';
                                    }}
                                />
                            </div>
                            <div className={styles.imageInputRow}>
                                <span style={{ flex: 1, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                                    {selectedFile.file.name}
                                </span>
                                <button type="button" className={styles.removeCardBtn} onClick={removeFile}>Hapus</button>
                            </div>
                        </div>
                    </div>
                )}
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