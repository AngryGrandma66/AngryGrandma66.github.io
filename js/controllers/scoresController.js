// js/controllers/scoresController.js
import { getTopScores } from '../scoreService.js';

export class ScoresController {
    constructor(app) {
        this.app = app;

        // Grab Scores screen elements
        this.highScoreList = document.getElementById('high-score-list');
        this.scoresHomeBtn = document.getElementById('scores-home-btn');

        // Home button on Scores
        this.scoresHomeBtn.addEventListener('click', () => {
            this.app.backToHome();
        });
    }

    show() {
        const topEntries = getTopScores(10);
        this.highScoreList.innerHTML = '';

        if (topEntries.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Žádné výsledky zatím.';
            this.highScoreList.appendChild(li);
        } else {
            topEntries.forEach(entry => {
                const date      = new Date(entry.timestamp);
                const formatted = date.toLocaleString('cs-CZ');
                const li = document.createElement('li');
                li.textContent =
                    `${entry.name} – ${entry.quiz} – ${entry.correct}/${entry.total} (${formatted})`;
                this.highScoreList.appendChild(li);
            });
        }

        this.app.showSection(this.app.scoresScreen);
    }
}
