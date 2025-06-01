// js/controllers/authoringController.js

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

        // ── 1) Grab all potřebné DOM elementy ──
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

        // ── 2) Pod políčkem „Název kvízu“ vložíme speciální <div> pro chyby jména ──
        this.nameErrorDiv = document.createElement('div');
        this.nameErrorDiv.classList.add('field-error');
        this.nameErrorDiv.style.color = 'red';
        this.nameErrorDiv.style.fontSize = '0.9rem';
        this.nameErrorDiv.style.marginTop = '0.25rem';
        this.newQuizNameInput.insertAdjacentElement('afterend', this.nameErrorDiv);

        this.nextQuestionId = 1;
        this.currentRawQuiz = null;
        this.currentQuizId  = null;

        // ── 3) Přidáme event-listenery ──
        this.addQuestionBtn.addEventListener('click', () => this._addQuestionBlock());
        this.saveQuizBtn.addEventListener('click', () => this._saveQuiz());
        this.exportQuizBtn.addEventListener('click', () => this._exportCurrentQuiz());
        this.importQuizBtn.addEventListener('click', () => this.importFileInput.click());
        this.importFileInput.addEventListener('change', (e) => this._handleFileImport(e));
        this.createQuizBtn.addEventListener('click', () => this._showAuthoringScreen());
        this.authoringHomeBtn.addEventListener('click', () => this._hideAuthoringScreen());
    }

    /** Zobrazí prázdnou formu pro nový kvíz. */
    _showAuthoringScreen() {
        this.currentRawQuiz    = null;
        this.currentQuizId     = null;
        this.newQuizNameInput.value = '';
        this.questionsContainer.innerHTML = '';
        this.nextQuestionId    = 1;

        clearNameError(this.nameErrorDiv);
        clearAllQuestionErrors(this.questionsContainer);

        // Vložíme první „prázdný“ blok otázky
        this._addQuestionBlock();
        this.authoringScreen.classList.add('active');
    }

    /** Skryje celý „authoring“ panel. */
    _hideAuthoringScreen() {
        this.authoringScreen.classList.remove('active');
    }

    /**
     * Načte již existující kvíz (podle ID a rawData) do formuláře pro úpravy.
     * rawData má tvar:
     * { name: string, questions: [ { text, right_answer, other_answers: [], media? } ] }
     */
    loadQuizForEdit(quizId, prefillRaw) {
        this.currentQuizId  = quizId;
        this.currentRawQuiz = prefillRaw;

        // 1) Zobrazíme název
        this.newQuizNameInput.value = prefillRaw.name;

        // 2) Vyčistíme všechny dosavadní bloky + jejich chyby
        this.questionsContainer.innerHTML = '';
        this.nextQuestionId = 1;

        // 3) Pro každý objekt otázky vložíme připravený HTML blok s předvyplněním
        prefillRaw.questions.forEach((question) => {
            const wrapper = addQuestionBlockHTML(this.nextQuestionId++, this.questionsContainer, question);
            // „addQuestionBlockHTML“ již naplní i media‐preview (pokud prefill.media existuje)
        });

        // 4) Zobrazíme formulář a smažeme zbývající chyby
        clearNameError(this.nameErrorDiv);
        clearAllQuestionErrors(this.questionsContainer);
        this.authoringScreen.classList.add('active');
    }

    /** Přidá do `questionsContainer` nový „otázkový“ blok (prázdný nebo s předvyplněním). */
    _addQuestionBlock(prefill = null) {
        // Vrací právě vložený <div class="question-block"> (pokud prefill != null, předvyplní ho)
        addQuestionBlockHTML(this.nextQuestionId++, this.questionsContainer, prefill);
    }

    /**
     * Hlavní funkce pro kontrolu políček + uložení kvízu.
     * – nejprve smažeme všechny inline chyby,
     * – pak provedeme kontrolu quizName + kontrolu každého question-blocku,
     * – pokud vše projde, načteme DataURLy pro média a uložíme do localStorage.
     */
    _saveQuiz() {
        clearNameError(this.nameErrorDiv);
        clearAllQuestionErrors(this.questionsContainer);

        const quizName = this.newQuizNameInput.value.trim();
        // 1) Quiz-name validace
        const { hasNameError, nameErrorMsg } = validateQuizName(quizName);
        if (hasNameError) {
            this.nameErrorDiv.textContent = nameErrorMsg;
            return;
        }

        // 2) Připravíme si ID (pokud upravujeme existující kvíz, použijeme this.currentQuizId,
        //    jinak vygenerujeme unikátní ID)
        let quizId = this.currentQuizId;
        const isEditing = !!quizId;
        if (!isEditing) {
            quizId = this._generateUniqueQuizId(quizName);
        }

        // 3) Zajistíme, že existuje alespoň jeden question-block
        const blocks = Array.from(this.questionsContainer.querySelectorAll('.question-block'));
        if (blocks.length === 0) {
            this.nameErrorDiv.textContent = 'Musíte přidat alespoň jednu otázku.';
            return;
        }

        // 4) Validujeme každý jednotlivý question-block, sbíráme mediaPromises
        const { hasFieldErrors, mediaPromises } = validateAllQuestionBlocks(blocks);
        if (hasFieldErrors) {
            // Pokud alespoň jeden blok hlásil vnitřní chybu, ukončíme.
            return;
        }

        // 5) Buď vše v pořádku – počkáme na vyřešení všetkých mediaPromises
        Promise.all(mediaPromises)
            .then((mediaArray) => {
                // 6) Sestavíme finální pole questions (s mediálními daty) a uložíme kvíz
                const questions = assembleQuestionsArray(blocks, mediaArray);

                const rawQuiz = { name: quizName, questions };
                saveCustomQuiz(quizId, rawQuiz);
                this.currentRawQuiz = rawQuiz;
                this.currentQuizId  = quizId;

                // 7) Zobrazíme krátké potvrzení pod políčkem „Název kvízu“
                showTemporarySuccessMessage(
                    this.nameErrorDiv,
                    `Kvíz “${quizName}” byl ${isEditing ? 'upraven' : 'uložen'}. (ID: ${quizId})`
                );

                if (typeof this.onAuthorSaved === 'function') {
                    this.onAuthorSaved();
                }
            })
            .catch((err) => {
                // Pokud četba DataURL pro média selhala, vypíšeme zprávu do prvního question-blocku
                if (blocks.length > 0) {
                    const firstQid = blocks[0].dataset.qid;
                    const mediaErrDiv = blocks[0].querySelector(`#media-error-${firstQid}`);
                    mediaErrDiv.textContent = `Chyba při načítání média: ${err.message}`;
                } else {
                    this.nameErrorDiv.textContent = `Chyba při načítání média: ${err.message}`;
                }
            });
    }

    /** Vytvoří unikátní ID („slug“) z názvu kvízu a ošetří kolize. */
    _generateUniqueQuizId(quizName) {
        let baseId = quizName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-]/g, '')
            .trim();
        let quizId = baseId || 'quiz'; // fallback, kdyby název vyšel úplně prázdný po filtru
        const existing = getAllCustomQuizzes().map((q) => q.id);
        let suffix = 1;
        while (existing.includes(quizId)) {
            quizId = `${baseId}-${suffix++}`;
        }
        return quizId;
    }

    /** Umožní stáhnout současný kvíz jako JSON. */
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

    /** Zpracuje import JSON souboru a případné inline chyby. */
    _handleFileImport(event) {
        handleImportFile(
            event,
            this.nameErrorDiv,
            (newId, newRaw) => {
                // po úspěšném importu aktualizujeme seznam a rodiče
                if (typeof this.onAuthorSaved === 'function') {
                    this.onAuthorSaved();
                }
            }
        );
    }
}
