import { drawResultsChart } from './chartController.js';


/**
 * Set up references to scoreText <p>, results canvas, and “Back to Home” button.
 * Bind the home button to call AppController.backToHome().
 * @param {AppController} app – parent application controller
 */
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

    /**
     * Display the results screen:
     *   – Set “Správně: X z Y” in scoreTextEl
     *   – Call drawResultsChart(...) to draw a bar + pie graph on canvas
     *   – Switch to the results section
     * @param {{correctCount:number,incorrectCount:number}} resultsObj
     */
    show(resultsObj) {
        const { correctCount, incorrectCount } = resultsObj;
        const total = correctCount + incorrectCount;

        this.scoreTextEl.textContent = `Správně: ${correctCount} z ${total}`;
        drawResultsChart(this.resultsCanvas, correctCount, incorrectCount);
        this.app.showSection(this.app.resultsScreen);
    }
}
