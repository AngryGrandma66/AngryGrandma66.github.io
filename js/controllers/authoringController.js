// js/controllers/authoringController.js
import {getAllCustomQuizzes, saveCustomQuiz} from '../dataService.js';

export class AuthoringController {
    constructor({onAuthorSaved}) {
        this.onAuthorSaved = onAuthorSaved;

        // Grab DOM elements
        this.authoringScreen = document.getElementById('authoring-screen');
        this.newQuizNameInput = document.getElementById('new-quiz-name');
        this.questionsContainer = document.getElementById('questions-container');
        this.addQuestionBtn = document.getElementById('add-question-btn');
        this.saveQuizBtn = document.getElementById('save-quiz-btn');
        this.exportQuizBtn = document.getElementById('export-quiz-btn');
        this.importFileInput = document.getElementById('import-file-input');
        this.importQuizBtn = document.getElementById('import-quiz-btn');
        this.createQuizBtn = document.getElementById('create-quiz-btn');
        this.authoringHomeBtn = document.getElementById('authoring-home-btn');

        this.nextQuestionId = 1;
        this.currentRawQuiz = null;
        this.currentQuizId = null;

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
        this.currentQuizId = null;
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
     * prefillRaw must be: { name: string, questions: [ { text, right_answer, other_answers: [], media? } ] }.
     */
    loadQuizForEdit(quizId, prefillRaw) {
        this.currentQuizId = quizId;
        this.currentRawQuiz = prefillRaw;

        // 1) Set quiz name
        this.newQuizNameInput.value = prefillRaw.name;

        // 2) Clear any existing question blocks
        this.questionsContainer.innerHTML = '';
        this.nextQuestionId = 1;

        // 3) For each question in raw, add a block with prefill, including media if any
        prefillRaw.questions.forEach(question => {
            this._addQuestionBlock(question);
        });

        // 4) Show the form
        this.authoringScreen.classList.add('active');
    }

    /**
     * Add one question input block. If `prefill` is provided, fill fields accordingly.
     * `prefill` can be { text, right_answer, other_answers: [], media? }.
     */
    _addQuestionBlock(prefill = null) {
        const qid = this.nextQuestionId++;
        const wrapper = document.createElement('div');
        wrapper.classList.add('question-block');
        wrapper.dataset.qid = qid;

        // If there’s existing media, stash it in data‐ attributes
        if (prefill && prefill.media) {
            wrapper.dataset.mediaUrl = prefill.media.url;
            wrapper.dataset.mediaType = prefill.media.type;
        }

        // Build inner HTML (text/correct/other + preview + file input)
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

    <div id="media-preview-${qid}"></div>

    <label for="media-file-${qid}">Přidat audio/video (MP3, MP4, atp.):</label>
    <input id="media-file-${qid}" type="file" accept="audio/*,video/*" />
  `;

        // If prefill was provided, fill text/answers + show existing media preview
        if (prefill) {
            wrapper.querySelector(`#question-text-${qid}`).value = prefill.text;
            wrapper.querySelector(`#correct-answer-${qid}`).value = prefill.right_answer;
            wrapper.querySelector(`#other-answers-${qid}`).value = prefill.other_answers.join(', ');

            if (prefill.media && prefill.media.url) {
                const previewContainer = wrapper.querySelector(`#media-preview-${qid}`);
                previewContainer.innerHTML = ''; // clear any existing

                if (prefill.media.type === 'audio') {
                    const audio = document.createElement('audio');
                    audio.src = prefill.media.url;
                    audio.controls = true;
                    previewContainer.appendChild(audio);
                } else if (prefill.media.type === 'video') {
                    const video = document.createElement('video');
                    video.src = prefill.media.url;
                    video.controls = true;
                    video.style.maxWidth = '100%';
                    previewContainer.appendChild(video);
                }
            }
        }

        // Wire up “remove” button
        wrapper.querySelector('.remove-question-btn')
            .addEventListener('click', () => {
                this.questionsContainer.removeChild(wrapper);
            });

        this.questionsContainer.appendChild(wrapper);
    }


    /**
     * Validate inputs, build a rawQuiz (including media Data URLs), and save it.
     * rawQuiz = { name: string, questions: [ { text, right_answer, other_answers: [], media? } ] }
     */
    _saveQuiz() {
        const quizName = this.newQuizNameInput.value.trim();
        if (!quizName) {
            alert('Název kvízu nesmí být prázdný.');
            return;
        }

        let quizId = this.currentQuizId;
        const isEditing = !!quizId;
        if (!isEditing) {
            let baseId = quizName
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9\-]/g, '');
            quizId = baseId;
            const existing = getAllCustomQuizzes().map(q => q.id);
            let suffix = 1;
            while (existing.includes(quizId)) {
                quizId = `${baseId}-${suffix++}`;
            }
        }

        const blocks = Array.from(this.questionsContainer.querySelectorAll('.question-block'));
        if (blocks.length === 0) {
            alert('Přidejte prosím alespoň jednu otázku.');
            return;
        }

        // Build an array of Promises for each question’s media:
        const mediaPromises = blocks.map(blk => {
            const qid = blk.dataset.qid;
            const fileInput = blk.querySelector(`#media-file-${qid}`);
            const file = fileInput.files[0];

            if (file) {
                // If a new file was chosen, read as Data URL
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const dataURL = reader.result;
                        const type = file.type.startsWith('video/') ? 'video' : 'audio';
                        resolve({type, url: dataURL});
                    };
                    reader.onerror = () => {
                        reject(reader.error);
                    };
                    reader.readAsDataURL(file);
                });
            } else {
                // No new file: fallback to existing data‐ attribute on wrapper
                const existingUrl = blk.dataset.mediaUrl || null;
                const existingType = blk.dataset.mediaType || null;
                if (existingUrl && existingType) {
                    return Promise.resolve({type: existingType, url: existingUrl});
                }
                return Promise.resolve(null);
            }
        });

        // Wait for all media “promises” (some may be null) to resolve
        Promise.all(mediaPromises)
            .then(mediaArray => {
                // Now build the questions array
                const questions = [];
                for (let i = 0; i < blocks.length; i++) {
                    const blk = blocks[i];
                    const qid = blk.dataset.qid;
                    const textEl = blk.querySelector(`#question-text-${qid}`);
                    const correctEl = blk.querySelector(`#correct-answer-${qid}`);
                    const otherEl = blk.querySelector(`#other-answers-${qid}`);

                    const textVal = textEl.value.trim();
                    const correctVal = correctEl.value.trim();
                    const otherVal = otherEl.value.trim();

                    if (!textVal || !correctVal || !otherVal) {
                        alert('Vyplňte prosím všechny pole u každé otázky.');
                        return;
                    }

                    const otherArr = otherVal
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s);
                    if (otherArr.length < 1) {
                        alert('Musíte uvést alespoň jednu “ostatní odpověď” oddělenou čárkou.');
                        return;
                    }
                    if (otherArr.includes(correctVal)) {
                        alert('Správná odpověď se nesmí objevit mezi “ostatními odpověďmi.”');
                        return;
                    }

                    // Build question object
                    const questionObj = {
                        text: textVal,
                        right_answer: correctVal,
                        other_answers: otherArr
                    };
                    const media = mediaArray[i];
                    if (media) {
                        questionObj.media = media;
                    }
                    questions.push(questionObj);
                }

                // Now construct rawQuiz & save
                const rawQuiz = {name: quizName, questions};
                saveCustomQuiz(quizId, rawQuiz);

                this.currentRawQuiz = rawQuiz;
                this.currentQuizId = quizId;
                const verb = isEditing ? 'upraven' : 'uložen';
                alert(`Kvíz “${quizName}” byl ${verb} (ID: ${quizId}).`);

                // Notify the AppController so it can rebuild the home quiz list
                if (typeof this.onAuthorSaved === 'function') {
                    this.onAuthorSaved();
                }
            })
            .catch(err => {
                alert('Chyba při načítání médií: ' + err.message);
            });
    }

    /** Download the currently-loaded quiz as JSON. */
    _exportCurrentQuiz() {
        if (!this.currentRawQuiz || !this.currentQuizId) {
            alert('Nejdříve uložte kvíz pomocí “Uložit kvíz.”');
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

            let baseId = file.name
                .replace(/\.json$/i, '')
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9\-]/g, '');
            let quizId = baseId;
            const existing = getAllCustomQuizzes().map(q => q.id);
            let suffix = 1;
            while (existing.includes(quizId)) {
                quizId = `${baseId}-${suffix++}`;
            }

            saveCustomQuiz(quizId, raw);
            alert(`Kvíz “${raw.name}” byl importován (ID: ${quizId}).`);

            if (typeof this.onAuthorSaved === 'function') {
                this.onAuthorSaved();
            }

            this.importFileInput.value = '';
        };
        reader.readAsText(file);
    }
}
