// js/app.js

import { initAudio } from './audioController.js';
import { UIController } from './uiController.js';

// Wait for DOM to be ready (if not deferred)
window.addEventListener('DOMContentLoaded', () => {
    // Initialize audio elements
    const bgMusicElem = document.getElementById('bgMusic');
    const finishSoundElem = document.getElementById('finishSound');
    initAudio(bgMusicElem, finishSoundElem);

    // Instantiate UIController (which in turn instantiates QuizController, etc.)
    new UIController();
});
