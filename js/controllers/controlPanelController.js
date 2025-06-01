// js/controllers/controlPanelController.js
import { getAllCustomQuizzes, getCustomQuiz, deleteCustomQuiz } from '../dataService.js';

export class ControlPanelController {
    constructor(app) {
        this.app = app;

        // Grab Control Panel elements
        this.controlPanelList = document.getElementById('control-panel-list');
        this.controlHomeBtn   = document.getElementById('control-home-btn');

        // Home button on Control Panel
        this.controlHomeBtn.addEventListener('click', () => {
            this.app.backToHome();
        });
    }

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

                // Quiz name
                const nameSpan = document.createElement('span');
                nameSpan.textContent = name;
                nameSpan.classList.add('control-quiz-name');
                li.appendChild(nameSpan);

                // Play button
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

                // Edit button
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

                // Export button
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

                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Smazat';
                deleteBtn.classList.add('control-btn', 'delete-btn');
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`Opravdu chcete smazat kvíz “${name}”?`)) {
                        deleteCustomQuiz(id);
                        this.show();         // refresh Control Panel
                        this.app.homeCtrl.buildQuizList(); // also refresh Home list
                    }
                });
                li.appendChild(deleteBtn);

                this.controlPanelList.appendChild(li);
            });
        }

        this.app.showSection(this.app.controlPanelScreen);
    }
}
