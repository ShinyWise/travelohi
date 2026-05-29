class AudioController {
    private bgm: HTMLAudioElement;

    constructor() {
        // dummy, WIP
        this.bgm = new Audio('/assets/battle-bgm.mp3');
        this.bgm.loop = true;
        this.bgm.volume = 0.2;
    }

    public playBGM() {
        this.bgm.play().catch((err) => {
            console.warn('Autoplay blocked by browser policy. Waiting for user interaction.', err);
        });
    }

    public stopBGM() {
        this.bgm.pause();
        this.bgm.currentTime = 0;
    }
}

export const audioController = new AudioController();