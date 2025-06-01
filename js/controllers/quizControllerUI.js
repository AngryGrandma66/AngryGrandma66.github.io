// js/controllers/quizControllerUI.js
export class QuizControllerUI {
    constructor(app) {
        this.app = app;

        // Track which question index was last rendered
        this.lastIndex = -1;

        // Grab Quiz screen elements
        this.quizTitleEl    = document.getElementById('quiz-title');
        this.progressTextEl = document.getElementById('progress-text');
        this.progressBarEl  = document.getElementById('progress-bar');
        this.timerEl        = document.getElementById('timer');
        this.questionTextEl = document.getElementById('question-text');
        this.choicesListEl  = document.getElementById('choices-list');
        this.nextBtn        = document.getElementById('next-btn');
        this.homeBtn        = document.getElementById('home-btn');

        // Wire up “Next” and “Home” in the quiz screen
        this.nextBtn.addEventListener('click', () => {
            this.app.quizLogic.nextQuestion();
        });
        this.homeBtn.addEventListener('click', () => {
            this.app.quizLogic.abortQuiz();
            this.app.backToHome();
        });
    }

    /** Called by quizLogic when JSON is loaded. */
    handleQuizLoaded(data) {
        this.lastIndex = -1;
            // Also immediately clear any stray media element
                const mediaContainer = document.getElementById('media-container');
          if (mediaContainer) mediaContainer.innerHTML = '';

                this.quizTitleEl.textContent = `Kvíz: ${data.title}`;
            this.progressBarEl.max = data.questions.length;
            this.app.showSection(this.app.quizScreen);
    }

    /**
     * Renders the question (or feedback).
     * We clear/inject media only when the question index changes.
     *
     * `state` has { question, index, total, timeLeft, selected, isCorrect, chosenIndex, timedOut }.
     */
    renderQuestion(state) {
        const { question, index, total, timeLeft, selected, isCorrect, chosenIndex, timedOut } = state;
        const mediaContainer = document.getElementById('media-container');

        // If this is a new question index, clear any previous media
        if (index !== this.lastIndex) {
            mediaContainer.innerHTML = '';

            // If this question has media, inject it once
            if (question.media) {
                let mediaElem;
                if (question.media.type === 'audio') {
                    mediaElem = document.createElement('audio');
                    mediaElem.controls = true;
                } else if (question.media.type === 'video') {
                    mediaElem = document.createElement('video');
                    mediaElem.controls = true;
                    mediaElem.style.maxWidth = '100%';
                }

                if (mediaElem) {
                    mediaElem.src = question.media.url;

                    // Once metadata loads, extend the timer by the media's duration
                    mediaElem.addEventListener('loadedmetadata', () => {
                        const extraSec = Math.ceil(mediaElem.duration);
                        this.app.quizLogic.extendTimer(extraSec);
                    });

                    mediaContainer.appendChild(mediaElem);
                }
            }

            // Remember that we've handled this index
            this.lastIndex = index;
        }

        // Update progress text + bar
        this.progressTextEl.textContent = `Otázka ${index + 1} / ${total}`;
        this.progressBarEl.value = index + 1;

        // Show question text
        this.questionTextEl.textContent = question.text;
        this.choicesListEl.innerHTML = '';
        this.nextBtn.disabled = true;

        // Build choice buttons
        question.choices.forEach((choiceText, idx) => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.textContent = choiceText;
            btn.type = 'button';
            btn.dataset.index = idx;
            btn.disabled = false;
            btn.addEventListener('click', () => this.app.quizLogic.selectAnswer(idx));
            li.appendChild(btn);
            this.choicesListEl.appendChild(li);
        });

        // If already answered/timed out, disable & color the buttons
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

        // Update timer display (flash red if ≤5s)
        this.timerEl.textContent = `${timeLeft}s`;
        this.timerEl.style.background = timeLeft <= 5
            ? (this.timerEl.style.background === '#e74c3c' ? '#c0392b' : '#e74c3c')
            : '#e74c3c';
    }
}
