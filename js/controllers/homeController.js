// js/controllers/homeController.js
import { getAllCustomQuizzes } from '../dataService.js';

export class HomeController {
    constructor(app) {
        this.app = app;

        // Grab Home screen elements
        this.quizListNav      = document.querySelector('nav.quiz-list');
        this.playerNameInput  = document.getElementById('player-name');
        this.viewScoresBtn    = document.getElementById('view-scores-btn');
        this.manageQuizzesBtn = document.getElementById('manage-quizzes-btn');
        this.createQuizBtn    = document.getElementById('create-quiz-btn');
        this.importQuizBtn    = document.getElementById('import-quiz-btn');
        this.importFileInput  = document.getElementById('import-file-input');

        // Wire up buttons
        this.viewScoresBtn.addEventListener('click', () => this.app.showScores());
        this.manageQuizzesBtn.addEventListener('click', () => this.app.showControlPanel());
        this.createQuizBtn.addEventListener('click', () => this.app.showAuthoringBlank());
        this.importQuizBtn.addEventListener('click', () => this.importFileInput.click());
        // Actual import‐file handling lives in AuthoringController

        // Build initial list
        this.buildQuizList();
    }

    /** Return the entered player name/initials. */
    getPlayerName() {
        return this.playerNameInput.value.trim();
    }

    /** Rebuild the “Play”‐only quiz list (built-in + custom). */
    buildQuizList() {
        this.quizListNav.innerHTML = '';

        // 1) Built-in quizzes
        const BUILTIN_QUIZZES = [
            { id: 'afrika',               label: 'Afrika' },
            { id: 'evropa',               label: 'Evropa' },
            { id: 'ceska-republika',      label: 'Česká republika' },
            { id: 'australie-novy-zeland',label: 'Austrálie a Nový Zéland' },
            { id: 'jizni-amerika',        label: 'Jižní Amerika' },
            { id: 'stredni-amerika',      label: 'Střední Amerika' },
            { id: 'kanada-usa',           label: 'Kanada a USA' }
        ];
        BUILTIN_QUIZZES.forEach(({ id, label }) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.dataset.topic = id;
            btn.addEventListener('click', () => {
                this.app.startQuiz(id, label);
            });
            this.quizListNav.appendChild(btn);
        });

        // 2) Custom quizzes
        const custom = getAllCustomQuizzes();
        if (custom.length > 0) {
            const hr = document.createElement('hr');
            hr.style.width  = '100%';
            hr.style.margin = '1rem 0';
            this.quizListNav.appendChild(hr);

            custom.forEach(({ id, name }) => {
                const btn = document.createElement('button');
                btn.textContent = `${name} (vlastní)`;
                btn.dataset.topic = id;
                btn.addEventListener('click', () => {
                    this.app.startQuiz(id, name);
                });
                this.quizListNav.appendChild(btn);
            });
        }
    }
}
