// js/uiController.js
import {QuizController} from './quizController.js';
import {stopMusic} from './audioController.js';
import {addScore, getTopScores} from './scoreService.js';
import {deleteCustomQuiz, getAllCustomQuizzes, getCustomQuiz} from './dataService.js';
import {AuthoringController} from './authoringController.js';

// Built-in quizzes and their labels
const BUILTIN_QUIZZES = [
    {id: 'afrika', label: 'Afrika'},
    {id: 'evropa', label: 'Evropa'},
    {id: 'ceska-republika', label: 'Česká republika'},
    {id: 'australie-novy-zeland', label: 'Austrálie a Nový Zéland'},
    {id: 'jizni-amerika', label: 'Jižní Amerika'},
    {id: 'stredni-amerika', label: 'Střední Amerika'},
    {id: 'kanada-usa', label: 'Kanada a USA'}
];

export class UIController {
    constructor() {
        // 1) Ensure initial history state is “home”
        history.replaceState({page: 'home'}, '', window.location.pathname);

        // 2) Grab references to all sections & controls
        this.homeScreen = document.getElementById('home-screen');
        this.quizScreen = document.getElementById('quiz-screen');
        this.resultsScreen = document.getElementById('results-screen');
        this.scoresScreen = document.getElementById('scores-screen');
        this.controlPanelScreen = document.getElementById('control-panel-screen');
        this.authoringScreen = document.getElementById('authoring-screen');

        // -- Home screen elements --
        this.quizListNav = document.querySelector('nav.quiz-list');
        this.playerNameInput = document.getElementById('player-name');
        this.viewScoresBtn = document.getElementById('view-scores-btn');
        this.manageQuizzesBtn = document.getElementById('manage-quizzes-btn');
        this.createQuizBtn = document.getElementById('create-quiz-btn');
        this.importQuizBtn = document.getElementById('import-quiz-btn');
        this.importFileInput = document.getElementById('import-file-input');

        // -- Quiz screen elements --
        this.quizTitleEl = document.getElementById('quiz-title');
        this.progressTextEl = document.getElementById('progress-text');
        this.progressBarEl = document.getElementById('progress-bar');
        this.timerEl = document.getElementById('timer');
        this.questionTextEl = document.getElementById('question-text');
        this.choicesListEl = document.getElementById('choices-list');
        this.nextBtn = document.getElementById('next-btn');
        this.homeBtn = document.getElementById('home-btn');

        // -- Results screen elements --
        this.scoreTextEl = document.getElementById('score-text');
        this.resultsCanvas = document.getElementById('resultsChart');

        // -- Scores screen elements --
        this.highScoreList = document.getElementById('high-score-list');
        this.scoresHomeBtn = document.getElementById('scores-home-btn');

        // -- Control Panel elements --
        this.controlPanelList = document.getElementById('control-panel-list');
        this.controlHomeBtn = document.getElementById('control-home-btn');

        // -- Authoring screen elements --
        this.authoringHomeBtn = document.getElementById('authoring-home-btn');

        // 3) Null‐check required elements
        [
            ['#home-screen', this.homeScreen],
            ['#quiz-screen', this.quizScreen],
            ['#results-screen', this.resultsScreen],
            ['#scores-screen', this.scoresScreen],
            ['#control-panel-screen', this.controlPanelScreen],
            ['#authoring-screen', this.authoringScreen],
            ['nav.quiz-list', this.quizListNav],
            ['#player-name', this.playerNameInput],
            ['#view-scores-btn', this.viewScoresBtn],
            ['#manage-quizzes-btn', this.manageQuizzesBtn],
            ['#create-quiz-btn', this.createQuizBtn],
            ['#import-quiz-btn', this.importQuizBtn],
            ['#import-file-input', this.importFileInput],
            ['#quiz-title', this.quizTitleEl],
            ['#progress-text', this.progressTextEl],
            ['#progress-bar', this.progressBarEl],
            ['#timer', this.timerEl],
            ['#question-text', this.questionTextEl],
            ['#choices-list', this.choicesListEl],
            ['#next-btn', this.nextBtn],
            ['#home-btn', this.homeBtn],
            ['#score-text', this.scoreTextEl],
            ['#resultsChart', this.resultsCanvas],
            ['#high-score-list', this.highScoreList],
            ['#scores-home-btn', this.scoresHomeBtn],
            ['#control-panel-list', this.controlPanelList],
            ['#control-home-btn', this.controlHomeBtn],
            ['#authoring-home-btn', this.authoringHomeBtn]
        ].forEach(([sel, el]) => {
            if (!el) throw new Error(`UIController: missing element ${sel}`);
        });

        // 4) Track current quiz & player
        this.currentPlayer = '';
        this.currentQuizTitle = '';
        this.currentQuizId = '';

        // 5) Instantiate QuizController
        this.quizCtrl = new QuizController({
            onQuizLoaded: data => this._handleQuizLoaded(data),
            onQuestionRendered: state => this._renderQuestion(state),
            onQuizFinished: results => this._renderResults(results)
        });

        // 6) Instantiate AuthoringController
        this.authoringCtrl = new AuthoringController({
            onAuthorSaved: () => this._buildQuizList()
        });
        this.authoringHomeBtn.addEventListener('click', () => {
            history.replaceState({ page: 'home' }, '', window.location.pathname);
            this._buildQuizList();
            this._showSection(this.homeScreen);
        });
        // 7) Wire up “Next” & Home in Quiz screen
        this.nextBtn.addEventListener('click', () => this.quizCtrl.nextQuestion());
        this.homeBtn.addEventListener('click', () => {
            this.quizCtrl.abortQuiz();
            stopMusic();
            history.replaceState({page: 'home'}, '', window.location.pathname);
            this._showSection(this.homeScreen);
            this._buildQuizList();
            this._showSection(this.homeScreen);
        });

        // 8) High Scores
        this.viewScoresBtn.addEventListener('click', () => this._showHighScores());
        this.scoresHomeBtn.addEventListener('click', () => {
            history.replaceState({page: 'home'}, '', window.location.pathname);
            this._showSection(this.homeScreen);
            this._buildQuizList();
            this._showSection(this.homeScreen);
        });

        // 9) Manage Quizzes → go to Control Panel
        this.manageQuizzesBtn.addEventListener('click', () => {
            history.pushState({page: 'control'}, '', window.location);
            // If a quiz was running, stop it now
            this.quizCtrl.abortQuiz();
            stopMusic();
            // Show the Control Panel (no Home rebuild here)
            this._showControlPanel();
        });
        this.controlHomeBtn.addEventListener('click', () => {
            history.replaceState({page: 'home'}, '', window.location.pathname);
            // Rebuild Home list whenever returning from Control Panel
            this._buildQuizList();
            this._showSection(this.homeScreen);
        });

        // 10) Create / Import Quiz
        this.createQuizBtn.addEventListener('click', () => {
            history.pushState({page: 'authoring'}, '', window.location);
            this.authoringCtrl.loadQuizForEdit(null, null); // blank form
            this._showSection(this.authoringScreen);
        });
        this.importQuizBtn.addEventListener('click', () => this.importFileInput.click());
        // File import is handled inside AuthoringController

        // 11) Build Home quiz list
        this._buildQuizList();

        // 12) Handle Back/Forward
        window.addEventListener('popstate', event => {
            const state = event.state;
            if (!state || state.page === 'home') {
                this.quizCtrl.abortQuiz();
                stopMusic();
                this._showSection(this.homeScreen);
                this.quizCtrl.abortQuiz();
                stopMusic();
                this._buildQuizList();
                this._showSection(this.homeScreen);

            } else if (state.page === 'quiz') {
                // Prevent re-entry into past quiz
                this.quizCtrl.abortQuiz();
                stopMusic();
                history.replaceState({page: 'home'}, '', window.location.pathname);

                this._buildQuizList();
                this._showSection(this.homeScreen);
            } else if (state.page === 'results') {
                this._showSection(this.resultsScreen);

            } else if (state.page === 'scores') {
                this._showHighScores();

            } else if (state.page === 'control') {
                this.quizCtrl.abortQuiz();
                stopMusic();
                this._showControlPanel();

            } else if (state.page === 'authoring') {
                this._showSection(this.authoringScreen);
            }
        });

        // 13) Offline/online alerts
        window.addEventListener('offline', () => alert('Offline: používají se uložené kvízy.'));
        window.addEventListener('online', () => console.log('Online'));

        // 14) Show Home initially
        this._showSection(this.homeScreen);
    }

    /** Hide all sections, then show exactly the one passed in. */
    _showSection(sectionEl) {
        [this.homeScreen,
            this.quizScreen,
            this.resultsScreen,
            this.scoresScreen,
            this.controlPanelScreen,
            this.authoringScreen
        ].forEach(sec => sec.classList.toggle('active', sec === sectionEl));
    }

    /**
     * Build the Home quiz list (Play only). No Edit/Delete here.
     */
    _buildQuizList() {
        this.quizListNav.innerHTML = '';

        // 1) Built-in quizzes
        BUILTIN_QUIZZES.forEach(({id, label}) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.dataset.topic = id;
            btn.addEventListener('click', () => this._startQuiz(id, label));
            this.quizListNav.appendChild(btn);
        });

        // 2) Add a divider if custom quizzes exist
        const custom = getAllCustomQuizzes();
        if (custom.length > 0) {
            const hr = document.createElement('hr');
            hr.style.width = '100%';
            hr.style.margin = '1rem 0';
            this.quizListNav.appendChild(hr);

            // 3) List custom quizzes (Play only)
            custom.forEach(({id, name}) => {
                const btn = document.createElement('button');
                btn.textContent = `${name} (vlastní)`;
                btn.dataset.topic = id;
                btn.addEventListener('click', () => this._startQuiz(id, name));
                this.quizListNav.appendChild(btn);
            });
        }
    }

    /**
     * Show the Control Panel, listing each custom quiz with Play/Edit/Export/Delete.
     */
    _showControlPanel() {
        this.controlPanelList.innerHTML = '';

        const custom = getAllCustomQuizzes();
        if (custom.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Žádné vlastní kvízy.';
            this.controlPanelList.appendChild(li);
        } else {
            custom.forEach(({id, name}) => {
                const li = document.createElement('li');

                // Quiz name (bold)
                const nameSpan = document.createElement('span');
                nameSpan.textContent = name;
                nameSpan.classList.add('control-quiz-name');
                li.appendChild(nameSpan);

                // “Hrát” button
                const playBtn = document.createElement('button');
                playBtn.textContent = 'Hrát';
                playBtn.classList.add('control-btn');
                playBtn.addEventListener('click', () => {
                    const player = this.playerNameInput.value.trim();
                    if (!player) {
                        alert('Prosím, zadejte své jméno nebo iniciály.');
                        return;
                    }
                    this.currentPlayer = player;
                    this.currentQuizTitle = name;
                    this.currentQuizId = id;
                    this.quizCtrl.abortQuiz();
                    stopMusic();
                    history.pushState({page: 'quiz', topic: id}, '', `?quiz=${id}`);
                    this.quizCtrl.startQuiz(id);
                });
                li.appendChild(playBtn);

                // “Upravit” button
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Upravit';
                editBtn.classList.add('control-btn');
                editBtn.addEventListener('click', () => {
                    const raw = getCustomQuiz(id);
                    if (!raw) {
                        alert('Nepodařilo se načíst tento kvíz.');
                        return;
                    }
                    history.pushState({page: 'authoring'}, '', window.location);
                    this.authoringCtrl.loadQuizForEdit(id, raw);
                    this._showSection(this.authoringScreen);
                });
                li.appendChild(editBtn);

                // “Export” button
                const exportBtn = document.createElement('button');
                exportBtn.textContent = 'Export';
                exportBtn.classList.add('control-btn');
                exportBtn.addEventListener('click', () => {
                    const raw = getCustomQuiz(id);
                    if (!raw) {
                        alert('Nepodařilo se načíst tento kvíz.');
                        return;
                    }
                    const filename = `${id}.json`;
                    const blob = new Blob([JSON.stringify(raw, null, 2)], {
                        type: 'application/json'
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                });
                li.appendChild(exportBtn);

                // “Smazat” button
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Smazat';
                deleteBtn.classList.add('control-btn', 'delete-btn');
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`Opravdu chcete smazat kvíz “${name}”?`)) {
                        deleteCustomQuiz(id);
                        this._showControlPanel();
                        this._buildQuizList(); // also refresh Home list in case user view it later
                    }
                });
                li.appendChild(deleteBtn);

                this.controlPanelList.appendChild(li);
            });
        }

        this._showSection(this.controlPanelScreen);
    }

    /**
     * Start a quiz given its topic ID (builtin or custom) and title.
     */
    _startQuiz(topicId, titleLabel) {
        const name = this.playerNameInput.value.trim();
        if (!name) {
            alert('Prosím, zadejte své jméno nebo iniciály.');
            return;
        }
        this.quizCtrl.abortQuiz();
        stopMusic();

        this.currentPlayer = name;
        this.currentQuizTitle = titleLabel;
        this.currentQuizId = topicId;

        history.pushState({page: 'quiz', topic: topicId}, '', `?quiz=${topicId}`);
        this.quizCtrl.startQuiz(topicId);
    }

    /** Called by QuizController once the quiz JSON is loaded. */
    _handleQuizLoaded(data) {
        this.quizTitleEl.textContent = `Kvíz: ${data.title}`;
        this.progressBarEl.max = data.questions.length;
        this._showSection(this.quizScreen);
    }

    /**
     * Render a question or feedback (if answered or timed out).
     * `state` contains { question, index, total, timeLeft, selected, isCorrect, chosenIndex, timedOut }.
     */
    _renderQuestion(state) {
        const {question, index, total, timeLeft, selected, isCorrect, chosenIndex, timedOut} = state;

        this.progressTextEl.textContent = `Otázka ${index + 1} / ${total}`;
        this.progressBarEl.value = index + 1;
        this.questionTextEl.textContent = question.text;

        this.choicesListEl.innerHTML = '';
        this.nextBtn.disabled = true;

        question.choices.forEach((choiceText, idx) => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.textContent = choiceText;
            btn.type = 'button';
            btn.dataset.index = idx;
            btn.disabled = false;
            btn.addEventListener('click', () => this.quizCtrl.selectAnswer(idx));
            li.appendChild(btn);
            this.choicesListEl.appendChild(li);
        });

        if (selected || timedOut) {
            const allButtons = this.choicesListEl.querySelectorAll('button');
            allButtons.forEach(buttonEl => {
                const btnIdx = parseInt(buttonEl.dataset.index, 10);
                buttonEl.disabled = true;
                if (selected) {
                    if (btnIdx === chosenIndex) {
                        buttonEl.style.background = isCorrect ? '#2ecc71' : '#e74c3c';
                    }
                    if (!isCorrect && btnIdx === question.answer) {
                        buttonEl.style.background = '#2ecc71';
                    }
                }
            });
            this.nextBtn.disabled = false;
        }

        this.timerEl.textContent = `${timeLeft}s`;
        this.timerEl.style.background = timeLeft <= 5
            ? (this.timerEl.style.background === '#e74c3c' ? '#c0392b' : '#e74c3c')
            : '#e74c3c';
    }

    /**
     * Called once the quiz finishes: save to high scores, replace history, show Results.
     */
    _renderResults({correctCount, incorrectCount}) {
        const total = correctCount + incorrectCount;
        const timestamp = Date.now();

        addScore({
            name: this.currentPlayer,
            quiz: this.currentQuizTitle,
            correct: correctCount,
            total: total,
            timestamp
        });

        history.replaceState({page: 'results'}, '', window.location);

        this.scoreTextEl.textContent = `Správně: ${correctCount} z ${total}`;
        import('./chartController.js').then(({drawResultsChart}) => {
            drawResultsChart(this.resultsCanvas, correctCount, incorrectCount);
        });
        this._showSection(this.resultsScreen);
    }

    /** Show the top-10 high scores. */
    _showHighScores() {
        history.replaceState({page: 'scores'}, '', window.location);

        const topEntries = getTopScores(10);
        this.highScoreList.innerHTML = '';

        if (topEntries.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Žádné výsledky zatím.';
            this.highScoreList.appendChild(li);
        } else {
            topEntries.forEach(entry => {
                const date = new Date(entry.timestamp);
                const formatted = date.toLocaleString('cs-CZ');
                const li = document.createElement('li');
                li.textContent =
                    `${entry.name} – ${entry.quiz} – ${entry.correct}/${entry.total} (${formatted})`;
                this.highScoreList.appendChild(li);
            });
        }

        this._showSection(this.scoresScreen);
    }
}
