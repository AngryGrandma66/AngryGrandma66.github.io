import { getAllCustomQuizzes } from '../dataService.js';

/**
 * Build the “Home” screen: attach listener to
 *   - player‐name input (enabling/disabling quiz buttons)
 *   - “Create quiz” and “Import quiz” buttons
 *   - Insert a small error div to show “please enter name” messages
 * Then call buildQuizList() to populate built‐in + custom quizzes.
 * @param {AppController} app – parent application controller
 */
export class HomeController {
    constructor(app) {
        this.app = app;


        this.quizListNav     = document.querySelector('nav.quiz-list');
        this.playerNameInput = document.getElementById('player-name');
        this.createQuizBtn   = document.getElementById('create-quiz-btn');
        this.importQuizBtn   = document.getElementById('import-quiz-btn');
        this.importFileInput = document.getElementById('import-file-input');


        this._hasTriedStart = false;


        this.nameErrorDiv = document.createElement('div');
        this.nameErrorDiv.style.color = 'red';
        this.nameErrorDiv.style.marginBottom = '0.5rem';
        this.nameErrorDiv.textContent = '';
        this.quizListNav.parentNode.insertBefore(this.nameErrorDiv, this.quizListNav);



        this.playerNameInput.addEventListener('input', () => {

            const hasName = Boolean(this.getPlayerName());
            this.quizListNav.querySelectorAll('button').forEach(btn => {
                btn.disabled = !hasName;
            });

            if (this._hasTriedStart) {
                this.nameErrorDiv.textContent = hasName
                    ? ''
                    : 'Prosím, zadejte své jméno nebo iniciály.';
            }
        });


        this.createQuizBtn.addEventListener('click', () => this.app.showAuthoringBlank());
        this.importQuizBtn.addEventListener('click', () => this.importFileInput.click());


        this.buildQuizList();




        if (!this.getPlayerName()) {
            this._hasTriedStart = true;
            this.nameErrorDiv.textContent = 'Prosím, zadejte své jméno nebo iniciály.';
            this.quizListNav.querySelectorAll('button').forEach(btn => btn.disabled = true);
        }
    }

    /**
     * Return the trimmed value of the player‐name input,
     * or an empty string if nothing was entered.
     * Used to determine if play buttons should be enabled.
     * @returns {string}
     */
    getPlayerName() {
        return this.playerNameInput.value.trim();
    }


    /**
     * Clear and re‐create the list of available quizzes:
     *   1) Seven built‐in topics (afrika, evropa, etc.)
     *   2) If any custom quizzes exist in localStorage, add a divider
     *      and then list them.
     * Each button is disabled if no player name is present,
     * and clicking it calls AppController.startQuiz(...) with the ID and label.
     */
    buildQuizList() {
        this.quizListNav.innerHTML = '';
        this._hasTriedStart = false;
        this.nameErrorDiv.textContent = '';


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

                    this._hasTriedStart = true;
                    this.nameErrorDiv.textContent = 'Prosím, zadejte své jméno nebo iniciály.';
                    return;
                }

                this.nameErrorDiv.textContent = '';
                this.app.startQuiz(id, label);
            });
            this.quizListNav.appendChild(btn);
        });


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
