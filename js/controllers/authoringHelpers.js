

import { getAllCustomQuizzes, saveCustomQuiz } from '../dataService.js';
/**
 * Build the HTML structure for one question block:
 *   – A heading “Otázka X” with a remove‐button
 *   – <textarea> for question text plus a validation‐error <div>
 *   – <input> for correct answer plus validation error <div>
 *   – <input> for “other answers” (comma‐separated) plus validation error <div>
 *   – <div> to show media preview if prefill.media exists
 *   – <input type="file"> for user to add new audio/video
 *   – <div> to show media‐error messages
 * If prefill is provided, fill in existing question fields and display media (audio/video element).
 * Attach an event listener to the remove button to delete this block from questionsContainer.
 * @param {number} qid – numeric identifier for this question block
 * @param {HTMLElement} questionsContainer – where to append the block
 * @param {Object|null} prefill – optional existing question data
 */
export function addQuestionBlockHTML(qid, questionsContainer, prefill = null) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('question-block');
    wrapper.dataset.qid = qid;

    if (prefill && prefill.media) {
        wrapper.dataset.mediaUrl  = prefill.media.url;
        wrapper.dataset.mediaType = prefill.media.type;
    }

    wrapper.innerHTML = `
    <h4>Otázka ${qid}
      <button type="button" class="remove-question-btn" data-qid="${qid}">✖</button>
    </h4>

    <label for="question-text-${qid}">Text otázky:</label>
    <textarea id="question-text-${qid}" rows="2" required></textarea>
    <div class="field-error" id="text-error-${qid}" 
         style="color:red; font-size:0.9rem; margin-top:0.25rem;"></div>

    <label for="correct-answer-${qid}">Správná odpověď:</label>
    <input id="correct-answer-${qid}" type="text" required />
    <div class="field-error" id="correct-error-${qid}" 
         style="color:red; font-size:0.9rem; margin-top:0.25rem;"></div>

    <label for="other-answers-${qid}">Ostatní odpovědi (oddělené čárkami):</label>
    <input id="other-answers-${qid}" 
           type="text" 
           placeholder="Např. odpověď A, odpověď B" 
           required />
    <div class="field-error" id="other-error-${qid}" 
         style="color:red; font-size:0.9rem; margin-top:0.25rem;"></div>

    <div id="media-preview-${qid}"></div>

    <label for="media-file-${qid}">Přidat audio/video (MP3 ≤ 5 MB, MP4 ≤ 5 MB):</label>
    <input id="media-file-${qid}" type="file" accept="audio/*,video/*" />
    <div class="field-error" id="media-error-${qid}" 
         style="color:red; font-size:0.9rem; margin-top:0.25rem;"></div>
  `;

    if (prefill) {
        wrapper.querySelector(`#question-text-${qid}`).value = prefill.text;
        wrapper.querySelector(`#correct-answer-${qid}`).value = prefill.right_answer;
        wrapper.querySelector(`#other-answers-${qid}`).value = prefill.other_answers.join(', ');

        if (prefill.media && prefill.media.url) {
            const previewContainer = wrapper.querySelector(`#media-preview-${qid}`);
            previewContainer.innerHTML = '';

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

    wrapper
        .querySelector('.remove-question-btn')
        .addEventListener('click', () => {
            questionsContainer.removeChild(wrapper);
        });

    questionsContainer.appendChild(wrapper);
    return wrapper;
}

/**
 * Clear any text in the quiz‐name or import‐error <div>, resetting it to red color.
 * Used before showing new validation errors.
 * @param {HTMLDivElement} nameErrorDiv
 */
export function clearNameError(nameErrorDiv) {
    nameErrorDiv.textContent = '';
    nameErrorDiv.style.color = 'red';
}

/**
 * Find every .field-error DIV inside questionsContainer (for text/correct/other/media),
 * and clear its textContent. Useful before re‐running validation on all blocks.
 * @param {HTMLElement} questionsContainer
 */
export function clearAllQuestionErrors(questionsContainer) {
    const allErrors = questionsContainer.querySelectorAll('.field-error');
    allErrors.forEach((errDiv) => {
        errDiv.textContent = '';
    });
}
/**
 * Check that quizName is non‐empty and ≤ 30 characters.
 * Return { hasNameError: boolean, nameErrorMsg: string } to show under name input.
 * @param {string} quizName
 * @returns {{hasNameError:boolean, nameErrorMsg:string}}
 */
export function validateQuizName(quizName) {
    if (!quizName) {
        return { hasNameError: true, nameErrorMsg: 'Název kvízu nesmí být prázdný.' };
    }
    if (quizName.length > 30) {
        return { hasNameError: true, nameErrorMsg: 'Název kvízu nesmí mít více než 30 znaků.' };
    }
    return { hasNameError: false, nameErrorMsg: '' };
}
/**
 * Validate each question DOM block. For each:
 *   – text must be ≥ 5 chars
 *   – correctAnswer must be non‐empty
 *   – otherAnswers must parse into ≥ 2 unique, non‐empty strings
 *   – correctAnswer cannot appear among otherAnswers
 *   – media file if uploaded must be type audio/* or video/*, ≤ 5 MB
 * For each block, collect a Promise:
 *   – If a user‐uploaded File is present, read it via FileReader → Data URL,
 *     resolve { type: "audio"|"video", url: dataURL }
 *   – Otherwise if prefill URL exists in dataset, resolve that { type, url }
 *   – Else, resolve null
 * Return { hasFieldErrors: boolean, mediaPromises: Array<Promise> } so caller
 * can wait for all Data URLs before assembling final questions array.
 * @param {HTMLDivElement[]} blocks – NodeList/Array of .question-block elements
 * @returns {{hasFieldErrors:boolean, mediaPromises:Promise<({type:string,url:string}|null)>[]}}
 */
export function validateAllQuestionBlocks(blocks) {
    let hasFieldErrors = false;
    const mediaPromises = [];

    blocks.forEach((blk) => {
        const qid = blk.dataset.qid;
        const textEl    = blk.querySelector(`#question-text-${qid}`);
        const correctEl = blk.querySelector(`#correct-answer-${qid}`);
        const otherEl   = blk.querySelector(`#other-answers-${qid}`);
        const fileInput = blk.querySelector(`#media-file-${qid}`);

        const textVal    = textEl.value.trim();
        const correctVal = correctEl.value.trim();
        const otherVal   = otherEl.value.trim();

        if (!textVal) {
            blk.querySelector(`#text-error-${qid}`).textContent = 'Text otázky nesmí být prázdný.';
            hasFieldErrors = true;
        } else if (textVal.length < 5) {
            blk.querySelector(`#text-error-${qid}`).textContent = 'Text otázky musí mít alespoň 5 znaků.';
            hasFieldErrors = true;
        }

        if (!correctVal) {
            blk.querySelector(`#correct-error-${qid}`).textContent = 'Musíte zadat správnou odpověď.';
            hasFieldErrors = true;
        }

        if (!otherVal) {
            blk.querySelector(`#other-error-${qid}`).textContent =
                'Zadejte alespoň 2 ostatní odpovědi oddělené čárkami.';
            hasFieldErrors = true;
        } else {
            const otherArr = otherVal
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s);

            if (otherArr.length < 2) {
                blk.querySelector(`#other-error-${qid}`).textContent =
                    'Musíte uvést minimálně 2 ostatní odpovědi.';
                hasFieldErrors = true;
            }

            const seen = new Set();
            otherArr.forEach((ans) => {
                if (seen.has(ans)) {
                    blk.querySelector(`#other-error-${qid}`).textContent =
                        'Ostatní odpovědi obsahují duplicitní položku.';
                    hasFieldErrors = true;
                }
                seen.add(ans);
            });

            if (correctVal && otherArr.includes(correctVal)) {
                blk.querySelector(`#other-error-${qid}`).textContent =
                    'Správná odpověď se nesmí objevit mezi ostatními.';
                hasFieldErrors = true;
            }
        }

        const file = fileInput.files[0];
        if (file) {
            const maxSizeBytes = 5 * 1024 * 1024;
            if (!/^audio\/|^video\//.test(file.type)) {
                blk.querySelector(`#media-error-${qid}`).textContent =
                    'Formát média musí být audio nebo video.';
                hasFieldErrors = true;
            }
            if (file.size > maxSizeBytes) {
                blk.querySelector(`#media-error-${qid}`).textContent =
                    'Soubor je příliš velký (max 5 MB).';
                hasFieldErrors = true;
            }

            mediaPromises.push(
                new Promise((resolve, reject) => {
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
                })
            );
        } else {
            const existingUrl = blk.dataset.mediaUrl || null;
            const existingType = blk.dataset.mediaType || null;
            if (existingUrl && existingType) {
                mediaPromises.push(Promise.resolve({ type: existingType, url: existingUrl }));
            } else {
                mediaPromises.push(Promise.resolve(null));
            }
        }
    });

    return { hasFieldErrors, mediaPromises };
}

/**
 * Take each question block and the corresponding element in mediaArray (from validateAllQuestionBlocks),
 * then build a “questions” array of plain objects:
 *   { text, right_answer, other_answers: string[], media?:{ type, url } }
 * Return that array for saving/exporting.
 * @param {HTMLDivElement[]} blocks – array of block elements
 * @param {Array<{type:string,url:string}|null>} mediaArray – same length as blocks
 * @returns {Array<Object>}
 */
export function assembleQuestionsArray(blocks, mediaArray) {
    const questions = [];
    let idx = 0;

    blocks.forEach((blk) => {
        const qid = blk.dataset.qid;
        const textVal = blk.querySelector(`#question-text-${qid}`).value.trim();
        const correctVal = blk.querySelector(`#correct-answer-${qid}`).value.trim();
        const otherVal = blk.querySelector(`#other-answers-${qid}`).value.trim();
        const otherArr = otherVal
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s);

        const questionObj = {
            text: textVal,
            right_answer: correctVal,
            other_answers: otherArr
        };

        const media = mediaArray[idx++];
        if (media) {
            questionObj.media = media;
        }

        questions.push(questionObj);
    });

    return questions;
}

/**
 * Display a green success message (e.g. “Quiz XY saved”) in nameErrorDiv for 3 seconds,
 * then clear it and reset color to red so it’s ready for future errors.
 * @param {HTMLDivElement} nameErrorDiv – where to show the message
 * @param {string} message – text to display in green
 */
export function showTemporarySuccessMessage(nameErrorDiv, message) {
    nameErrorDiv.style.color = 'green';
    nameErrorDiv.textContent = message;
    setTimeout(() => {
        nameErrorDiv.textContent = '';
        nameErrorDiv.style.color = 'red';
    }, 3000);
}
/**
 * Read a .json file from the “Import quiz” input:
 *   – Parse JSON, validate that raw.name is a non‐empty string
 *   – Validate that raw.questions is a non‐empty array
 *   – For each question, verify text ≥ 5 chars, right_answer non‐empty,
 *     other_answers is ≥ 2 unique non‐empty strings, right_answer not among them,
 *     and if media exists, media.url must be a data: URL, media.type must be "audio" or "video"
 *   – If any check fails, show an appropriate error message in nameErrorDiv
 *   – Otherwise, generate a unique quizId (based on file name), save to localStorage,
 *     show “Imported!” in green, call onSuccess(quizId, raw), and clear file input
 * @param {Event} event – the file input change event
 * @param {HTMLDivElement} nameErrorDiv – where to show validation messages
 * @param {Function} onSuccess – callback(quizId, raw) after successful import
 */
export function handleImportFile(event, nameErrorDiv, onSuccess) {
    const file = event.target.files[0];
    if (!file) return;

    clearNameError(nameErrorDiv);

    const reader = new FileReader();
    reader.onload = () => {
        let raw;
        let importError = false;

        try {
            raw = JSON.parse(reader.result);

            if (typeof raw.name !== 'string' || raw.name.trim() === '') {
                nameErrorDiv.textContent = 'Import – “name” musí být neprázdný řetězec.';
                importError = true;
            }
            if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
                nameErrorDiv.textContent = 'Import – “questions” musí být neprázdné pole.';
                importError = true;
            }

            if (importError) {
                event.target.value = '';
                return;
            }

            raw.questions.forEach((q, idx) => {
                const num = idx + 1;
                if (typeof q.text !== 'string' || q.text.trim().length < 5) {
                    nameErrorDiv.textContent =
                        `Import – otázka č. ${num}: “text” musí mít alespoň 5 znaků.`;
                    importError = true;
                }
                if (typeof q.right_answer !== 'string' || q.right_answer.trim() === '') {
                    nameErrorDiv.textContent =
                        `Import – otázka č. ${num}: “right_answer” nesmí být prázdný.`;
                    importError = true;
                }
                if (!Array.isArray(q.other_answers)) {
                    nameErrorDiv.textContent =
                        `Import – otázka č. ${num}: “other_answers” musí být pole řetězců.`;
                    importError = true;
                } else {
                    if (q.other_answers.length < 2) {
                        nameErrorDiv.textContent =
                            `Import – otázka č. ${num}: potřebujete alespoň 2 “other_answers”.`;
                        importError = true;
                    }
                    const seen = new Set();
                    q.other_answers.forEach((ans, i2) => {
                        if (typeof ans !== 'string' || ans.trim() === '') {
                            nameErrorDiv.textContent =
                                `Import – otázka č. ${num}, “other_answers” má prázdný řetězec na pozici ${i2 + 1}.`;
                            importError = true;
                        }
                        if (seen.has(ans)) {
                            nameErrorDiv.textContent =
                                `Import – otázka č. ${num}, “other_answers” obsahují duplicitní odpověď (“${ans}”).`;
                            importError = true;
                        }
                        seen.add(ans);
                    });
                    if (q.other_answers.includes(q.right_answer)) {
                        nameErrorDiv.textContent =
                            `Import – otázka č. ${num}: “right_answer” se nesmí objevit mezi “other_answers.”`;
                        importError = true;
                    }
                }
                if (q.media) {
                    if (typeof q.media.url !== 'string' || !q.media.url.startsWith('data:')) {
                        nameErrorDiv.textContent =
                            `Import – otázka č. ${num}: “media.url” musí být Data URL.`;
                        importError = true;
                    }
                    if (!['audio', 'video'].includes(q.media.type)) {
                        nameErrorDiv.textContent =
                            `Import – otázka č. ${num}: “media.type” musí být “audio” nebo “video.”`;
                        importError = true;
                    }
                }
            });
        } catch (err) {
            nameErrorDiv.textContent = `Chyba při parsování JSON: ${err.message}`;
            importError = true;
        }

        if (importError) {
            event.target.value = '';
            return;
        }

        let baseId = file.name
            .replace(/\.json$/i, '')
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

        saveCustomQuiz(quizId, raw);

        nameErrorDiv.style.color = 'green';
        nameErrorDiv.textContent = `Kvíz “${raw.name}” byl importován (ID: ${quizId}).`;
        setTimeout(() => {
            nameErrorDiv.textContent = '';
            nameErrorDiv.style.color = 'red';
        }, 3000);

        onSuccess(quizId, raw);
        event.target.value = '';
    };

    reader.readAsText(file);
}
