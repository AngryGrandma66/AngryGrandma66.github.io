// js/controllers/homeController.js
import { getAllCustomQuizzes } from '../dataService.js';

export class HomeController {
    constructor(app) {
        this.app = app;

        // Grab Home screen elements
        this.quizListNav     = document.querySelector('nav.quiz-list');
        this.playerNameInput = document.getElementById('player-name');
        this.createQuizBtn   = document.getElementById('create-quiz-btn');
        this.importQuizBtn   = document.getElementById('import-quiz-btn');
        this.importFileInput = document.getElementById('import-file-input');

        // Track if we've already “activated” the inline warning logic
        this._hasTriedStart = false;

        // 1) Create & insert a <div> for the inline warning, above the quiz buttons:
        this.nameErrorDiv = document.createElement('div');
        this.nameErrorDiv.style.color = 'red';
        this.nameErrorDiv.style.marginBottom = '0.5rem';
        this.nameErrorDiv.textContent = '';
        this.quizListNav.parentNode.insertBefore(this.nameErrorDiv, this.quizListNav);

        // 2) Listen for changes in the name input:
        //    Once user types, enable/disable all quiz buttons and clear/re‐show warning.
        this.playerNameInput.addEventListener('input', () => {
            // Enable/disable every quiz button based on whether name is non‐empty:
            const hasName = Boolean(this.getPlayerName());
            this.quizListNav.querySelectorAll('button').forEach(btn => {
                btn.disabled = !hasName;
            });
            // If we've already tried to start at least once, keep warning in sync:
            if (this._hasTriedStart) {
                this.nameErrorDiv.textContent = hasName
                    ? ''
                    : 'Prosím, zadejte své jméno nebo iniciály.';
            }
        });

        // Wire up “Create Quiz” & “Import Quiz” (unchanged)
        this.createQuizBtn.addEventListener('click', () => this.app.showAuthoringBlank());
        this.importQuizBtn.addEventListener('click', () => this.importFileInput.click());

        // Build the list of quiz‐buttons for the first time:
        this.buildQuizList();

        // 3) Immediately check “name” on load and show warning if empty:
        //    This forces the inline warning to appear right away,
        //    and disables all quiz buttons.
        if (!this.getPlayerName()) {
            this._hasTriedStart = true;
            this.nameErrorDiv.textContent = 'Prosím, zadejte své jméno nebo iniciály.';
            this.quizListNav.querySelectorAll('button').forEach(btn => btn.disabled = true);
        }
    }

    /** Return the entered player name/initials. */
    getPlayerName() {
        return this.playerNameInput.value.trim();
    }

    /** Rebuild the “Play”‐only quiz list (built-in + custom). */
    buildQuizList() {
        // Clear any old buttons—and reset the “tried” flag so we don't
        // mistakenly hide the warning on rebuild:
        this.quizListNav.innerHTML = '';
        this._hasTriedStart = false;
        this.nameErrorDiv.textContent = '';

        // 1) Built‐in quizzes
        const BUILTIN_QUIZZES = [
            { id: 'afrika',               label: 'Afrika' },
            { id: 'evropa',               label: 'Evropa' },
            { id: 'ceska-republika',      label: 'Česká republika' },
            { id: 'australie-novy-zeland',label: 'Austrálie a Nový Zéland' },
            { id: 'jizni-amerika',        label: 'Jižní Amerika' },
            { id: 'stredni-amerika',      label: 'Střední Amerika' },
            { id: 'kanada-usa',           label: 'Kanada a USA' }
        ];
        const hasNameOnBuild = Boolean(this.getPlayerName());

        BUILTIN_QUIZZES.forEach(({ id, label }) => {
            const btn = document.createElement('button');
            btn.textContent   = label;
            btn.dataset.topic = id;
            btn.disabled      = !hasNameOnBuild;
            btn.addEventListener('click', () => {
                const name = this.getPlayerName();
                if (!name) {
                    // First time (or after rebuild) with no name → show warning
                    this._hasTriedStart = true;
                    this.nameErrorDiv.textContent = 'Prosím, zadejte své jméno nebo iniciály.';
                    return;
                }
                // Name is filled → clear warning & start quiz
                this.nameErrorDiv.textContent = '';
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
                btn.textContent   = `${name} (vlastní)`;
                btn.dataset.topic = id;
                btn.disabled      = !hasNameOnBuild;
                btn.addEventListener('click', () => {
                    const player = this.getPlayerName();
                    if (!player) {
                        this._hasTriedStart = true;
                        this.nameErrorDiv.textContent = 'Prosím, zadejte své jméno nebo iniciály.';
                        return;
                    }
                    this.nameErrorDiv.textContent = '';
                    this.app.startQuiz(id, name);
                });
                this.quizListNav.appendChild(btn);
            });
        }
    }
}
