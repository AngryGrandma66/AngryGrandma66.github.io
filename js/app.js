// js/app.js
import { initAudio } from './audioController.js';
import { AppController } from './controllers/appController.js';

window.addEventListener('DOMContentLoaded', () => {
    const bgMusicElem     = document.getElementById('bgMusic');
    const finishSoundElem = document.getElementById('finishSound');
    initAudio(bgMusicElem, finishSoundElem);

    new AppController();
});
