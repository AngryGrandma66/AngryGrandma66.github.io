

let bgMusicElem = null;
let finishSoundElem = null;
/**
 * Initialize background music and finish‐sound elements for playback.
 * @param {HTMLAudioElement} bgMusic ‒ the audio element for background music
 * @param {HTMLAudioElement} finishSound ‒ the audio element for the finish sound
 */
export function initAudio(bgMusic, finishSound) {
    bgMusicElem = bgMusic;
    finishSoundElem = finishSound;
}

/**
 * Play the background music from the start.
 */
export function playMusic() {
    if (!bgMusicElem) return;
    try {
        bgMusicElem.currentTime = 0;
        bgMusicElem.play();
    } catch (_) { }
}

/**
 * Pause the background music.
 */
export function stopMusic() {
    if (!bgMusicElem) return;
    bgMusicElem.pause();
    stopQuestionMedia()
}

/**
 * Play the finish sound from the start.
 */
export function playFinishSound() {
    if (!finishSoundElem) return;
    finishSoundElem.currentTime = 0;
    finishSoundElem.play();
}

/**
 * Check whether the background music is currently muted.
 * @returns {boolean} True if background music is muted, otherwise false.
 */
export function isMusicMuted() {
    return bgMusicElem ? bgMusicElem.muted : false;
}
/**
 * Check whether effects (finish‐sound) are currently muted.
 * @returns {boolean} True if finish‐sound is muted, otherwise false.
 */
export function isEffectsMuted() {
    return finishSoundElem ? finishSoundElem.muted : false;
}
/**
 * Toggle the muted state of the background music.
 * @returns {boolean} The new muted state (true if now muted, false otherwise).
 */
export function toggleMusicMute() {
    if (!bgMusicElem) return false;
    bgMusicElem.muted = !bgMusicElem.muted;
    return bgMusicElem.muted;
}

/**
 * Toggle the muted state of the effects audio (finish‐sound).
 * @returns {boolean} The new muted state (true if now muted, false otherwise).
 */
export function toggleEffectsMute() {
    if (!finishSoundElem) return false;
    finishSoundElem.muted = !finishSoundElem.muted;
    return finishSoundElem.muted;
}
/**
 * Pause and reset any <audio> or <video> that’s still playing in the question area.
 */
function stopQuestionMedia() {
    const mediaContainer = document.getElementById('media-container');
    if (!mediaContainer) return;

    // Find all <audio> or <video> that might be playing…
    mediaContainer.querySelectorAll('audio, video').forEach((el) => {
        el.pause();
        el.currentTime = 0;
    });

    // Optionally clear out the container’s HTML so we don’t keep old nodes around:
    mediaContainer.innerHTML = '';
}
