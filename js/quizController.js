// js/quizController.js
import { loadQuizData } from './dataService.js';
import { playMusic, stopMusic, playFinishSound } from './audioController.js';

const TIME_LIMIT = 15; // default seconds per question

export class QuizController {
    constructor({
                    onQuizLoaded,
                    onQuestionRendered,
                    onQuizFinished
                }) {
        this.onQuizLoaded       = onQuizLoaded;
        this.onQuestionRendered = onQuestionRendered;
        this.onQuizFinished     = onQuizFinished;

        this.currentQuiz   = null;
        this.currentIndex  = 0;
        this.correctCount  = 0;
        this.answers       = [];
        this.questionTimer = null;
        this.timeLeft      = 0;
    }

    /**
     * Increase the remaining time for the current question
     * by extraSeconds. Called by UI when media metadata loads.
     */
    extendTimer(extraSeconds) {
        if (this.questionTimer) {
            this.timeLeft += extraSeconds;
        }
    }

    /**
     * Abort any ongoing quiz:
     * - clear the per‐question timer
     * - stop background music
     * - reset internal state
     */
    abortQuiz() {
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
            this.questionTimer = null;
        }
        stopMusic();
        this.currentQuiz  = null;
        this.currentIndex = 0;
        this.correctCount = 0;
        this.answers      = [];
        this.timeLeft     = 0;
    }

    /**
     * Start a new quiz for `topic`.
     * If another quiz is already running, abort it first.
     */
    startQuiz(topic) {
        // If a quiz is in progress, cancel it before loading a new one
        if (this.currentQuiz) {
            this.abortQuiz();
        }

        loadQuizData(topic)
            .then(data => {
                this.currentQuiz   = data;
                this.currentIndex  = 0;
                this.correctCount  = 0;
                this.answers       = [];
                playMusic();
                this.onQuizLoaded(data);
                this._renderCurrentQuestion();
            })
            .catch(err => {
                alert(err.message);
            });
    }

    /** Internal: render the current question and start its timer */
    _renderCurrentQuestion() {
        clearInterval(this.questionTimer);

        const totalQ = this.currentQuiz.questions.length;
        const qObj   = this.currentQuiz.questions[this.currentIndex];

        // Initialize timeLeft to TIME_LIMIT (media will add on via extendTimer)
        this.timeLeft = TIME_LIMIT;
        this.onQuestionRendered({
            question: qObj,
            index:    this.currentIndex,
            total:    totalQ,
            timeLeft: this.timeLeft
        });

        // Start countdown
        this.questionTimer = setInterval(() => {
            this.timeLeft -= 1;
            this.onQuestionRendered({
                question: qObj,
                index:    this.currentIndex,
                total:    totalQ,
                timeLeft: this.timeLeft
            });
            if (this.timeLeft <= 0) {
                clearInterval(this.questionTimer);
                this._autoSkip();
            }
        }, 1000);
    }

    /**
     * Called by UI when user clicks a choice.
     * @param {number} chosenIndex
     */
    selectAnswer(chosenIndex) {
        clearInterval(this.questionTimer);
        const qObj = this.currentQuiz.questions[this.currentIndex];
        const isCorrect = chosenIndex === qObj.answer;
        if (isCorrect) this.correctCount++;
        this.answers.push(isCorrect);

        this.onQuestionRendered({
            question: qObj,
            index:    this.currentIndex,
            total:    this.currentQuiz.questions.length,
            timeLeft: this.timeLeft,
            selected: true,
            isCorrect,
            chosenIndex
        });
    }

    /** Internal: When the timer reaches zero, mark as incorrect. */
    _autoSkip() {
        this.answers.push(false);
        this.onQuestionRendered({
            question: this.currentQuiz.questions[this.currentIndex],
            index:    this.currentIndex,
            total:    this.currentQuiz.questions.length,
            timeLeft: 0,
            timedOut: true
        });
    }

    /** Called by UI when “Next” is clicked. */
    nextQuestion() {
        clearInterval(this.questionTimer);
        this.currentIndex++;
        if (this.currentIndex < this.currentQuiz.questions.length) {
            this._renderCurrentQuestion();
        } else {
            // Quiz finished: stop music, play finish sound, then callback
            stopMusic();
            playFinishSound();
            const incorrectCount = this.currentQuiz.questions.length - this.correctCount;
            this.onQuizFinished({
                correctCount: this.correctCount,
                incorrectCount
            });
        }
    }
}
