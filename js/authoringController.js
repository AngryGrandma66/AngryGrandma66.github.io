// js/authoringController.js
import { saveCustomQuiz, getAllCustomQuizzes, getCustomQuiz } from './dataService.js';

export class AuthoringController {
    constructor({
                    onAuthorSaved // callback to notify UIController to rebuild the quiz list
                }) {
        this.onAuthorSaved = onAuthorSaved;

        // Grab DOM elements
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

        // Keep track of question‐block IDs
        this.nextQuestionId = 1;

        // Currently‐loaded quiz (for editing/export)
        this.currentRawQuiz = null;
        this.currentQuizId  = null;

        // Event listeners
        this.addQuestionBtn.addEventListener('click', () => this._addQuestionBlock());
        this.saveQuizBtn.addEventListener('click', () => this._saveQuiz());
        this.exportQuizBtn.addEventListener('click', () => this._exportCurrentQuiz());
        this.importQuizBtn.addEventListener('click', () => this.importFileInput.click());
        this.importFileInput.addEventListener('change', e => this._handleFileImport(e));
        this.createQuizBtn.addEventListener('click', () => this._showAuthoringScreen());
        this.authoringHomeBtn.addEventListener('click', () => this._hideAuthoringScreen());
    }

    /** Show authoring UI and clear fields for a brand-new quiz. */
    _showAuthoringScreen() {
        this.currentRawQuiz = null;
        this.currentQuizId  = null;
        this.newQuizNameInput.value = '';
        this.questionsContainer.innerHTML = '';
        this.nextQuestionId = 1;
        this._addQuestionBlock();
        this.authoringScreen.classList.add('active');
    }

    /** Hide authoring UI. */
    _hideAuthoringScreen() {
        this.authoringScreen.classList.remove('active');
    }

    /**
     * Load an existing quiz (by ID + raw) into the authoring form for editing.
     * prefillRaw must be: { name: string, questions: [ { text, right_answer, other_answers: [] } ] }.
     */
    loadQuizForEdit(quizId, prefillRaw) {
        this.currentQuizId  = quizId;
        this.currentRawQuiz = prefillRaw;

        this.newQuizNameInput.value = prefillRaw.name;
        this.questionsContainer.innerHTML = '';
        this.nextQuestionId = 1;

        // For each question, add a block with prefill
        prefillRaw.questions.forEach(question => {
            this._addQuestionBlock(question);
        });

        this.authoringScreen.classList.add('active');
    }

    /** Add one question input block. If `prefill` is provided, fill fields accordingly. */
    _addQuestionBlock(prefill = null) {
        const qid = this.nextQuestionId++;
        const wrapper = document.createElement('div');
        wrapper.classList.add('question-block');
        wrapper.dataset.qid = qid;

        wrapper.innerHTML = `
      <h4>Otázka ${qid}
        <button type="button" class="remove-question-btn" data-qid="${qid}">✖</button>
      </h4>
      <label for="question-text-${qid}">Text otázky:</label>
      <textarea id="question-text-${qid}" rows="2" required></textarea>

      <label for="correct-answer-${qid}">Správná odpověď:</label>
      <input id="correct-answer-${qid}" type="text" required />

      <label for="other-answers-${qid}">Ostatní odpovědi (oddělené čárkami):</label>
      <input id="other-answers-${qid}" type="text" placeholder="Např. odpověď A, odpověď B" required />
    `;

        // If prefill is provided, set those fields
        if (prefill) {
            wrapper.querySelector(`#question-text-${qid}`).value       = prefill.text;
            wrapper.querySelector(`#correct-answer-${qid}`).value      = prefill.right_answer;
            wrapper.querySelector(`#other-answers-${qid}`).value       = prefill.other_answers.join(', ');
        }

        // Wire up “remove” button
        wrapper.querySelector('.remove-question-btn').addEventListener('click', () => {
            this.questionsContainer.removeChild(wrapper);
        });

        this.questionsContainer.appendChild(wrapper);
    }

    /**
     * Validate inputs, build a rawQuiz, and save it (overwriting if editing).
     * rawQuiz = { name: string, questions: [ { text, right_answer, other_answers: [] } ] }
     */
    _saveQuiz() {
        const quizName = this.newQuizNameInput.value.trim();
        if (!quizName) {
            alert('Název kvízu nesmí být prázdný.');
            return;
        }

        let quizId = this.currentQuizId;
        const isEditing = !!quizId;

        // If not editing, generate a fresh ID
        if (!isEditing) {
            let baseId = quizName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
            quizId = baseId;
            const existing = getAllCustomQuizzes().map(q => q.id);
            let suffix = 1;
            while (existing.includes(quizId)) {
                quizId = `${baseId}-${suffix++}`;
            }
        }

        // Build questions array
        const blocks = Array.from(this.questionsContainer.querySelectorAll('.question-block'));
        if (blocks.length === 0) {
            alert('Přidejte prosím alespoň jednu otázku.');
            return;
        }

        const questions = [];
        for (const blk of blocks) {
            const qid = blk.dataset.qid;
            const textEl   = blk.querySelector(`#question-text-${qid}`);
            const correctEl= blk.querySelector(`#correct-answer-${qid}`);
            const otherEl  = blk.querySelector(`#other-answers-${qid}`);

            const textVal    = textEl.value.trim();
            const correctVal = correctEl.value.trim();
            const otherVal   = otherEl.value.trim();

            if (!textVal || !correctVal || !otherVal) {
                alert('Vyplňte prosím všechny pole u každé otázky.');
                return;
            }

            const otherArr = otherVal.split(',').map(s => s.trim()).filter(s => s);
            if (otherArr.length < 1) {
                alert('Musíte uvést alespoň jednu “ostatní odpověď” oddělenou čárkou.');
                return;
            }

            if (otherArr.includes(correctVal)) {
                alert('Správná odpověď se nesmí objevit mezi “ostatními odpověďmi.”');
                return;
            }

            questions.push({
                text: textVal,
                right_answer: correctVal,
                other_answers: otherArr
            });
        }

        const rawQuiz = {
            name: quizName,
            questions
        };

        // Save (overwrite if editing)
        saveCustomQuiz(quizId, rawQuiz);

        this.currentRawQuiz = rawQuiz;
        this.currentQuizId  = quizId;

        const verb = isEditing ? 'upraven' : 'uložen';
        alert(`Kvíz “${quizName}” byl ${verb} (ID: ${quizId}).`);

        // Notify UIController so it can rebuild the quiz list
        if (typeof this.onAuthorSaved === 'function') {
            this.onAuthorSaved();
        }
    }

    /** Download the currently-loaded quiz as JSON. */
    _exportCurrentQuiz() {
        if (!this.currentRawQuiz || !this.currentQuizId) {
            alert('Nejdříve uložte kvíz pomocí “Uložit kvíz.”');
            return;
        }
        const filename = `${this.currentQuizId}.json`;
        const blob = new Blob([ JSON.stringify(this.currentRawQuiz, null, 2) ], {
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
     * Import a quiz from a .json file: read, validate, upsert under a new unique ID.
     */
    _handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            let raw;
            try {
                raw = JSON.parse(reader.result);
                // Validate raw shape
                if (
                    typeof raw.name !== 'string' ||
                    !Array.isArray(raw.questions) ||
                    raw.questions.some(q => (
                        typeof q.text !== 'string' ||
                        typeof q.right_answer !== 'string' ||
                        !Array.isArray(q.other_answers)
                    ))
                ) {
                    throw new Error('Neplatný formát kvízu.');
                }
            } catch (err) {
                alert('Chyba při načítání JSON: ' + err.message);
                this.importFileInput.value = '';
                return;
            }

            // Create a new unique ID from filename
            let baseId = file.name.replace(/\.json$/i, '').toLowerCase().replace(/\s+/g, '-')
                .replace(/[^a-z0-9\-]/g, '');
            let quizId = baseId;
            const existing = getAllCustomQuizzes().map(q => q.id);
            let suffix = 1;
            while (existing.includes(quizId)) {
                quizId = `${baseId}-${suffix++}`;
            }

            saveCustomQuiz(quizId, raw);
            alert(`Kvíz “${raw.name}” byl importován (ID: ${quizId}).`);

            // Trigger UIController refresh
            if (typeof this.onAuthorSaved === 'function') {
                this.onAuthorSaved();
            }

            this.importFileInput.value = '';
        };
        reader.readAsText(file);
    }
}
