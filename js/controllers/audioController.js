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

/** Mute background music. */
export function muteMusic() {
    if (!bgMusicElem) return;
    bgMusicElem.muted = true;
}

/** Unmute background music. */
export function unmuteMusic() {
    if (!bgMusicElem) return;
    bgMusicElem.muted = false;
}

/** Return true if background music is currently muted. */
export function isMusicMuted() {
    return bgMusicElem ? bgMusicElem.muted : false;
}

/** Mute sound effects (finish sound). */
export function muteEffects() {
    if (!finishSoundElem) return;
    finishSoundElem.muted = true;
}

/** Unmute sound effects. */
export function unmuteEffects() {
    if (!finishSoundElem) return;
    finishSoundElem.muted = false;
}

/** Return true if effects are currently muted. */
export function isEffectsMuted() {
    return finishSoundElem ? finishSoundElem.muted : false;
}

/**
 * Toggle background music mute/unmute.
 * Returns new state (true if now muted).
 */
export function toggleMusicMute() {
    if (!bgMusicElem) return false;
    bgMusicElem.muted = !bgMusicElem.muted;
    return bgMusicElem.muted;
}

/**
 * Toggle sound effects mute/unmute.
 * Returns new state (true if now muted).
 */
export function toggleEffectsMute() {
    if (!finishSoundElem) return false;
    finishSoundElem.muted = !finishSoundElem.muted;
    return finishSoundElem.muted;
}
