// js/controllers/authoringHelpers.js

/**
 *  ── Funkce pro AuthoringController ──
 *  Obsahuje:
 *   • addQuestionBlockHTML(...)     ← vloží do DOM nový „question-block“ (prázdný nebo s předvyplněním)
 *   • clearNameError(...)           ← smaže text chyby pod políčkem názvu
 *   • clearAllQuestionErrors(...)   ← smaže všechny inline error‐divy ve všech question‐blokcích
 *   • validateQuizName(...)         ← vrátí { hasNameError, nameErrorMsg }
 *   • validateAllQuestionBlocks(...)← projde bloky, naplní jejich error‐divy a vrátí Promise[] pro media
 *   • assembleQuestionsArray(...)   ← složí finální pole otázky (včetně načtených DataURL médií)
 *   • showTemporarySuccessMessage(...)  ← zobrazí krátký zelený „uloženo“-banner a po 3 s ho smaže
 *   • handleImportFile(...)         ← přečte JSON, provede validation‐checks a uloží do localStorage
 */

import { getAllCustomQuizzes, saveCustomQuiz } from '../dataService.js';

/**
 * Vloží nový <div class="question-block"> do kontejneru.
 * Pokud `prefill` != null, tak jej předvyplní (včetně media‐preview).
 *
 * @param {number}  qid              – unikátní ID jedné otázky (např. 1,2,3,…)
 * @param {Element} questionsContainer – reference na <div id="questions-container">
 * @param {object}  [prefill]        – { text, right_answer, other_answers:[…], media? }
 * @returns {Element} právě vložený <div class="question-block">
 */
export function addQuestionBlockHTML(qid, questionsContainer, prefill = null) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('question-block');
    wrapper.dataset.qid = qid;

    // Pokud při editu existuje prefill.media, uložím data-atributy
    if (prefill && prefill.media) {
        wrapper.dataset.mediaUrl  = prefill.media.url;
        wrapper.dataset.mediaType = prefill.media.type;
    }

    // Vytvořím vnitřní HTML sbalující <textarea>, <input> a error <div> pro každé pole
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

    // Pokud je prefill (tedy načítáme existující otázku při editu), předvyplníme
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

    // Přidáme listener pro smazání bloků
    wrapper
        .querySelector('.remove-question-btn')
        .addEventListener('click', () => {
            questionsContainer.removeChild(wrapper);
        });

    questionsContainer.appendChild(wrapper);
    return wrapper;
}

/**
 * Smaže obsah <div> pro chyby u názvu kvízu.
 * @param {Element} nameErrorDiv – element, pod kterým se zobrazují chyby jména
 */
export function clearNameError(nameErrorDiv) {
    nameErrorDiv.textContent = '';
    nameErrorDiv.style.color = 'red';
}

/**
 * Smaže všechny inline chyby uvnitř každého question‐bloku.
 * Každý `<div class="field-error">…</div>` uvnitř `.question-block` se vyprázdní.
 * @param {Element} questionsContainer – kontejner, kde jsou všechny `.question-block`
 */
export function clearAllQuestionErrors(questionsContainer) {
    const allErrors = questionsContainer.querySelectorAll('.field-error');
    allErrors.forEach((errDiv) => {
        errDiv.textContent = '';
    });
}

/**
 * Validace názvu kvízu:
 *  • Prázdný název → chyba
 *  • Délka > 30 znaků → chyba
 * @param {string} quizName
 * @returns {{ hasNameError: boolean, nameErrorMsg: string }}
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
 * Projde všechny question‐bloky, validuje jejich jednotlivá pole
 * a zároveň sestaví pole `mediaPromises`, které vrací DataURL pro případné soubory.
 *
 * @param {Element[]} blocks – seznam <div class="question-block">
 * @returns {{
 *    hasFieldErrors: boolean,
 *    mediaPromises: Promise<(null|{type:string, url:string})>[]
 * }}
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

        // – Validace textu otázky
        if (!textVal) {
            blk.querySelector(`#text-error-${qid}`).textContent = 'Text otázky nesmí být prázdný.';
            hasFieldErrors = true;
        } else if (textVal.length < 5) {
            blk.querySelector(`#text-error-${qid}`).textContent = 'Text otázky musí mít alespoň 5 znaků.';
            hasFieldErrors = true;
        }

        // – Validace správné odpovědi
        if (!correctVal) {
            blk.querySelector(`#correct-error-${qid}`).textContent = 'Musíte zadat správnou odpověď.';
            hasFieldErrors = true;
        }

        // – Validace ostatních odpovědí
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

            // – Kontrola duplicit v otherArr
            const seen = new Set();
            otherArr.forEach((ans) => {
                if (seen.has(ans)) {
                    blk.querySelector(`#other-error-${qid}`).textContent =
                        'Ostatní odpovědi obsahují duplicitní položku.';
                    hasFieldErrors = true;
                }
                seen.add(ans);
            });

            // – Kontrola, že správná odpověď není v otherArr
            if (correctVal && otherArr.includes(correctVal)) {
                blk.querySelector(`#other-error-${qid}`).textContent =
                    'Správná odpověď se nesmí objevit mezi ostatními.';
                hasFieldErrors = true;
            }
        }

        // – Validace souboru média (pokud byl vybrán)
        const file = fileInput.files[0];
        if (file) {
            const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
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

            // i když je validace neúspěšná, přidáme Promise pro FileReader, aby se případná chyba zachytila v catchu
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
            // Pokud nebyl vybrán nový soubor, pokusíme se použít data-atributy (tedy existující media)
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
 * Sestaví finální pole `questions`, včetně médií načtených v validateAllQuestionBlocks.
 * @param {Element[]} blocks     – všechny <div class="question-block">
 * @param {Array<{type:string,url:string}|null>} mediaArray – výsledek Promise.all z validateAllQuestionBlocks
 * @returns {Array<Object>}      – [ { text, right_answer, other_answers:[], media? }, … ]
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
 * Zobrazí krátké zelené hlášení (např. „Kvíz byl uložen…“) pod <div> s chybou názvu.
 * Po 3 sekundách hlášku smaže a vrátí barvu zpět na červenou (pro další chyby).
 * @param {Element} nameErrorDiv
 * @param {string} message
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
 * Zpracuje import JSON souboru:
 * 1) načte JSON ze souboru (FileReader),
 * 2) ověří shape (raw.name, raw.questions, atd.),
 * 3) pokud je chyba, zapíše message do nameErrorDiv a vrátí importError = true,
 * 4) pokud je OK, vygeneruje unikátní ID, uloží přes saveCustomQuiz a zavolá callback onSuccess(newId,newRaw),
 * 5) ukáže krátké potvrzení („importován…“) pod nameErrorDiv.
 *
 * @param {Event} event                  – "change" event z <input type="file">
 * @param {Element} nameErrorDiv         – kam případné chyby importu zobrazit
 * @param {(newId:string,newRaw:Object)=>void} onSuccess – callback po úspěšném importu
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

            // – Základní shape kontrola
            if (typeof raw.name !== 'string' || raw.name.trim() === '') {
                nameErrorDiv.textContent = 'Import – “name” musí být neprázdný řetězec.';
                importError = true;
            }
            if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
                nameErrorDiv.textContent = 'Import – “questions” musí být neprázdné pole.';
                importError = true;
            }

            if (importError) {
                event.target.value = ''; // reset file input
                return;
            }

            // – Kontrola každé otázky v surovém JSON
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
                    // kontrola duplicit v other_answers
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
            event.target.value = ''; // reset input
            return;
        }

        // – Pokud vše validní → zapišme do localStorage
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

        // – krátká zelená zpráva pod názvem
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
