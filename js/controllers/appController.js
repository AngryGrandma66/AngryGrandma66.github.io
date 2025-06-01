import { HomeController } from './homeController.js';
import { QuizControllerUI } from './quizControllerUI.js';
import { ResultsController } from './resultsController.js';
import { ScoresController } from './scoresController.js';
import { ControlPanelController } from './controlPanelController.js';
import { AuthoringController } from './authoringController.js';
import { QuizController } from './quizController.js';
import { addScore } from '../scoreService.js';
import {
    stopMusic,
    toggleMusicMute,
    toggleEffectsMute,
    isMusicMuted,
    isEffectsMuted
} from './audioController.js';
/**
 * Create the main application controller, wire up navigation and initialize sub‐controllers.
 * @constructor
 */
export class AppController {
    constructor() {

        this.homeScreen         = document.getElementById('home-screen');
        this.quizScreen         = document.getElementById('quiz-screen');
        this.resultsScreen      = document.getElementById('results-screen');
        this.scoresScreen       = document.getElementById('scores-screen');
        this.controlPanelScreen = document.getElementById('control-panel-screen');
        this.authoringScreen    = document.getElementById('authoring-screen');

        this.homeCtrl         = new HomeController(this);
        this.quizUI           = new QuizControllerUI(this);
        this.resultsCtrl      = new ResultsController(this);
        this.scoresCtrl       = new ScoresController(this);
        this.controlPanelCtrl = new ControlPanelController(this);
        this.authoringCtrl    = new AuthoringController({
            onAuthorSaved: () => this.homeCtrl.buildQuizList()
        });

        const musicBtn   = document.getElementById('toggle-music-btn');
        const effectsBtn = document.getElementById('toggle-effects-btn');

        function updateMusicIcon(isMuted) {
            document
                .getElementById('music-slash')
                .setAttribute('visibility', isMuted ? 'visible' : 'hidden');
        }

        function updateEffectsIcon(isMuted) {
            document
                .getElementById('effects-waves')
                .setAttribute('visibility', isMuted ? 'hidden' : 'visible');
            document
                .getElementById('effects-slash')
                .setAttribute('visibility', isMuted ? 'visible' : 'hidden');
        }

        if (musicBtn) {
            updateMusicIcon(isMusicMuted());

            musicBtn.addEventListener('click', () => {
                const nowMuted = toggleMusicMute();
                updateMusicIcon(nowMuted);
            });
        }

        if (effectsBtn) {
            updateEffectsIcon(isEffectsMuted());

            effectsBtn.addEventListener('click', () => {
                const nowMuted = toggleEffectsMute();
                updateEffectsIcon(nowMuted);
            });
        }
        const navHome   = document.getElementById('nav-home');
        const navScores = document.getElementById('nav-scores');
        const navManage = document.getElementById('nav-manage');
        if (navHome) {
            navHome.addEventListener('click', () => this.backToHome());
        }
        if (navScores) {
            navScores.addEventListener('click', () => this.showScores());
        }
        if (navManage) {
            navManage.addEventListener('click', () => this.showControlPanel());
        }

        this.quizLogic = new QuizController({
            onQuizLoaded: data    => this.quizUI.handleQuizLoaded(data),
            onQuestionRendered: st => this.quizUI.renderQuestion(st),
            onQuizFinished: resultsObj => this.handleResults(resultsObj)
        });

        history.replaceState({ page: 'home' }, '', window.location.pathname);
        window.addEventListener('popstate', event => this._onPopState(event));


        this.showSection(this.homeScreen);
    }

    /**
     * Hide all screens and show just the given section element.
     * @param {HTMLElement} sectionEl ‒ the section to display
     */    showSection(sectionEl) {
        [
            this.homeScreen,
            this.quizScreen,
            this.resultsScreen,
            this.scoresScreen,
            this.controlPanelScreen,
            this.authoringScreen
        ].forEach(sec => sec.classList.toggle('active', sec === sectionEl));
    }

    /**
     * Abort any ongoing quiz, stop music, record the chosen player name, and start a new quiz.
     * @param {string} topicId ‒ identifier of the quiz to start
     * @param {string} titleLabel ‒ display title for the quiz
     */    startQuiz(topicId, titleLabel) {
        this.quizLogic.abortQuiz();
        stopMusic();
        this.currentPlayer   = this.homeCtrl.getPlayerName();
        this.currentQuizTitle = titleLabel;
        this.currentQuizId   = topicId;

        history.pushState({ page: 'quiz', topic: topicId }, '', `?quiz=${topicId}`);
        this.quizLogic.startQuiz(topicId);
    }


    /**
     * After the quiz ends, compute results, store the score, and advance to the results screen.
     * @param {{correctCount:number, incorrectCount:number}} resultsObj ‒ counts of correct vs. incorrect answers
     */
    handleResults(resultsObj) {
        const { correctCount, incorrectCount } = resultsObj;
        const total     = correctCount + incorrectCount;
        const timestamp = Date.now();

        addScore({
            name: this.currentPlayer,
            quiz: this.currentQuizTitle,
            correct: correctCount,
            total: total,
            timestamp
        });

        history.replaceState({ page: 'results' }, '', window.location);
        this.resultsCtrl.show(resultsObj );
    }

    /**
     * Abort any ongoing quiz and show the high‐score screen.
     */    showScores() {
        this.quizLogic.abortQuiz();
        stopMusic();
        history.pushState({ page: 'scores' }, '', window.location);
        this.scoresCtrl.show();
    }

    /**
     * Abort any ongoing quiz and show the control‐panel screen for editing custom quizzes.
     */    showControlPanel() {
        this.quizLogic.abortQuiz();
        stopMusic();
        history.pushState({ page: 'control' }, '', window.location);
        this.controlPanelCtrl.show();
    }

    /**
     * Show an empty authoring form for creating a brand‐new quiz.
     */    showAuthoringBlank() {
        history.pushState({ page: 'authoring' }, '', window.location);
        this.showSection(this.authoringScreen);
        this.authoringCtrl.loadQuizForEdit(null, null);
    }

    /**
     * Show the authoring form pre‐filled with an existing quiz for editing.
     * @param {string} id ‒ the quiz ID to edit
     * @param {Object} raw ‒ the raw quiz object to prefill
     */
    showAuthoringEdit(id, raw) {
        history.pushState({ page: 'authoring' }, '', window.location);
        this.showSection(this.authoringScreen);
        this.authoringCtrl.loadQuizForEdit(id, raw);
    }

    /**
     * Abort any ongoing quiz, rebuild the home quiz list, and show the home screen.
     */
    backToHome() {
               this.quizLogic.abortQuiz();
               stopMusic();

                    history.replaceState({ page: 'home' }, '', window.location.pathname);
                this.homeCtrl.buildQuizList();
                this.showSection(this.homeScreen);
    }


    /**
     * Handle browser back/forward navigation events.
     * @param {PopStateEvent} event ‒ the popstate event object
     * @private
     */
    _onPopState(event) {
        const state = event.state;
        if (!state || state.page === 'home') {
            this.quizLogic.abortQuiz();
            stopMusic();
            this.homeCtrl.buildQuizList();
            this.showSection(this.homeScreen);

        } else if (state.page === 'quiz') {
            this.quizLogic.abortQuiz();
            stopMusic();
            history.replaceState({ page: 'home' }, '', window.location.pathname);
            this.homeCtrl.buildQuizList();
            this.showSection(this.homeScreen);

        } else if (state.page === 'results') {
            this.showSection(this.resultsScreen);

        } else if (state.page === 'scores') {
            this.scoresCtrl.show();

        } else if (state.page === 'control') {
            this.quizLogic.abortQuiz();
            stopMusic();
            this.controlPanelCtrl.show();

        } else if (state.page === 'authoring') {
            this.showSection(this.authoringScreen);
        }
    }
}
