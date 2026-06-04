import React from 'react';
import { useGameSocket } from '../../../context/GameSocketContext';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import styles from './MatchmakingQueue.module.scss';

const MatchmakingQueue: React.FC = () => {
    const { socketState, statusMessage, isArenaActive, matchQueuePosition, connectToGame, leaveGame } = useGameSocket();
    const { language } = useAppContext();
    const t = translations[language as keyof typeof translations] || translations['EN'];

    if (socketState === 'playing') {
        return null;
    }

    return (
        <div className={styles.queueOverlay}>
            <div className={styles.modal}>
                {socketState === 'idle' && (
                    <>
                        <h3>{t.game_arena_title}</h3>
                        <p>{t.game_arena_desc}</p>
                        <button className={styles.actionBtn} onClick={connectToGame}>
                            {t.game_find_opponent}
                        </button>
                    </>
                )}

                {socketState === 'connecting' && (
                    <>
                        <div className={styles.spinner} />
                        <h3>{t.game_connecting}</h3>
                        <p>{t.game_connecting_desc}</p>
                    </>
                )}

                {socketState === 'queued' && (
                    <>
                        <div className={styles.pulseRadar} />
                        <h3>{isArenaActive ? t.game_waiting_arena : t.game_finding_opponent}</h3>
                        <p>{t.game_matching_desc}</p>
                        {matchQueuePosition > 0 && (
                            <div className={styles.queuePositionBadge} style={{ marginBottom: '15px', fontWeight: 'bold', color: '#f39c12' }}>
                                {matchQueuePosition === 1 
                                    ? t.game_queue_next 
                                    : t.game_queue_pos.replace('#{pos}', matchQueuePosition.toString())}
                            </div>
                        )}
                        <button className={styles.actionBtn} onClick={leaveGame}>
                            {t.game_cancel}
                        </button>
                    </>
                )}

                {socketState === 'rate_limited' && (
                    <>
                        <div className={styles.iconError}>
                            <AlertTriangle size={64} color="#e74c3c" />
                        </div>
                        <h3 className={styles.errorText}>{t.game_limit_reached}</h3>
                        <p>
                            {t[statusMessage as keyof typeof t] || statusMessage || t.game_limit_desc}
                        </p>
                        <button className={styles.actionBtn} onClick={leaveGame}>
                            {t.game_back}
                        </button>
                    </>
                )}

                {socketState === 'error' && (
                    <>
                        <div className={styles.iconError}>
                            <AlertCircle size={64} color="#e74c3c" />
                        </div>
                        <h3 className={styles.errorText}>{t.game_conn_error}</h3>
                        <p>
                            {t[statusMessage as keyof typeof t] || statusMessage || t.game_conn_error_desc}
                        </p>
                        <button className={styles.actionBtn} onClick={leaveGame}>
                            {t.game_close}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default MatchmakingQueue;