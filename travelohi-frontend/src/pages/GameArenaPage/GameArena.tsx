import React, { useEffect, useRef } from 'react';
import HealthBarOverlay from './components/HealthBarOverlay';
import MatchmakingQueue from './components/MatchmakingQueue';
import { renderBackground, renderSprite, type GameState } from './components/SpriteRenderer';
import { audioController } from './utils/AudioController';
import { useGameSocket } from '../../context/GameSocketContext';
import { GameServerEvent } from '../../proto/travelohi/v1/game/game';
import { useInputController } from './hooks/useInputController';
import MatchResultOverlay from './components/MatchResultOverlay';
import styles from './components/GameArena.module.scss';


const GameArena: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { client, socketState } = useGameSocket();

    const gameStateRef = useRef<GameState>({
        player: { name: 'Anda', x: 100, y: 300, width: 60, height: 100, hp: 100, color: '#3498db', facing: 'right', action: 'idle' },
        enemy: { name: 'Lawan', x: 640, y: 300, width: 60, height: 100, hp: 100, color: '#e74c3c', facing: 'left', action: 'idle' },
        timeRemaining: 60.0
    });

    const lastTimeRef = useRef<number>(performance.now());
    const playerYVelRef = useRef<number>(0);
    const enemyYVelRef = useRef<number>(0);
    const prevPlayerActionRef = useRef<string>('idle');
    const prevEnemyActionRef = useRef<string>('idle');

    // headless input controller
    const keysPressedRef = useInputController(client, socketState, gameStateRef);

    useEffect(() => {
        if (!client) return;

        client.onGameStateSync = (binaryData: Uint8Array) => {
            try {
                const serverEvent = GameServerEvent.fromBinary(binaryData);
                const payload = serverEvent.payload;

                if (payload.oneofKind === 'stateUpdate') {
                    const update = (payload as any).stateUpdate;
                    const state = gameStateRef.current;

                    if (client.isPlayerOne) {
                        state.player.hp = update.playerOneHp;
                        state.enemy.hp = update.playerTwoHp;
                        state.enemy.x = update.playerTwoX;
                        state.enemy.y = update.playerTwoY;
                        state.enemy.action = (update.playerTwoAction || 'idle') as any;
                        if (Math.abs(state.player.x - update.playerOneX) > 10) {
                            state.player.x = update.playerOneX;
                        }
                        if (Math.abs(state.player.y - update.playerOneY) > 10) {
                            state.player.y = update.playerOneY;
                        }
                    } else {
                        state.player.hp = update.playerTwoHp;
                        state.enemy.hp = update.playerOneHp;
                        state.enemy.x = update.playerOneX;
                        state.enemy.y = update.playerOneY;
                        state.enemy.action = (update.playerOneAction || 'idle') as any;
                        if (Math.abs(state.player.x - update.playerTwoX) > 10) {
                            state.player.x = update.playerTwoX;
                        }
                        if (Math.abs(state.player.y - update.playerTwoY) > 10) {
                            state.player.y = update.playerTwoY;
                        }
                    }
                    state.timeRemaining = update.timeRemaining;
                }
            } catch (err) {
                console.error("Protobuf deserialization failed", err);
            }
        };
    }, [client]);

    // init player on match start
    useEffect(() => {
        if (socketState === 'playing' && client) {
            gameStateRef.current.player.name = 'Anda';
            const cleanOpponentName = client.opponentName.replace(/\s*\[P\d\]$/, '');
            gameStateRef.current.enemy.name = cleanOpponentName;

            // default state
            gameStateRef.current.player.hp = 100;
            gameStateRef.current.enemy.hp = 100;
            gameStateRef.current.timeRemaining = 60.0;
            gameStateRef.current.player.y = 300;
            gameStateRef.current.enemy.y = 300;
            playerYVelRef.current = 0;
            enemyYVelRef.current = 0;
            prevPlayerActionRef.current = 'idle';
            prevEnemyActionRef.current = 'idle';
            if (client.isPlayerOne) {
                gameStateRef.current.player.x = 100;
                gameStateRef.current.enemy.x = 640;
                gameStateRef.current.player.color = '#3498db';
                gameStateRef.current.enemy.color = '#e74c3c';
            } else {
                gameStateRef.current.player.x = 640;
                gameStateRef.current.enemy.x = 100;
                gameStateRef.current.player.color = '#e74c3c';
                gameStateRef.current.enemy.color = '#3498db';
            }
            gameStateRef.current.player.action = 'idle';
            gameStateRef.current.enemy.action = 'idle';
        }
    }, [socketState, client]);

    // 3. rendering/physics loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const gameLoop = (time: number) => {
            const delta = time - lastTimeRef.current;
            if (delta < 1000 / 60) {
                animationFrameId = requestAnimationFrame(gameLoop);
                return;
            }
            const deltaTime = delta / 1000;
            lastTimeRef.current = time;

            if (socketState === 'playing') {
                const state = gameStateRef.current;
                const speed = 250;
                const step = speed * deltaTime;

                if (keysPressedRef.current.left) {
                    state.player.x = Math.max(0, state.player.x - step);
                }
                if (keysPressedRef.current.right) {
                    state.player.x = Math.min(800 - state.player.width, state.player.x + step);
                }

                if (state.enemy.action === 'move_left') {
                    state.enemy.x = Math.max(0, state.enemy.x - step);
                } else if (state.enemy.action === 'move_right') {
                    state.enemy.x = Math.min(800 - state.enemy.width, state.enemy.x + step);
                }

                const gravity = 1600;
                const groundY = 300;

                if (state.player.action === 'jump' && prevPlayerActionRef.current !== 'jump' && state.player.y === groundY) {
                    playerYVelRef.current = -400;
                }
                if (state.enemy.action === 'jump' && prevEnemyActionRef.current !== 'jump' && state.enemy.y === groundY) {
                    enemyYVelRef.current = -400;
                }

                if (state.player.y < groundY || playerYVelRef.current !== 0) {
                    playerYVelRef.current += gravity * deltaTime;
                    state.player.y = Math.min(groundY, state.player.y + playerYVelRef.current * deltaTime);
                    if (state.player.y === groundY) {
                        playerYVelRef.current = 0;
                    }
                }

                if (state.enemy.y < groundY || enemyYVelRef.current !== 0) {
                    enemyYVelRef.current += gravity * deltaTime;
                    state.enemy.y = Math.min(groundY, state.enemy.y + enemyYVelRef.current * deltaTime);
                    if (state.enemy.y === groundY) {
                        enemyYVelRef.current = 0;
                    }
                }

                if (state.timeRemaining > 0) {
                    state.timeRemaining = Math.max(0, state.timeRemaining - deltaTime);
                }

                state.player.facing = state.player.x <= state.enemy.x ? 'right' : 'left';
                state.enemy.facing = state.enemy.x <= state.player.x ? 'right' : 'left';

                prevPlayerActionRef.current = state.player.action;
                prevEnemyActionRef.current = state.enemy.action;
            }

            renderBackground(ctx, canvas.width, canvas.height);
            renderSprite(ctx, gameStateRef.current.player);
            renderSprite(ctx, gameStateRef.current.enemy);

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        animationFrameId = requestAnimationFrame(gameLoop);

        return () => cancelAnimationFrame(animationFrameId);
    }, [socketState, keysPressedRef]);

    // audio control
    useEffect(() => {
        if (socketState === 'playing') {
            audioController.playBGM();
        } else {
            audioController.stopBGM();
        }
    }, [socketState]);

    return (
        <div className={styles.arenaContainer}>
            <MatchmakingQueue />
            <MatchResultOverlay />
            <HealthBarOverlay gameStateRef={gameStateRef} />
            <canvas
                ref={canvasRef}
                width={800}
                height={450}
                className={styles.gameCanvas}
            />
        </div>
    );
};

export default GameArena;