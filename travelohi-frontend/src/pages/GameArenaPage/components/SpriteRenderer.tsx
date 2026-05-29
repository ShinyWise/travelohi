export interface Entity {
    x: number;
    y: number;
    width: number;
    height: number;
    hp: number;
    color: string;
    name: string;
    facing: 'left' | 'right';
    action: 'idle' | 'move' | 'jump' | 'low_kick' | 'front_kick';
}

export interface GameState {
    player: Entity;
    enemy: Entity;
    timeRemaining: number;
}

export const renderBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(0, height - 100, width, 100);
};

export const renderSprite = (ctx: CanvasRenderingContext2D, entity: Entity) => {
    const yOffset = entity.action === 'jump' ? -40 : 0;
    // DUMMYYYYY
    // draw body
    ctx.fillStyle = entity.color;
    ctx.fillRect(entity.x, entity.y + yOffset, entity.width, entity.height);

    // draw facing indicator
    ctx.fillStyle = '#ffffff';
    const eyeX = entity.facing === 'right' ? entity.x + entity.width - 15 : entity.x + 5;
    ctx.fillRect(eyeX, entity.y + yOffset + 10, 10, 10);

    // draw attacks
    if (entity.action === 'front_kick' || entity.action === 'low_kick') {
        ctx.fillStyle = '#f1c40f'; //attack box indicator
        const kickWidth = 40;
        const kickHeight = 15;
        const kickX = entity.facing === 'right' ? entity.x + entity.width : entity.x - kickWidth;

        const kickY = entity.action === 'front_kick'
            ? entity.y + yOffset + (entity.height / 2) - 10
            : entity.y + yOffset + entity.height - 20;

        ctx.fillRect(kickX, kickY, kickWidth, kickHeight);
    }

    // hitbox outline
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.strokeRect(entity.x, entity.y + yOffset, entity.width, entity.height);

    // name tag
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(entity.name, entity.x + (entity.width / 2), entity.y + yOffset - 10);
};