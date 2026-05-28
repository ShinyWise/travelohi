import React from 'react';
import styles from './MessageSkeleton.module.scss';

const MessageSkeleton: React.FC = () => {
    return (
        <div className={styles.skeletonContainer}>
            <div className={`${styles.bubble} ${styles.left}`}></div>
            <div className={`${styles.bubble} ${styles.right}`}></div>
            <div className={`${styles.bubble} ${styles.left} ${styles.short}`}></div>
        </div>
    );
};

export default MessageSkeleton;