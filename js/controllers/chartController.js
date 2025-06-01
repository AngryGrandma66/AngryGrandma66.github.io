/**
 * Draw a combined bar‐and‐pie chart on the given <canvas> to show correct vs. incorrect counts.
 * @param {HTMLCanvasElement} canvasEl ‒ the canvas where the chart will be drawn
 * @param {number} correctCount ‒ number of correct answers
 * @param {number} incorrectCount ‒ number of incorrect answers
 */
export function drawResultsChart(canvasEl, correctCount, incorrectCount) {
    const ctx = canvasEl.getContext('2d');
    const w = canvasEl.width;
    const h = canvasEl.height;

    ctx.clearRect(0, 0, w, h);

    const total = correctCount + incorrectCount;
    if (total === 0) return;

    const correctColor = '#27ae60';
    const incorrectColor = '#c0392b';
    const axisColor = '#333';
    const labelColor = '#000';
    const pieLabelColor = '#fff';

    const barAreaWidth = w * 0.45;
    const barAreaHeight = h * 0.8;
    const barBaseY = h * 0.9;
    const maxBarHeight = barAreaHeight * 0.8;

    const barWidth = barAreaWidth * 0.25;
    const spacing   = barAreaWidth * 0.4;
    const firstBarX = barAreaWidth * 0.1;


    const barHeightCorrect = (correctCount / total) * maxBarHeight;
    const barHeightIncorrect = (incorrectCount / total) * maxBarHeight;


    ctx.fillStyle = correctColor;
    ctx.fillRect(
        firstBarX,
        barBaseY - barHeightCorrect,
        barWidth,
        barHeightCorrect
    );

    const secondBarX = firstBarX + barWidth + spacing;
    ctx.fillStyle = incorrectColor;
    ctx.fillRect(
        secondBarX,
        barBaseY - barHeightIncorrect,
        barWidth,
        barHeightIncorrect
    );


    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, barBaseY);
    ctx.lineTo(barAreaWidth, barBaseY);
    ctx.stroke();


    ctx.fillStyle = labelColor;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';

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


    const pieAreaXStart = barAreaWidth;
    const pieCenterX = pieAreaXStart + (w - pieAreaWidth()) / 2;
    const pieCenterY = h / 2;
    const radius = Math.min(w - pieAreaWidth(), h) * 0.35;


    function pieAreaWidth() {
        return w - barAreaWidth;
    }


    const startAngle = -Math.PI / 2;
    const correctAngle = (correctCount / total) * (Math.PI * 2);
    const incorrectAngle = Math.PI * 2 - correctAngle;


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




    ctx.fillStyle = pieLabelColor;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';

    const percentCorrect = Math.round((correctCount / total) * 100);
    const percentIncorrect = 100 - percentCorrect;

    const midAngleCorrect = startAngle + correctAngle / 2;
    const labelXCorrect = pieCenterX + Math.cos(midAngleCorrect) * (radius * 0.6);
    const labelYCorrect = pieCenterY + Math.sin(midAngleCorrect) * (radius * 0.6);
    ctx.fillText(`${percentCorrect}%`, labelXCorrect, labelYCorrect);

    const midAngleIncorrect = startAngle + correctAngle + (incorrectAngle / 2);
    const labelXIncorrect = pieCenterX + Math.cos(midAngleIncorrect) * (radius * 0.6);
    const labelYIncorrect = pieCenterY + Math.sin(midAngleIncorrect) * (radius * 0.6);
    ctx.fillText(`${percentIncorrect}%`, labelXIncorrect, labelYIncorrect);

    ctx.fillStyle = labelColor;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Výsledky kvízu', w / 2, h * 0.08);
}
