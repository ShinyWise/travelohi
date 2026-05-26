import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './PromoSlider.module.scss';

// Mock data
const PROMOS = [
    {
        id: 1,
        titleKey: 'promo_title_1' as const,
        imgUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1200&q=80',
        code: 'STAYHEMAT'
    },
    {
        id: 2,
        titleKey: 'promo_title_2' as const,
        imgUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80',
        code: 'TERBANGMURAH'
    },
    {
        id: 3,
        titleKey: 'promo_title_3' as const,
        imgUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
        code: 'HOTELINDO'
    },
    {
        id: 4,
        titleKey: 'promo_title_4' as const,
        imgUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
        code: 'NEWTRAVELER'
    },
];

const PromoSlider: React.FC = () => {
    const { language } = useAppContext();
    const t = translations[language];
    const [currentIndex, setCurrentIndex] = useState(0);

    // autoslide
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex === PROMOS.length - 1 ? 0 : prevIndex + 1));
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    return (
        <div className={styles.sliderContainer}>
            <div
                className={styles.sliderTrack}
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {PROMOS.map((promo) => (
                    <div key={promo.id} className={styles.slide}>
                        <div className={styles.imagePlaceholder} style={{ backgroundImage: `url(${promo.imgUrl})` }}>
                            <div className={styles.promoContent}>
                                <h3>{t[promo.titleKey]}</h3>
                                <span className={styles.promoCode}>{t.promo_use_code_label} <strong>{promo.code}</strong></span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.dotsContainer}>
                {PROMOS.map((_, idx) => (
                    <button
                        key={idx}
                        className={`${styles.dot} ${currentIndex === idx ? styles.active : ''}`}
                        onClick={() => goToSlide(idx)}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default PromoSlider;