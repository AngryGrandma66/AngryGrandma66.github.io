import { getTopScores } from '../scoreService.js';


/**
 * Bind references to the high‐score list <ul> and “Back to Home” button,
 * and attach the home button listener.
 * @param {AppController} app – parent application controller
 */
export class ScoresController {
    constructor(app) {
        this.app = app;

        this.highScoreList = document.getElementById('high-score-list');
        this.scoresHomeBtn = document.getElementById('scores-home-btn');


        this.scoresHomeBtn.addEventListener('click', () => {
            this.app.backToHome();
        });
    }

    /**
     * Build and display the top‐10 scores:
     *   – Call getTopScores(10) from scoreService
     *   – If list is empty, show “Žádné výsledky zatím”
     *   – Otherwise, for each entry, format date/time in Czech locale,
     *     and append “Name – Quiz – correct/total (dd.mm.rr hh:mm:ss)” to <li>
     *   – Switch to the scores section
     */
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
