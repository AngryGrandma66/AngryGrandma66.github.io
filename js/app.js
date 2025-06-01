import {initAudio} from './controllers/audioController.js';
import {AppController} from './controllers/appController.js';
/*
 * Entry point for the geography quiz app:
 *   • Registers the service worker (sw.js) if supported
 *   • Initializes audio via initAudio()
 *   • Instantiates AppController to wire everything together
 */
window.addEventListener('DOMContentLoaded', () => {

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('/sw.js')
            .catch(err => console.warn('SW registration failed:', err));
    }

    const bgMusicElem = document.getElementById('bgMusic');
    const finishSoundElem = document.getElementById('finishSound');
    initAudio(bgMusicElem, finishSoundElem);
    new AppController();
});
