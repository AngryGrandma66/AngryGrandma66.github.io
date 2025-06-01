import { getAllCustomQuizzes, getCustomQuiz, deleteCustomQuiz } from '../dataService.js';

/**
 * Build the “Control Panel” screen (Manage custom quizzes).
 * Store ref to the <ul> where each custom quiz will be listed,
 * and bind the “Back to Home” button.
 * @param {AppController} app – parent app controller
 */
export class ControlPanelController {
    constructor(app) {
        this.app = app;

        this.controlPanelList = document.getElementById('control-panel-list');
        this.controlHomeBtn   = document.getElementById('control-home-btn');

        this.controlHomeBtn.addEventListener('click', () => {
            this.app.backToHome();
        });
    }

    /**
     * Populate the control‐panel list:
     *   • If no custom quizzes, show a placeholder “No custom quizzes.”
     *   • Otherwise, for each custom quiz ID+name, append a <li> with:
     *       – Name label
     *       – “Play” button → calls app.startQuiz(id, name)
     *       – “Edit” button → loads quiz data into AuthoringController
     *       – “Export” button → triggers download of JSON
     *       – “Delete” button → confirm & remove from localStorage
     * Then switch to the control‐panel section.
     */
    show() {
        this.controlPanelList.innerHTML = '';
        const custom = getAllCustomQuizzes();

        if (custom.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Žádné vlastní kvízy.';
            this.controlPanelList.appendChild(li);
        } else {
            custom.forEach(({ id, name }) => {
                const li = document.createElement('li');

                const nameSpan = document.createElement('span');
                nameSpan.textContent = name;
                nameSpan.classList.add('control-quiz-name');
                li.appendChild(nameSpan);

                const playBtn = document.createElement('button');
                playBtn.textContent = 'Hrát';
                playBtn.classList.add('control-btn');
                playBtn.addEventListener('click', () => {
                    const player = this.app.homeCtrl.getPlayerName();
                    if (!player) {
                        alert('Prosím, zadejte své jméno nebo iniciály.');
                        return;
                    }
                    this.app.startQuiz(id, name);
                });
                li.appendChild(playBtn);

                const editBtn = document.createElement('button');
                editBtn.textContent = 'Upravit';
                editBtn.classList.add('control-btn');
                editBtn.addEventListener('click', () => {
                    const raw = getCustomQuiz(id);
                    if (!raw) {
                        alert('Nepodařilo se načíst tento kvíz.');
                        return;
                    }
                    this.app.showAuthoringEdit(id, raw);
                });
                li.appendChild(editBtn);

                const exportBtn = document.createElement('button');
                exportBtn.textContent = 'Export';
                exportBtn.classList.add('control-btn');
                exportBtn.addEventListener('click', () => {
                    const raw = getCustomQuiz(id);
                    if (!raw) {
                        alert('Nepodařilo se načíst tento kvíz.');
                        return;
                    }
                    const filename = `${id}.json`;
                    const blob = new Blob([ JSON.stringify(raw, null, 2) ], {
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
                });
                li.appendChild(exportBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Smazat';
                deleteBtn.classList.add('control-btn', 'delete-btn');
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`Opravdu chcete smazat kvíz “${name}”?`)) {
                        deleteCustomQuiz(id);
                        this.show();
                        this.app.homeCtrl.buildQuizList();
                    }
                });
                li.appendChild(deleteBtn);

                this.controlPanelList.appendChild(li);
            });
        }

        this.app.showSection(this.app.controlPanelScreen);
    }
}
