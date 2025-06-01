// js/controllers/resultsController.js
import { drawResultsChart } from '../chartController.js';

export class ResultsController {
    constructor(app) {
        this.app = app;

        // Grab Results screen elements
        this.scoreTextEl   = document.getElementById('score-text');
        this.resultsCanvas = document.getElementById('resultsChart');
        this.homeBtn       = document.getElementById('home-btn');

        // Home button on Results
        this.homeBtn.addEventListener('click', () => {
            this.app.backToHome();
        });
    }

    /**
     * `resultsObj` has { correctCount, incorrectCount }.
     * We also might pass player & quizTitle if needed in future.
     */
    show(resultsObj, player, quizTitle) {
        const { correctCount, incorrectCount } = resultsObj;
        const total = correctCount + incorrectCount;

        this.scoreTextEl.textContent = `Správně: ${correctCount} z ${total}`;
        drawResultsChart(this.resultsCanvas, correctCount, incorrectCount);
        this.app.showSection(this.app.resultsScreen);
    }
}
