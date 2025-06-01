// js/controllers/authoringController.js

import { getAllCustomQuizzes, saveCustomQuiz } from '../dataService.js';

export class AuthoringController {
    constructor({ onAuthorSaved }) {
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

        // Insert a <div> for the quiz‐name error, right under the quiz‐name <input>
        this.nameErrorDiv = document.createElement('div');
        this.nameErrorDiv.classList.add('field-error');
        this.nameErrorDiv.style.color = 'red';
        this.nameErrorDiv.style.fontSize = '0.9rem';
        this.nameErrorDiv.style.marginTop = '0.25rem';
        this.nameErrorDiv.textContent = '';
        this.newQuizNameInput.insertAdjacentElement('afterend', this.nameErrorDiv);

        this.nextQuestionId = 1;
        this.currentRawQuiz = null;
        this.currentQuizId  = null;

        // Event listeners
        this.addQuestionBtn.addEventListener('click', () => this._addQuestionBlock());
        this.saveQuizBtn.addEventListener('click', () => this._saveQuiz());
        this.exportQuizBtn.addEventListener('click', () => this._exportCurrentQuiz());
        this.importQuizBtn.addEventListener('click', () => this.importFileInput.click());
        this.importFileInput.addEventListener('change', (e) => this._handleFileImport(e));
        this.createQuizBtn.addEventListener('click', () => this._showAuthoringScreen());
        this.authoringHomeBtn.addEventListener('click', () => this._hideAuthoringScreen());
    }

    /** Show authoring UI and clear fields for a brand-new quiz. */
    _showAuthoringScreen() {
        this.currentRawQuiz    = null;
        this.currentQuizId     = null;
        this.newQuizNameInput.value = '';
        this.questionsContainer.innerHTML = '';
        this.nextQuestionId    = 1;

        // Clear any leftover field errors
        this._clearNameError();
        this._clearAllQuestionErrors();

        this._addQuestionBlock();
        this.authoringScreen.classList.add('active');
    }

    /** Hide authoring UI. */
    _hideAuthoringScreen() {
        this.authoringScreen.classList.remove('active');
    }

    /**
     * Load an existing quiz (by ID + raw) into the authoring form for editing.
     * prefillRaw must be:
     *   { name: string, questions: [ { text, right_answer, other_answers: [], media? } ] }.
     */
    loadQuizForEdit(quizId, prefillRaw) {
        this.currentQuizId  = quizId;
        this.currentRawQuiz = prefillRaw;

        // 1) Set quiz name
        this.newQuizNameInput.value = prefillRaw.name;

        // 2) Clear any existing question blocks & their errors
        this.questionsContainer.innerHTML = '';
        this.nextQuestionId = 1;

        // 3) For each question in raw, add a block with prefill, including media if any
        prefillRaw.questions.forEach((question) => {
            this._addQuestionBlock(question);
        });

        // 4) Show the form, clearing name‐field error
        this._clearNameError();
        this._clearAllQuestionErrors();
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

        // If there’s existing media, stash it in data‐attributes
        if (prefill && prefill.media) {
            wrapper.dataset.mediaUrl  = prefill.media.url;
            wrapper.dataset.mediaType = prefill.media.type;
        }

        // Build inner HTML (text/correct/other + preview + file input)
        wrapper.innerHTML = `
      <h4>Otázka ${qid}
        <button type="button" class="remove-question-btn" data-qid="${qid}">✖</button>
      </h4>

      <label for="question-text-${qid}">Text otázky:</label>
      <textarea id="question-text-${qid}" rows="2" required></textarea>
      <div class="field-error" id="text-error-${qid}" style="color:red; font-size:0.9rem; margin-top:0.25rem;"></div>

      <label for="correct-answer-${qid}">Správná odpověď:</label>
      <input id="correct-answer-${qid}" type="text" required />
      <div class="field-error" id="correct-error-${qid}" style="color:red; font-size:0.9rem; margin-top:0.25rem;"></div>

      <label for="other-answers-${qid}">Ostatní odpovědi (oddělené čárkami):</label>
      <input id="other-answers-${qid}" 
             type="text" 
             placeholder="Např. odpověď A, odpověď B, odpověď C" 
             required />
      <div class="field-error" id="other-error-${qid}" style="color:red; font-size:0.9rem; margin-top:0.25rem;"></div>

      <div id="media-preview-${qid}"></div>

      <label for="media-file-${qid}">Přidat audio/video (MP3 ≤ 5 MB, MP4 ≤ 5 MB):</label>
      <input id="media-file-${qid}" type="file" accept="audio/*,video/*" />
      <div class="field-error" id="media-error-${qid}" style="color:red; font-size:0.9rem; margin-top:0.25rem;"></div>
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
        wrapper.querySelector('.remove-question-btn').addEventListener('click', () => {
            this.questionsContainer.removeChild(wrapper);
        });

        this.questionsContainer.appendChild(wrapper);
    }

    /** Remove the quiz‐name error message (if any). */
    _clearNameError() {
        this.nameErrorDiv.textContent = '';
    }

    /** Remove all field-error <div> messages inside every question-block. */
    _clearAllQuestionErrors() {
        const allErrors = this.questionsContainer.querySelectorAll('.field-error');
        allErrors.forEach(errDiv => {
            errDiv.textContent = '';
        });
    }

    /**
     * Main save logic: Validate inputs, show inline errors next to their fields,
     * and only persist if everything is valid.
     */
    _saveQuiz() {
        // 1) Clear any previous inline errors
        this._clearNameError();
        this._clearAllQuestionErrors();

        const quizName = this.newQuizNameInput.value.trim();
        let hasError = false;

        // ---- Quiz‐name validation ----
        if (!quizName) {
            this.nameErrorDiv.textContent = 'Název kvízu nesmí být prázdný.';
            hasError = true;
        } else if (quizName.length > 30) {
            this.nameErrorDiv.textContent = 'Název kvízu nesmí mít více než 30 znaků.';
            hasError = true;
        }

        // Generate or re‐use quizId
        let quizId = this.currentQuizId;
        const isEditing = !!quizId;
        if (!isEditing && quizName) {
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

        // ---- Must have at least one question block ----
        const blocks = Array.from(this.questionsContainer.querySelectorAll('.question-block'));
        if (blocks.length === 0) {
            // Show a general message under quiz‐name if there are no questions
            this.nameErrorDiv.textContent = 'Musíte přidat alespoň jednu otázku.';
            hasError = true;
        }

        // If quiz‐level errors exist already, stop further field‐level checks
        if (hasError) {
            return;
        }

        // To collect the media DataURLs
        const mediaPromises = [];

        // ---- Iterate over each question block to validate field‐by‐field ----
        blocks.forEach((blk) => {
            const qid = blk.dataset.qid;
            const textEl    = blk.querySelector(`#question-text-${qid}`);
            const correctEl = blk.querySelector(`#correct-answer-${qid}`);
            const otherEl   = blk.querySelector(`#other-answers-${qid}`);
            const fileInput = blk.querySelector(`#media-file-${qid}`);

            const textVal    = textEl.value.trim();
            const correctVal = correctEl.value.trim();
            const otherVal   = otherEl.value.trim();

            // Validate question text
            if (!textVal) {
                blk.querySelector(`#text-error-${qid}`).textContent = 'Text otázky nesmí být prázdný.';
                hasError = true;
            } else if (textVal.length < 5) {
                blk.querySelector(`#text-error-${qid}`).textContent = 'Text otázky musí mít alespoň 5 znaků.';
                hasError = true;
            }

            // Validate correct answer
            if (!correctVal) {
                blk.querySelector(`#correct-error-${qid}`).textContent = 'Musíte zadat správnou odpověď.';
                hasError = true;
            }

            // Validate other answers
            if (!otherVal) {
                blk.querySelector(`#other-error-${qid}`).textContent = 'Zadejte alespoň 2 ostatní odpovědi oddělené čárkami.';
                hasError = true;
            } else {
                const otherArr = otherVal
                    .split(',')
                    .map(s => s.trim())
                    .filter(s => s);
                if (otherArr.length < 2) {
                    blk.querySelector(`#other-error-${qid}`).textContent = 'Musíte uvést minimálně 2 ostatní odpovědi.';
                    hasError = true;
                }
                // Check for duplicates in otherArr
                const seen = new Set();
                otherArr.forEach((ans) => {
                    if (seen.has(ans)) {
                        blk.querySelector(`#other-error-${qid}`).textContent = 'Ostatní odpovědi obsahují duplicitní položku.';
                        hasError = true;
                    }
                    seen.add(ans);
                });
                // Check that correctVal is not among otherArr
                if (correctVal && otherArr.includes(correctVal)) {
                    blk.querySelector(`#other-error-${qid}`).textContent = 'Správná odpověď se nesmí objevit mezi ostatními.';
                    hasError = true;
                }
            }

            // Validate media (if a new file was chosen)
            const file = fileInput.files[0];
            if (file) {
                const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
                if (!/^audio\/|^video\//.test(file.type)) {
                    blk.querySelector(`#media-error-${qid}`).textContent = 'Formát média musí být audio nebo video.';
                    hasError = true;
                }
                if (file.size > maxSizeBytes) {
                    blk.querySelector(`#media-error-${qid}`).textContent = 'Soubor je příliš velký (max 5 MB).';
                    hasError = true;
                }

                // Prepare DataURL conversion even if invalid; it will be caught in Promise.all below
                mediaPromises.push(new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const dataURL = reader.result;
                        const type = file.type.startsWith('video/') ? 'video' : 'audio';
                        resolve({ type, url: dataURL });
                    };
                    reader.onerror = () => {
                        reject(new Error(`Chyba při načítání média otázky č. ${qid}.`));
                    };
                    reader.readAsDataURL(file);
                }));
            } else {
                // No new file: fallback to existing data‐attributes if any
                const existingUrl  = blk.dataset.mediaUrl || null;
                const existingType = blk.dataset.mediaType || null;
                if (existingUrl && existingType) {
                    mediaPromises.push(Promise.resolve({ type: existingType, url: existingUrl }));
                } else {
                    mediaPromises.push(Promise.resolve(null));
                }
            }
        });

        // If any field‐level errors were flagged, stop before converting media
        if (hasError) {
            return;
        }

        // ---- All field‐level checks passed so far; now wait for media DataURLs ----
        Promise.all(mediaPromises)
            .then((mediaArray) => {
                // Re-check blocks one more time to build the final questions array
                const questions = [];
                let qIndex = 0;

                blocks.forEach((blk) => {
                    const qid = blk.dataset.qid;
                    const textVal    = blk.querySelector(`#question-text-${qid}`).value.trim();
                    const correctVal = blk.querySelector(`#correct-answer-${qid}`).value.trim();
                    const otherVal   = blk.querySelector(`#other-answers-${qid}`).value.trim();
                    const otherArr   = otherVal
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s);

                    // If this point is reached, we know all fields are valid
                    const questionObj = {
                        text:         textVal,
                        right_answer: correctVal,
                        other_answers: otherArr
                    };
                    const media = mediaArray[qIndex++];
                    if (media) {
                        questionObj.media = media;
                    }
                    questions.push(questionObj);
                });

                // ---- Finally construct rawQuiz and save it ----
                const rawQuiz = { name: quizName, questions };
                saveCustomQuiz(quizId, rawQuiz);

                this.currentRawQuiz = rawQuiz;
                this.currentQuizId  = quizId;

                // Show a short success message under the quiz‐name input
                this.nameErrorDiv.style.color = 'green';
                this.nameErrorDiv.textContent = `Kvíz “${quizName}” byl ${isEditing ? 'upraven' : 'uložen'}. (ID: ${quizId})`;
                setTimeout(() => {
                    this._clearNameError();
                    this.nameErrorDiv.style.color = 'red'; // reset color for future errors
                }, 3000);

                if (typeof this.onAuthorSaved === 'function') {
                    this.onAuthorSaved();
                }
            })
            .catch((err) => {
                // If reading media fails, show under the very first question's media error
                if (blocks.length > 0) {
                    const firstBlock = blocks[0];
                    const firstQid = firstBlock.dataset.qid;
                    firstBlock.querySelector(`#media-error-${firstQid}`).textContent =
                        `Chyba při načítání média: ${err.message}`;
                } else {
                    // Fallback scenario: show near quiz name
                    this.nameErrorDiv.textContent = `Chyba při načítání média: ${err.message}`;
                }
            });
    }

    /** Download the currently-loaded quiz as JSON. */
    _exportCurrentQuiz() {
        if (!this.currentRawQuiz || !this.currentQuizId) {
            this.nameErrorDiv.textContent = 'Nejdříve uložte kvíz pomocí “Uložit kvíz.”';
            return;
        }
        const filename = `${this.currentQuizId}.json`;
        const blob     = new Blob([JSON.stringify(this.currentRawQuiz, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url;
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

        // Clear any leftover quiz‐name error
        this._clearNameError();

        const reader = new FileReader();
        reader.onload = () => {
            let raw;
            let importError = false;

            try {
                raw = JSON.parse(reader.result);

                // Top-level shape checks
                if (typeof raw.name !== 'string' || raw.name.trim() === '') {
                    this.nameErrorDiv.textContent = 'Import – “name” musí být neprázdný řetězec.';
                    importError = true;
                }
                if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
                    this.nameErrorDiv.textContent = 'Import – “questions” musí být neprázdné pole.';
                    importError = true;
                }

                // If we've already shown an error, bail out early
                if (importError) {
                    this.importFileInput.value = '';
                    return;
                }

                // Validate each question structure
                raw.questions.forEach((q, idx) => {
                    const num = idx + 1;
                    if (typeof q.text !== 'string' || q.text.trim().length < 5) {
                        this.nameErrorDiv.textContent =
                            `Import – otázka č. ${num}: “text” musí mít alespoň 5 znaků.`;
                        importError = true;
                    }
                    if (typeof q.right_answer !== 'string' || q.right_answer.trim() === '') {
                        this.nameErrorDiv.textContent =
                            `Import – otázka č. ${num}: “right_answer” nesmí být prázdný.`;
                        importError = true;
                    }
                    if (!Array.isArray(q.other_answers)) {
                        this.nameErrorDiv.textContent =
                            `Import – otázka č. ${num}: “other_answers” musí být pole řetězců.`;
                        importError = true;
                    } else {
                        if (q.other_answers.length < 2) {
                            this.nameErrorDiv.textContent =
                                `Import – otázka č. ${num}: potřebujete alespoň 2 “other_answers”.`;
                            importError = true;
                        }
                        // check duplicates in other_answers
                        const seen = new Set();
                        q.other_answers.forEach((ans, i2) => {
                            if (typeof ans !== 'string' || ans.trim() === '') {
                                this.nameErrorDiv.textContent =
                                    `Import – otázka č. ${num}, “other_answers” má neplatný nebo prázdný řetězec na pozici ${i2 + 1}.`;
                                importError = true;
                            }
                            if (seen.has(ans)) {
                                this.nameErrorDiv.textContent =
                                    `Import – otázka č. ${num}, “other_answers” obsahují duplicitní odpověď (“${ans}”).`;
                                importError = true;
                            }
                            seen.add(ans);
                        });
                        if (q.other_answers.includes(q.right_answer)) {
                            this.nameErrorDiv.textContent =
                                `Import – otázka č. ${num}: “right_answer” se nesmí objevit mezi “other_answers.”`;
                            importError = true;
                        }
                    }
                    // Media, if present
                    if (q.media) {
                        if (typeof q.media.url !== 'string' || !q.media.url.startsWith('data:')) {
                            this.nameErrorDiv.textContent =
                                `Import – otázka č. ${num}: “media.url” musí být Data URL.`;
                            importError = true;
                        }
                        if (!['audio', 'video'].includes(q.media.type)) {
                            this.nameErrorDiv.textContent =
                                `Import – otázka č. ${num}: “media.type” musí být “audio” nebo “video.”`;
                            importError = true;
                        }
                    }
                });
            } catch (err) {
                this.nameErrorDiv.textContent = `Chyba při parsování JSON: ${err.message}`;
                importError = true;
            }

            if (importError) {
                this.importFileInput.value = '';
                return;
            }

            // Compute a unique quizId from file name
            let baseId = file.name
                .replace(/\.json$/i, '')
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9\-]/g, '');
            let quizId = baseId;
            const existing = getAllCustomQuizzes().map((q) => q.id);
            let suffix = 1;
            while (existing.includes(quizId)) {
                quizId = `${baseId}-${suffix++}`;
            }

            saveCustomQuiz(quizId, raw);

            // Show a short success message under quiz name
            this.nameErrorDiv.style.color = 'green';
            this.nameErrorDiv.textContent = `Kvíz “${raw.name}” byl importován (ID: ${quizId}).`;
            setTimeout(() => {
                this.nameErrorDiv.textContent = '';
                this.nameErrorDiv.style.color = 'red';
            }, 3000);

            if (typeof this.onAuthorSaved === 'function') {
                this.onAuthorSaved();
            }
            this.importFileInput.value = '';
        };

        reader.readAsText(file);
    }
}
