

let bgMusicElem = null;
let finishSoundElem = null;

export function initAudio(bgMusic, finishSound) {
    bgMusicElem = bgMusic;
    finishSoundElem = finishSound;
}

export function playMusic() {
    if (!bgMusicElem) return;
    try {
        bgMusicElem.currentTime = 0;
        bgMusicElem.play();
    } catch (_) { }
}

export function stopMusic() {
    if (!bgMusicElem) return;
    bgMusicElem.pause();
}

export function playFinishSound() {
    if (!finishSoundElem) return;
    finishSoundElem.currentTime = 0;
    finishSoundElem.play();
}

export function isMusicMuted() {
    return bgMusicElem ? bgMusicElem.muted : false;
}

export function muteEffects() {
    if (!finishSoundElem) return;
    finishSoundElem.muted = true;
}


export function isEffectsMuted() {
    return finishSoundElem ? finishSoundElem.muted : false;
}

export function toggleMusicMute() {
    if (!bgMusicElem) return false;
    bgMusicElem.muted = !bgMusicElem.muted;
    return bgMusicElem.muted;
}

export function toggleEffectsMute() {
    if (!finishSoundElem) return false;
    finishSoundElem.muted = !finishSoundElem.muted;
    return finishSoundElem.muted;
}
