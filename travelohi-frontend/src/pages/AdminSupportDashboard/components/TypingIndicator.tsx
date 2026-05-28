import React from 'react';
import styles from './TypingIndicator.module.scss';

interface Props {
    username: string;
}

const TypingIndicator: React.FC<Props> = ({ username }) => {
    return (
        <div className={styles.typingContainer}>
            <span className={styles.username}>{username} sedang mengetik</span>
            <div className={styles.dots}>
                <span>.</span><span>.</span><span>.</span>
            </div>
        </div>
    );
};

export default TypingIndicator;