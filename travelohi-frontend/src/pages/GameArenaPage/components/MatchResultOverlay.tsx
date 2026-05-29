import React from 'react';
import { useGameSocket } from '../../../context/GameSocketContext';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './MatchResultOverlay.module.scss';

const MatchResultOverlay: React.FC = () => {
    const { socketState, statusMessage, connectToGame, leaveGame } = useGameSocket();
    const { language } = useAppContext();
    const t = translations[language];

    if (socketState !== 'match_ended' && socketState !== 'opponent_disconnected') {
        return null;
    }
    const isWin = statusMessage.includes('win') || statusMessage.includes('disconnected') || statusMessage.toLowerCase().includes('menang');
    const isDraw = statusMessage.includes('draw') || statusMessage.toLowerCase().includes('seri');

    const title = isWin ? t.game_victory : (isDraw ? t.game_draw : t.game_defeat);
    const themeClass = isWin ? styles.win : (isDraw ? styles.draw : styles.lose);

    return (
        <div className={styles.overlay}>
            <div className={`${styles.resultCard} ${themeClass}`}>
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.message}>
                    {t[statusMessage as keyof typeof t] || statusMessage}
                </p>

                <div className={styles.actions}>
                    <button className={styles.playAgainBtn} onClick={connectToGame}>
                        {t.game_find_new}
                    </button>
                    <button className={styles.homeBtn} onClick={() => {
                        leaveGame();
                        window.history.back();
                    }}>
                        {t.game_close_arena}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchResultOverlay;