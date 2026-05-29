import React, { useEffect, useRef } from 'react';
import { type GameState } from './SpriteRenderer';
import styles from './HealthBarOverlay.module.scss';

interface Props {
    gameStateRef: React.MutableRefObject<GameState>;
}

const HealthBarOverlay: React.FC<Props> = ({ gameStateRef }) => {
    const p1HealthRef = useRef<HTMLDivElement>(null);
    const p2HealthRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let animationFrameId: number;

        const updateUI = () => {
            const state = gameStateRef.current;

            if (p1HealthRef.current) {
                p1HealthRef.current.style.width = `${Math.max(0, state.player.hp)}%`;
            }

            if (p2HealthRef.current) {
                p2HealthRef.current.style.width = `${Math.max(0, state.enemy.hp)}%`;
            }

            if (timerRef.current) {
                timerRef.current.innerText = Math.ceil(state.timeRemaining).toString();
            }

            animationFrameId = requestAnimationFrame(updateUI);
        };

        updateUI();

        return () => cancelAnimationFrame(animationFrameId);
    }, [gameStateRef]);

    return (
        <div className={styles.hudContainer}>
            <div className={styles.playerPanel}>
                <div className={styles.name}>{gameStateRef.current.player.name}</div>
                <div className={styles.healthBarTrack}>
                    <div ref={p1HealthRef} className={styles.healthBarFill} />
                </div>
            </div>

            <div className={styles.timerPanel}>
                <span ref={timerRef} className={styles.timerText}>99</span>
            </div>

            <div className={styles.enemyPanel}>
                <div className={styles.name}>{gameStateRef.current.enemy.name}</div>
                <div className={styles.healthBarTrack}>
                    <div ref={p2HealthRef} className={styles.healthBarFill} />
                </div>
            </div>
        </div>
    );
};

export default HealthBarOverlay;