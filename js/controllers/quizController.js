
import { loadQuizData } from '../dataService.js';
import { playMusic, stopMusic, playFinishSound } from './audioController.js';

const TIME_LIMIT = 15;

/**
 * Construct a new QuizController, wiring up callbacks for loaded quizzes, question renders, and finish.
 * @param {{onQuizLoaded:Function,onQuestionRendered:Function,onQuizFinished:Function}} callbacks
 * @constructor
 */
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
     * When media (audio/video) loads, extend the question timer so the player
     * can listen/watch before time runs out.
     * @param {number} extraSeconds – additional seconds to add to timeLeft
     */
    extendTimer(extraSeconds) {
        if (this.questionTimer) {
            this.timeLeft += extraSeconds;
        }
    }

    /**
     * Stop any running question‐timer, stop background music,
     * and reset all quiz‐related state (index, score, answers, timeLeft).
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
     * Load quiz data (builtin or custom) for the given topic ID,
     * initialize counters, start background music, and render first question.
     * @param {string} topic – the quiz file/key to load (e.g. "afrika" or a custom ID)
     */
    startQuiz(topic) {
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


    /**
     * Show the next question on screen, reset and start the countdown timer,
     * and invoke the UI callback so that UI can update question text,
     * choices, progress, and attach media element if present.
     * This method is called internally whenever we move to a new question.
     * @Private helper—naming convention: underscore = “internal only.”
     */
    _renderCurrentQuestion() {
        clearInterval(this.questionTimer);

        const totalQ = this.currentQuiz.questions.length;
        const qObj   = this.currentQuiz.questions[this.currentIndex];


        this.timeLeft = TIME_LIMIT;
        this.onQuestionRendered({
            question: qObj,
            index:    this.currentIndex,
            total:    totalQ,
            timeLeft: this.timeLeft
        });


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
     * Called when user clicks on a choice button.
     * Clears the countdown timer, records whether that choice was correct,
     * updates the correctCount if needed, and signals the UI to show feedback.
     * @param {number} chosenIndex – index of the clicked choice
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

    /**
     * Called when the timer reaches zero without a selection.
     * Record a “false” (wrong) answer and send a render event to the UI
     * indicating a timed‐out state so that “next” button appears and choices
     * get disabled.
     * @Private helper.
     */
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

    /**
     * Advance to the next question. If there are still unanswered questions,
     * render the next one; otherwise, stop music, play finish‐sound, compute
     * correct/incorrect totals, and invoke the “quiz finished” callback.
     */
    nextQuestion() {
        clearInterval(this.questionTimer);
        this.currentIndex++;
        if (this.currentIndex < this.currentQuiz.questions.length) {
            this._renderCurrentQuestion();
        } else {

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
