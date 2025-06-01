// js/chartController.js

/**
 * Draw a combined bar chart and pie chart on the given canvas,
 * showing “correct” vs. “incorrect” counts with enhanced styling.
 *
 * @param {HTMLCanvasElement} canvasEl
 * @param {number} correctCount
 * @param {number} incorrectCount
 */
export function drawResultsChart(canvasEl, correctCount, incorrectCount) {
    const ctx = canvasEl.getContext('2d');
    const w = canvasEl.width;
    const h = canvasEl.height;

    // Clear whole canvas
    ctx.clearRect(0, 0, w, h);

    const total = correctCount + incorrectCount;
    if (total === 0) return;

    // Colors
    const correctColor = '#27ae60';
    const incorrectColor = '#c0392b';
    const axisColor = '#333';
    const labelColor = '#000';
    const pieLabelColor = '#fff';

    // ── 1) BAR CHART (left ~45% of canvas) ──
    const barAreaWidth = w * 0.45;
    const barAreaHeight = h * 0.8;
    const barBaseY = h * 0.9;             // baseline for bars, leaving some bottom margin
    const maxBarHeight = barAreaHeight * 0.8; // leave top padding

    // Compute bar dimensions
    const barWidth = barAreaWidth * 0.25;       // 25% of bar area width
    const spacing   = barAreaWidth * 0.4;       // 40% of bar area width between bars
    const firstBarX = barAreaWidth * 0.1;       // 10% left padding within bar area

    // Calculate scaled heights
    const barHeightCorrect = (correctCount / total) * maxBarHeight;
    const barHeightIncorrect = (incorrectCount / total) * maxBarHeight;

    // Draw “Correct” bar
    ctx.fillStyle = correctColor;
    ctx.fillRect(
        firstBarX,
        barBaseY - barHeightCorrect,
        barWidth,
        barHeightCorrect
    );
    // Draw “Incorrect” bar
    const secondBarX = firstBarX + barWidth + spacing;
    ctx.fillStyle = incorrectColor;
    ctx.fillRect(
        secondBarX,
        barBaseY - barHeightIncorrect,
        barWidth,
        barHeightIncorrect
    );

    // Draw baseline axis
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, barBaseY);
    ctx.lineTo(barAreaWidth, barBaseY);
    ctx.stroke();

    // Labels under bars
    ctx.fillStyle = labelColor;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    // “Správné” label & count
    ctx.fillText(
        'Správné',
        firstBarX + barWidth / 2,
        barBaseY + 18
    );
    ctx.fillText(
        correctCount,
        firstBarX + barWidth / 2,
        barBaseY - barHeightCorrect - 10
    );
    // “Špatné” label & count
    ctx.fillText(
        'Špatné',
        secondBarX + barWidth / 2,
        barBaseY + 18
    );
    ctx.fillText(
        incorrectCount,
        secondBarX + barWidth / 2,
        barBaseY - barHeightIncorrect - 10
    );

    // ── 2) PIE CHART (right ~50% of canvas) ──
    const pieAreaXStart = barAreaWidth;
    const pieCenterX = pieAreaXStart + (w - pieAreaWidth()) / 2;
    const pieCenterY = h / 2;
    const radius = Math.min(w - pieAreaWidth(), h) * 0.35;

    // Helper to recalc pieAreaWidth if needed
    function pieAreaWidth() {
        return w - barAreaWidth;
    }

    // Angles
    const startAngle = -Math.PI / 2;
    const correctAngle = (correctCount / total) * (Math.PI * 2);
    const incorrectAngle = Math.PI * 2 - correctAngle;

    // Draw “correct” slice
    ctx.beginPath();
    ctx.moveTo(pieCenterX, pieCenterY);
    ctx.arc(
        pieCenterX,
        pieCenterY,
        radius,
        startAngle,
        startAngle + correctAngle
    );
    ctx.closePath();
    ctx.fillStyle = correctColor;
    ctx.fill();

    // Draw “incorrect” slice
    ctx.beginPath();
    ctx.moveTo(pieCenterX, pieCenterY);
    ctx.arc(
        pieCenterX,
        pieCenterY,
        radius,
        startAngle + correctAngle,
        startAngle + correctAngle + incorrectAngle
    );
    ctx.closePath();
    ctx.fillStyle = incorrectColor;
    ctx.fill();



    // Pie percentage labels (white text inside slices)
    ctx.fillStyle = pieLabelColor;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';

    const percentCorrect = Math.round((correctCount / total) * 100);
    const percentIncorrect = 100 - percentCorrect;

    // Label for “correct” slice
    const midAngleCorrect = startAngle + correctAngle / 2;
    const labelXCorrect = pieCenterX + Math.cos(midAngleCorrect) * (radius * 0.6);
    const labelYCorrect = pieCenterY + Math.sin(midAngleCorrect) * (radius * 0.6);
    ctx.fillText(`${percentCorrect}%`, labelXCorrect, labelYCorrect);

    // Label for “incorrect” slice
    const midAngleIncorrect = startAngle + correctAngle + (incorrectAngle / 2);
    const labelXIncorrect = pieCenterX + Math.cos(midAngleIncorrect) * (radius * 0.6);
    const labelYIncorrect = pieCenterY + Math.sin(midAngleIncorrect) * (radius * 0.6);
    ctx.fillText(`${percentIncorrect}%`, labelXIncorrect, labelYIncorrect);

    // ── 3) OPTIONAL: Add a title above the combined chart ──
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Výsledky kvízu', w / 2, h * 0.08);
}
