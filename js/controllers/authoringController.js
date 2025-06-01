
import { getAllCustomQuizzes, saveCustomQuiz } from '../dataService.js';
import {
    addQuestionBlockHTML,
    clearNameError,
    clearAllQuestionErrors,
    validateQuizName,
    validateAllQuestionBlocks,
    assembleQuestionsArray,
    showTemporarySuccessMessage,
    handleImportFile
} from './authoringHelpers.js';

export class AuthoringController {
    constructor({ onAuthorSaved }) {
        this.onAuthorSaved = onAuthorSaved;

        this.authoringScreen    = document.getElementById('authoring-screen');
        this.newQuizNameInput   = document.getElementById('new-quiz-name');
        this.questionsContainer = document.getElementById('questions-container');
        this.addQuestionBtn     = document.getElementById('add-question-btn');
        this.saveQuizBtn        = document.getElementById('save-quiz-btn');
        this.exportQuizBtn      = document.getElementById('export-quiz-btn');
        this.importFileInput    = document.getElementById('import-file-input');
        this.importQuizBtn      = document.getElementById('import-quiz-btn');
        this.createQuizBtn      = document.getElementById('create-quiz-btn');
        this.authoringHomeBtn   = document.getElementById('authoring-home-btn');

        this.nameErrorDiv = document.createElement('div');
        this.nameErrorDiv.classList.add('field-error');
        this.nameErrorDiv.style.color = 'red';
        this.nameErrorDiv.style.fontSize = '0.9rem';
        this.nameErrorDiv.style.marginTop = '0.25rem';
        this.newQuizNameInput.insertAdjacentElement('afterend', this.nameErrorDiv);

        this.nextQuestionId = 1;
        this.currentRawQuiz = null;
        this.currentQuizId  = null;

        this.addQuestionBtn.addEventListener('click', () => this._addQuestionBlock());
        this.saveQuizBtn.addEventListener('click', () => this._saveQuiz());
        this.exportQuizBtn.addEventListener('click', () => this._exportCurrentQuiz());
        this.importQuizBtn.addEventListener('click', () => this.importFileInput.click());
        this.importFileInput.addEventListener('change', (e) => this._handleFileImport(e));
        this.createQuizBtn.addEventListener('click', () => this._showAuthoringScreen());
        this.authoringHomeBtn.addEventListener('click', () => {
            window.history.back();
        });  }

    _showAuthoringScreen() {
        this.currentRawQuiz    = null;
        this.currentQuizId     = null;
        this.newQuizNameInput.value = '';
        this.questionsContainer.innerHTML = '';
        this.nextQuestionId    = 1;

        clearNameError(this.nameErrorDiv);
        clearAllQuestionErrors(this.questionsContainer);

        this._addQuestionBlock();
        this.authoringScreen.classList.add('active');
    }


    loadQuizForEdit(quizId, prefillRaw) {
        this.currentQuizId  = quizId;
        this.currentRawQuiz = prefillRaw;

        this.newQuizNameInput.value = prefillRaw.name;

        this.questionsContainer.innerHTML = '';
        this.nextQuestionId = 1;

        prefillRaw.questions.forEach((question) => {
             addQuestionBlockHTML(this.nextQuestionId++, this.questionsContainer, question);
        });

        clearNameError(this.nameErrorDiv);
        clearAllQuestionErrors(this.questionsContainer);
        this.authoringScreen.classList.add('active');
    }

    _addQuestionBlock(prefill = null) {
        addQuestionBlockHTML(this.nextQuestionId++, this.questionsContainer, prefill);
    }

    _saveQuiz() {
        clearNameError(this.nameErrorDiv);
        clearAllQuestionErrors(this.questionsContainer);

        const quizName = this.newQuizNameInput.value.trim();
        const { hasNameError, nameErrorMsg } = validateQuizName(quizName);
        if (hasNameError) {
            this.nameErrorDiv.textContent = nameErrorMsg;
            return;
        }

        let quizId = this.currentQuizId;
        const isEditing = !!quizId;
        if (!isEditing) {
            quizId = this._generateUniqueQuizId(quizName);
        }

        const blocks = Array.from(this.questionsContainer.querySelectorAll('.question-block'));
        if (blocks.length === 0) {
            this.nameErrorDiv.textContent = 'Musíte přidat alespoň jednu otázku.';
            return;
        }

        const { hasFieldErrors, mediaPromises } = validateAllQuestionBlocks(blocks);
        if (hasFieldErrors) {
            return;
        }

        Promise.all(mediaPromises)
            .then((mediaArray) => {
                const questions = assembleQuestionsArray(blocks, mediaArray);

                const rawQuiz = { name: quizName, questions };
                saveCustomQuiz(quizId, rawQuiz);
                this.currentRawQuiz = rawQuiz;
                this.currentQuizId  = quizId;

                showTemporarySuccessMessage(
                    this.nameErrorDiv,
                    `Kvíz “${quizName}” byl ${isEditing ? 'upraven' : 'uložen'}. (ID: ${quizId})`
                );

                if (typeof this.onAuthorSaved === 'function') {
                    this.onAuthorSaved();
                }
            })
            .catch((err) => {
                if (blocks.length > 0) {
                    const firstQid = blocks[0].dataset.qid;
                    const mediaErrDiv = blocks[0].querySelector(`#media-error-${firstQid}`);
                    mediaErrDiv.textContent = `Chyba při načítání média: ${err.message}`;
                } else {
                    this.nameErrorDiv.textContent = `Chyba při načítání média: ${err.message}`;
                }
            });
    }

    _generateUniqueQuizId(quizName) {
        let baseId = quizName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-]/g, '')
            .trim();
        let quizId = baseId || 'quiz';
        const existing = getAllCustomQuizzes().map((q) => q.id);
        let suffix = 1;
        while (existing.includes(quizId)) {
            quizId = `${baseId}-${suffix++}`;
        }
        return quizId;
    }

    _exportCurrentQuiz() {
        if (!this.currentRawQuiz || !this.currentQuizId) {
            this.nameErrorDiv.textContent = 'Nejdříve uložte kvíz pomocí “Uložit kvíz.”';
            return;
        }
        const filename = `${this.currentQuizId}.json`;
        const blob = new Blob([JSON.stringify(this.currentRawQuiz, null, 2)], {
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
    }

    _handleFileImport(event) {
        handleImportFile(
            event,
            this.nameErrorDiv,
            (newId, newRaw) => {
                if (typeof this.onAuthorSaved === 'function') {
                    this.onAuthorSaved();
                }
            }
        );
    }
}
