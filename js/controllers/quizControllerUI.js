
export class QuizControllerUI {
    constructor(app) {
        this.app = app;


        this.lastIndex = -1;


        this.quizTitleEl    = document.getElementById('quiz-title');
        this.progressTextEl = document.getElementById('progress-text');
        this.progressBarEl  = document.getElementById('progress-bar');
        this.timerEl        = document.getElementById('timer');
        this.questionTextEl = document.getElementById('question-text');
        this.choicesListEl  = document.getElementById('choices-list');
        this.nextBtn        = document.getElementById('next-btn');
        this.homeBtn        = document.getElementById('home-btn');


        this.nextBtn.addEventListener('click', () => {
            this.app.quizLogic.nextQuestion();
        });
        this.homeBtn.addEventListener('click', () => {
            this.app.quizLogic.abortQuiz();
            this.app.backToHome();
        });
    }


    handleQuizLoaded(data) {
        this.lastIndex = -1;

                const mediaContainer = document.getElementById('media-container');
          if (mediaContainer) mediaContainer.innerHTML = '';

                this.quizTitleEl.textContent = `Kvíz: ${data.title}`;
            this.progressBarEl.max = data.questions.length;
            this.app.showSection(this.app.quizScreen);
    }

    renderQuestion(state) {
        const { question, index, total, timeLeft, selected, isCorrect, chosenIndex, timedOut } = state;
        const mediaContainer = document.getElementById('media-container');

        if (index !== this.lastIndex) {
            mediaContainer.innerHTML = '';

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

                    mediaElem.addEventListener('loadedmetadata', () => {
                        const extraSec = Math.ceil(mediaElem.duration);
                        this.app.quizLogic.extendTimer(extraSec);
                    });

                    mediaContainer.appendChild(mediaElem);
                }
            }


            this.lastIndex = index;
        }


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
            btn.addEventListener('click', () => this.app.quizLogic.selectAnswer(idx));
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
}
