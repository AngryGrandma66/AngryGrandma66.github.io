// js/app.js
import {initAudio} from './controllers/audioController.js';
import {AppController} from './controllers/appController.js';

window.addEventListener('DOMContentLoaded', () => {
    // ── Register Service Worker ──
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
