// js/audioController.js

let bgMusicElem = null;
let finishSoundElem = null;

/**
 * Initialize by passing in the two HTMLAudioElement instances.
 * Must be called once on startup.
 *
 * @param {HTMLAudioElement} bgMusic
 * @param {HTMLAudioElement} finishSound
 */
export function initAudio(bgMusic, finishSound) {
    bgMusicElem = bgMusic;
    finishSoundElem = finishSound;
}

/** Play background music from start. */
export function playMusic() {
    if (!bgMusicElem) return;
    try {
        bgMusicElem.currentTime = 0;
        bgMusicElem.play();
    } catch (_) { /* ignore play errors */ }
}

/** Stop background music. */
export function stopMusic() {
    if (!bgMusicElem) return;
    bgMusicElem.pause();
}

/** Play finish sound once. */
export function playFinishSound() {
    if (!finishSoundElem) return;
    finishSoundElem.currentTime = 0;
    finishSoundElem.play();
}
