export interface Entity {
    x: number;
    y: number;
    width: number;
    height: number;
    hp: number;
    color: string;
    name: string;
    facing: 'left' | 'right';
    action: 'idle' | 'move' | 'move_left' | 'move_right' | 'jump' | 'low_kick' | 'front_kick';
}

export interface GameState {
    player: Entity;
    enemy: Entity;
    timeRemaining: number;
}

const spriteImage = new Image();
spriteImage.src = '/fighter.png';
let isSpriteLoaded = false;
spriteImage.onload = () => { isSpriteLoaded = true; };

const backgroundImage = new Image();
backgroundImage.src = '/background.jpg';
let isBackgroundLoaded = false;
backgroundImage.onload = () => { isBackgroundLoaded = true; };

const SPRITE_CONFIG = {
    cellWidth: 333 / 8,
    cellHeight: 750 / 9,
    animations: {
        idle: { row: 0, startFrame: 0, frameCount: 4, speedMs: 150 },
        move_left: { row: 2, startFrame: 0, frameCount: 8, speedMs: 80 },
        move_right: { row: 2, startFrame: 0, frameCount: 8, speedMs: 80 },
        jump: { row: 8, startFrame: 0, frameCount: 3, speedMs: 120 },
        front_kick: { row: 7, startFrame: 0, frameCount: 4, speedMs: 85 },
        low_kick: { row: 7, startFrame: 4, frameCount: 4, speedMs: 85 }
    }
};

export const renderBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    if (isBackgroundLoaded) {
        ctx.drawImage(backgroundImage, 0, 0, width, height);
    } else {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height - 100);
        skyGrad.addColorStop(0, '#0f0c1b');
        skyGrad.addColorStop(0.5, '#191136');
        skyGrad.addColorStop(1, '#0b0818');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height - 100);

        const groundY = 400;
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
        groundGrad.addColorStop(0, '#0a0d1a');
        groundGrad.addColorStop(1, '#020308');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, width, height - groundY);

        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(width, groundY);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 0, 127, 0.15)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;

        for (let y = groundY; y <= height; y += 15) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        const horizonCenter = width / 2;
        for (let x = -200; x <= width + 200; x += 100) {
            ctx.beginPath();
            ctx.moveTo(horizonCenter, groundY);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
    }
    ctx.restore();
};

export const renderSprite = (ctx: CanvasRenderingContext2D, entity: Entity) => {
    if (isSpriteLoaded) {
        const animState = SPRITE_CONFIG.animations[entity.action as keyof typeof SPRITE_CONFIG.animations] || SPRITE_CONFIG.animations.idle;
        const startFrame = animState.startFrame;
        const currentFrame = startFrame + (Math.floor(Date.now() / animState.speedMs) % animState.frameCount);

        const sourceX = currentFrame * SPRITE_CONFIG.cellWidth;
        const sourceY = animState.row * SPRITE_CONFIG.cellHeight;

        const scale = 1.6;
        const spriteWidth = entity.width * scale; 
        const spriteHeight = entity.height * scale;
        const verticalPaddingOffset = 32; 

        ctx.save();
        let drawX = entity.x + (entity.width - spriteWidth) / 2;
        const drawY = entity.y + entity.height - spriteHeight + verticalPaddingOffset;

        if (entity.facing === 'left') {
            ctx.scale(-1, 1);
            drawX = -(entity.x + (entity.width - spriteWidth) / 2) - spriteWidth;
        }

        ctx.drawImage(
            spriteImage,
            sourceX, sourceY, SPRITE_CONFIG.cellWidth, SPRITE_CONFIG.cellHeight,
            drawX, drawY, spriteWidth, spriteHeight
        );
        ctx.restore();
    }

    ctx.save();

    ctx.strokeStyle = entity.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(entity.x, entity.y, entity.width, entity.height);

    ctx.fillStyle = `${entity.color}33`;
    ctx.fillRect(entity.x, entity.y, entity.width, entity.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const eyeX = entity.facing === 'right' ? entity.x + entity.width - 12 : entity.x + 6;
    ctx.fillRect(eyeX, entity.y + 10, 6, 6);

    if (entity.action === 'front_kick' || entity.action === 'low_kick') {
        const kickWidth = 40;
        const kickHeight = 20;
        const kickX = entity.facing === 'right' ? entity.x + entity.width : entity.x - kickWidth;

        const kickY = entity.action === 'front_kick'
            ? entity.y + (entity.height / 2) - 15
            : entity.y + entity.height - 25;

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(kickX, kickY, kickWidth, kickHeight);

        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.fillRect(kickX, kickY, kickWidth, kickHeight);
    }

    ctx.restore();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    const textWidth = ctx.measureText(entity.name).width + 12;
    ctx.beginPath();
    ctx.roundRect(entity.x + (entity.width / 2) - textWidth / 2, entity.y - 26, textWidth, 18, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(entity.name, entity.x + (entity.width / 2), entity.y - 17);
};