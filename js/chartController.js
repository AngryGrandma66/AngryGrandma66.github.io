// js/chartController.js

/**
 * Draw a simple bar chart on the given canvas context
 * showing “correct” vs. “incorrect” counts.
 *
 * @param {HTMLCanvasElement} canvasEl
 * @param {number} correctCount
 * @param {number} incorrectCount
 */
export function drawResultsChart(canvasEl, correctCount, incorrectCount) {
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    const total = correctCount + incorrectCount;
    if (total === 0) return;

    const barWidth = 50;
    const maxHeight = 200;
    // Correct bar
    const h1 = (correctCount / total) * maxHeight;
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(60, 250 - h1, barWidth, h1);
    ctx.fillStyle = '#000';
    ctx.fillText('Správné', 60, 265);

    // Incorrect bar
    const h2 = (incorrectCount / total) * maxHeight;
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(160, 250 - h2, barWidth, h2);
    ctx.fillStyle = '#000';
    ctx.fillText('Špatné', 160, 265);
}
