import React, { useEffect, useRef } from 'react';
import HealthBarOverlay from './components/HealthBarOverlay';
import MatchmakingQueue from './components/MatchmakingQueue';
import { renderBackground, renderSprite, type GameState } from './components/SpriteRenderer';
import { audioController } from './utils/AudioController';
import { useGameSocket } from '../../context/GameSocketContext';
import { GameServerEvent } from '../../proto/travelohi/v1/game/game';
import { useInputController } from './hooks/useInputController';
import MatchResultOverlay from './components/MatchResultOverlay';


const GameArena: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { client, socketState } = useGameSocket();

    const gameStateRef = useRef<GameState>({
        player: { name: 'Anda', x: 100, y: 300, width: 60, height: 100, hp: 100, color: '#3498db', facing: 'right', action: 'idle' },
        enemy: { name: 'Lawan', x: 640, y: 300, width: 60, height: 100, hp: 100, color: '#e74c3c', facing: 'left', action: 'idle' },
        timeRemaining: 60.0
    });

    const lastTimeRef = useRef<number>(performance.now());

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
                    } else {
                        state.player.hp = update.playerTwoHp;
                        state.enemy.hp = update.playerOneHp;
                    }
                    state.timeRemaining = update.timeRemaining;

                    // WIP: backend coordinate sync
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
            gameStateRef.current.player.x = 100;
            gameStateRef.current.enemy.x = 640;
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
            const deltaTime = (time - lastTimeRef.current) / 1000;
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

                if (state.timeRemaining > 0) {
                    state.timeRemaining = Math.max(0, state.timeRemaining - deltaTime);
                }

                state.player.facing = state.player.x <= state.enemy.x ? 'right' : 'left';
                state.enemy.facing = state.enemy.x <= state.player.x ? 'right' : 'left';
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
        <div style={{ position: 'relative', width: '100%', maxWidth: '1000px', margin: '40px auto' }}>
            <MatchmakingQueue />
            <MatchResultOverlay />
            <HealthBarOverlay gameStateRef={gameStateRef} />
            <canvas
                ref={canvasRef}
                width={800}
                height={450}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#000',
                    borderRadius: '12px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    display: 'block'
                }}
            />
        </div>
    );
};

export default GameArena;