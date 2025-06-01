import { drawResultsChart } from './chartController.js';

export class ResultsController {
    constructor(app) {
        this.app = app;

        this.scoreTextEl   = document.getElementById('score-text');
        this.resultsCanvas = document.getElementById('resultsChart');
        this.homeBtn       = document.getElementById('home-btn');

        // Home button on Results
        this.homeBtn.addEventListener('click', () => {
            this.app.backToHome();
        });
    }

    show(resultsObj) {
        const { correctCount, incorrectCount } = resultsObj;
        const total = correctCount + incorrectCount;

        this.scoreTextEl.textContent = `Správně: ${correctCount} z ${total}`;
        drawResultsChart(this.resultsCanvas, correctCount, incorrectCount);
        this.app.showSection(this.app.resultsScreen);
    }
}
