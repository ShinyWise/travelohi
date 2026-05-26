import React, { useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import styles from './ScrollObserverTrigger.module.scss';

interface Props {
    onLoadMore: () => void;
    isLoading: boolean;
    hasMore: boolean;
}

const ScrollObserverTrigger: React.FC<Props> = ({ onLoadMore, isLoading, hasMore }) => {
    const { language } = useAppContext();
    const t = translations[language];
    const triggerRef = useRef<HTMLDivElement>(null);

    const handleIntersect = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const [entry] = entries;
            if (entry.isIntersecting && !isLoading && hasMore) {
                onLoadMore();
            }
        },
        [onLoadMore, isLoading, hasMore]
    );

    useEffect(() => {
        const currentRef = triggerRef.current;
        if (!currentRef) return;

        const observer = new IntersectionObserver(handleIntersect, {
            root: null,
            rootMargin: '200px',
            threshold: 0.1,
        });

        observer.observe(currentRef);

        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [handleIntersect]);

    return (
        <div ref={triggerRef} className={styles.triggerContainer}>
            {isLoading && <div className={styles.spinner}>{t.tickets_loading_history}</div>}
            {!hasMore && !isLoading && (
                <div className={styles.endMessage}>{t.tickets_history_all_shown}</div>
            )}
        </div>
    );
};

export default ScrollObserverTrigger;
