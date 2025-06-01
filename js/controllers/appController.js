// js/controllers/appController.js
import { HomeController } from './homeController.js';
import { QuizControllerUI } from './quizControllerUI.js';
import { ResultsController } from './resultsController.js';
import { ScoresController } from './scoresController.js';
import { ControlPanelController } from './controlPanelController.js';
import { AuthoringController } from './authoringController.js';
import { QuizController } from '../quizController.js';
import { addScore } from '../scoreService.js';
import {
    stopMusic,
    toggleMusicMute,
    toggleEffectsMute,
    isMusicMuted,
    isEffectsMuted
} from '../audioController.js';

export class AppController {
    constructor() {
        // 1) Grab all <section> elements
        this.homeScreen         = document.getElementById('home-screen');
        this.quizScreen         = document.getElementById('quiz-screen');
        this.resultsScreen      = document.getElementById('results-screen');
        this.scoresScreen       = document.getElementById('scores-screen');
        this.controlPanelScreen = document.getElementById('control-panel-screen');
        this.authoringScreen    = document.getElementById('authoring-screen');

        // 2) Instantiate sub‐controllers, passing a reference to “this”
        this.homeCtrl         = new HomeController(this);
        this.quizUI           = new QuizControllerUI(this);
        this.resultsCtrl      = new ResultsController(this);
        this.scoresCtrl       = new ScoresController(this);
        this.controlPanelCtrl = new ControlPanelController(this);
        this.authoringCtrl    = new AuthoringController({
            onAuthorSaved: () => this.homeCtrl.buildQuizList()
        });

        // 3) Wire up “Sound/Theme Controls”
        const musicBtn   = document.getElementById('toggle-music-btn');
        const effectsBtn = document.getElementById('toggle-effects-btn');
        if (musicBtn) {
            musicBtn.textContent = isMusicMuted() ? 'Unmute Music' : 'Mute Music';
            musicBtn.addEventListener('click', () => {
                const nowMuted = toggleMusicMute();
                musicBtn.textContent = nowMuted ? 'Unmute Music' : 'Mute Music';
            });
        }
        if (effectsBtn) {
            effectsBtn.textContent = isEffectsMuted() ? 'Unmute Effects' : 'Mute Effects';
            effectsBtn.addEventListener('click', () => {
                const nowMuted = toggleEffectsMute();
                effectsBtn.textContent = nowMuted ? 'Unmute Effects' : 'Mute Effects';
            });
        }

        // 4) Wire up the new “persistent” navbar buttons
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

        // 5) Instantiate the “logic” QuizController (no UI here)
        this.quizLogic = new QuizController({
            onQuizLoaded: data    => this.quizUI.handleQuizLoaded(data),
            onQuestionRendered: st => this.quizUI.renderQuestion(st),
            onQuizFinished: resultsObj => this.handleResults(resultsObj)
        });

        // 6) Setup history/navigation
        history.replaceState({ page: 'home' }, '', window.location.pathname);
        window.addEventListener('popstate', event => this._onPopState(event));

        // 7) Show Home initially
        this.showSection(this.homeScreen);
    }

    /** Hide all sections, then show exactly the one passed in. */
    showSection(sectionEl) {
        [
            this.homeScreen,
            this.quizScreen,
            this.resultsScreen,
            this.scoresScreen,
            this.controlPanelScreen,
            this.authoringScreen
        ].forEach(sec => sec.classList.toggle('active', sec === sectionEl));
    }

    /** Called when user clicks “Play” on any screen; starts the quiz. */
    startQuiz(topicId, titleLabel) {
        this.quizLogic.abortQuiz();
        stopMusic();
        this.currentPlayer   = this.homeCtrl.getPlayerName();
        this.currentQuizTitle = titleLabel;
        this.currentQuizId   = topicId;

        history.pushState({ page: 'quiz', topic: topicId }, '', `?quiz=${topicId}`);
        this.quizLogic.startQuiz(topicId);
    }

    /** Called when quiz JSON is loaded (delegated to quizUI). */
    handleQuizLoaded(data) {
        this.showSection(this.quizScreen);
    }

    /** Called after quiz finishes (delegated to results). */
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
        this.resultsCtrl.show(resultsObj, this.currentPlayer, this.currentQuizTitle);
    }

    /** Show the high‐scores screen. */
    showScores() {
        history.pushState({ page: 'scores' }, '', window.location);
        this.scoresCtrl.show();
    }

    /** Show the control‐panel (manage custom quizzes). */
    showControlPanel() {
        this.quizLogic.abortQuiz();
        stopMusic();
        history.pushState({ page: 'control' }, '', window.location);
        this.controlPanelCtrl.show();
    }

    /** Show a blank authoring screen (“Create Quiz”). */
    showAuthoringBlank() {
        history.pushState({ page: 'authoring' }, '', window.location);
        this.showSection(this.authoringScreen);
        this.authoringCtrl.loadQuizForEdit(null, null);
    }

    /** Show the authoring form filled with an existing quiz. */
    showAuthoringEdit(id, raw) {
        history.pushState({ page: 'authoring' }, '', window.location);
        this.showSection(this.authoringScreen);
        this.authoringCtrl.loadQuizForEdit(id, raw);
    }

    /** Navigate back to Home (rebuild list). */
    backToHome() {
        history.replaceState({ page: 'home' }, '', window.location.pathname);
        this.homeCtrl.buildQuizList();
        this.showSection(this.homeScreen);
    }

    /** Handle browser back/forward. */
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
