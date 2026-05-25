import React, { useState } from 'react';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import styles from './ImageGallery.module.scss';
interface Props {
    images: string[];
}
const ImageGallery: React.FC<Props> = ({ images }) => {
    const { language } = useAppContext();
    const t = translations[language];
    const [mainImage, setMainImage] = useState(images[0] || '/assets/default-hotel.jpg');
    if (!images || images.length === 0) {
        return <div className={styles.emptyGallery}>{t.gallery_no_photos}</div>;
    }
    return (
        <div className={styles.galleryContainer}>
            <div className={styles.mainImageWrapper}>
                <img src={mainImage} alt="Main Hotel View" className={styles.mainImage} />
            </div>
            <div className={styles.thumbnailGrid}>
                {images.slice(0, 4).map((img, idx) => (
                    <div
                        key={idx}
                        className={`${styles.thumbnailWrapper} ${mainImage === img ? styles.active : ''}`}
                        onClick={() => setMainImage(img)}
                    >
                        <img src={img} alt={`Thumbnail ${idx + 1}`} className={styles.thumbnail} />
                    </div>
                ))}
                {images.length > 4 && (
                    <div className={styles.moreOverlay} onClick={() => setMainImage(images[4])}>
                        <span>+{images.length - 4} {t.gallery_photos_label}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
export default ImageGallery;