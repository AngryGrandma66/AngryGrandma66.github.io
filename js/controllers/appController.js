// js/controllers/appController.js
import {HomeController} from './homeController.js';
import {QuizControllerUI} from './quizControllerUI.js';
import {ResultsController} from './resultsController.js';
import {ScoresController} from './scoresController.js';
import {ControlPanelController} from './controlPanelController.js';
import {AuthoringController} from './authoringController.js';
import {QuizController} from '../quizController.js';
import {stopMusic} from '../audioController.js';
import {addScore} from '../scoreService.js';

export class AppController {
    constructor() {
        // 1) Grab all <section> elements
        this.homeScreen = document.getElementById('home-screen');
        this.quizScreen = document.getElementById('quiz-screen');
        this.resultsScreen = document.getElementById('results-screen');
        this.scoresScreen = document.getElementById('scores-screen');
        this.controlPanelScreen = document.getElementById('control-panel-screen');
        this.authoringScreen = document.getElementById('authoring-screen');

        // 2) Instantiate sub‐controllers, passing a reference to “this” for navigation
        this.homeCtrl = new HomeController(this);
        this.quizUI = new QuizControllerUI(this);
        this.resultsCtrl = new ResultsController(this);
        this.scoresCtrl = new ScoresController(this);
        this.controlPanelCtrl = new ControlPanelController(this);
        this.authoringCtrl = new AuthoringController({onAuthorSaved: () => this.homeCtrl.buildQuizList()});

        // 3) Instantiate the “logic” quizController separately (no UI here)
        this.quizLogic = new QuizController({
            onQuizLoaded: data => this.quizUI.handleQuizLoaded(data),
            onQuestionRendered: state => this.quizUI.renderQuestion(state),
            onQuizFinished: results => this.handleResults(results)
        });

        // 4) Setup history/navigation
        history.replaceState({page: 'home'}, '', window.location.pathname);
        window.addEventListener('popstate', event => this._onPopState(event));

        // 5) Show Home initially
        this.showSection(this.homeScreen);
    }

    /** Central method to hide all sections, then show exactly one. */
    showSection(sectionEl) {
        [this.homeScreen,
            this.quizScreen,
            this.resultsScreen,
            this.scoresScreen,
            this.controlPanelScreen,
            this.authoringScreen
        ].forEach(sec => sec.classList.toggle('active', sec === sectionEl));
    }

    /** Called when user clicks “Play” on any screen; kicks off the quiz. */
    startQuiz(topicId, titleLabel) {
        // Always abort and stop any previous quiz/music:
        this.quizLogic.abortQuiz();
        stopMusic();

        this.currentPlayer = this.homeCtrl.getPlayerName();
        this.currentQuizTitle = titleLabel;
        this.currentQuizId = topicId;

        history.pushState({page: 'quiz', topic: topicId}, '', `?quiz=${topicId}`);
        this.quizLogic.startQuiz(topicId);
    }

    /** Called when quiz JSON is loaded (delegated to quizUI). */
    handleQuizLoaded(data) {
        this.showSection(this.quizScreen);
    }

    /** Called after quiz finishes (delegated to results). */
    handleResults(resultsObj) {
        // Pull correctCount / incorrectCount out of the passed-in object:
        const {correctCount, incorrectCount} = resultsObj;
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
        this.resultsCtrl.show(resultsObj, this.currentPlayer, this.currentQuizTitle);
    }

    /** Called when “View High Scores” is clicked. */
    showScores() {
        history.pushState({page: 'scores'}, '', window.location);
        this.scoresCtrl.show();
    }

    /** Called when “Manage Quizzes” is clicked. */
    showControlPanel() {
        // Stop any running quiz/music:
        this.quizLogic.abortQuiz();
        stopMusic();

        history.pushState({page: 'control'}, '', window.location);
        this.controlPanelCtrl.show();
    }

    /** Called when “Create Quiz” is clicked. */
    showAuthoringBlank() {
        history.pushState({page: 'authoring'}, '', window.location);
        this.authoringCtrl.loadQuizForEdit(null, null);
        this.showSection(this.authoringScreen);
    }

    /** Called when editing an existing quiz. */
    showAuthoringEdit(id, raw) {
        history.pushState({page: 'authoring'}, '', window.location);
        this.authoringCtrl.loadQuizForEdit(id, raw);
        this.showSection(this.authoringScreen);
    }

    /** Navigate back to Home (rebuild list). */
    backToHome() {
        history.replaceState({page: 'home'}, '', window.location.pathname);
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
            // Prevent re‐entry; go Home instead
            this.quizLogic.abortQuiz();
            stopMusic();
            history.replaceState({page: 'home'}, '', window.location.pathname);
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
