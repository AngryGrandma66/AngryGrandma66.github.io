
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
/**
 * Initialize the authoring form:
 *   • Keep references to DOM elements: quiz name input, questions container, buttons
 *   • Create and insert a “nameErrorDiv” for inline validation messages
 *   • Bind click events for Add‐Question, Save‐Quiz, Export‐Quiz, Import‐File
 *   • “Create quiz” button participates in showing blank authoring screen
 *   • “Back to Home” button goes back in history
 * @param {Object} opts.onAuthorSaved – callback to run after a quiz is saved/imported
 */
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


    /**
     * Show a blank authoring form for creating a new quiz: clear name, questions, and reset counters.
     * @private
     */
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


    /**
     * Prefill the authoring form with a saved quiz:
     *   • Set currentQuizId and store raw object
     *   • Put quiz name into input
     *   • For each question in prefillRaw.questions, call
     *     addQuestionBlockHTML to generate a block (text, correct, others, media preview)
     *   • Clear any existing validation messages
     *   • Show the authoring section
     * @param {string} quizId – the key under which this custom quiz is stored
     * @param {Object} prefillRaw – the raw quiz data { name, questions: […] }
     */
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
    /**
     * Create one “question‐block” UI element (with text area, inputs for correct/other answers, optional media preview),
     * then append it to the questionsContainer.
     * If prefill is provided, fill in fields and show existing media preview.
     * @param {Object|null} prefill – a question object from raw quiz (optional)
     */
    _addQuestionBlock(prefill = null) {
        addQuestionBlockHTML(this.nextQuestionId++, this.questionsContainer, prefill);
    }

    /**
     * Validate the quiz:
     *   1) Ensure quiz name is non‐empty and ≤ 30 chars
     *   2) Ensure there’s at least one question block
     *   3) For each question block, run validateAllQuestionBlocks to:
     *       – Check non‐empty question text (≥ 5 chars)
     *       – Check correct answer is non‐empty
     *       – Check at least 2 “other answers,” no duplicates, and correctAnswer not among them
     *       – Check uploaded media is ≤ 5 MB and an audio/video type
     *   4) If there are media files, read them as Data URLs asynchronously (promises)
     * Once validation passes, assemble a raw quiz object, persist it to localStorage (saveCustomQuiz),
     * show a green “quiz saved” message for 3s, and call onAuthorSaved() so HomeController can rebuild its list.
     */
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
    /**
     * Derive a safe ID from the quizName:
     *   – Lowercase, replace spaces with dashes, strip invalid chars
     *   – If that ID already exists in localStorage, append -1, -2, etc.
     * Return a new unique string to use as the custom quiz key.
     * @param {string} quizName
     * @returns {string}
     */
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
    /**
     * If currentRawQuiz exists, stringify it and trigger a download via a temporary <a> element.
     * If not saved yet, display an error under the name input.
     */
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

    /**
     * When the user selects a JSON file in “Import quiz,” read it via FileReader,
     * validate its structure (name must be non‐empty string, questions array must be non‐empty, etc.),
     * ensure each question object has valid text, right_answer, other_answers, and optional media fields;
     * if valid, generate a unique ID and call saveCustomQuiz → localStorage, show a “Quiz imported” message in green,
     * call onSuccess so HomeController can update its list.
     * If any validation fails, show an appropriate error in nameErrorDiv.
     * @param {Event} event – the change event on the file input
     */
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
