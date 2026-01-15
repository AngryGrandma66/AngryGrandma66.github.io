/**
 * Main application controller.
 * Handles UI interactions and chart generation.
 */

import { Deck } from './models.js';
import { runSingleSimulation, runBatchSimulation, runBatchSimulationAsync } from './simulation.js';

// Plotly dark theme configuration
const LAYOUT_THEME = {
    template: "plotly_dark",
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    legend: {
        orientation: "h",
        yanchor: "bottom",
        y: 1.02,
        xanchor: "right",
        x: 1
    },
    font: {
        family: "system-ui, -apple-system, sans-serif"
    }
};

// Color scheme
const COLORS = {
    protagonist: '#375a7f',
    antagonist: '#e74c3c'
};

// DOM Elements
let elements = {};

/**
 * Initialize the application.
 */
function init() {
    // Cache DOM elements
    elements = {
        // Protagonist
        protagonistDeck: document.getElementById('protagonist-deck'),
        protagonistAc: document.getElementById('protagonist-ac'),
        protagonistHitBonus: document.getElementById('protagonist-hit-bonus'),
        protagonistReactionChance: document.getElementById('protagonist-reaction-chance'),
        protagonistReactionValue: document.getElementById('protagonist-reaction-value'),
        protagonistCounterChance: document.getElementById('protagonist-counter-chance'),
        protagonistCounterValue: document.getElementById('protagonist-counter-value'),
        protagonistResources: document.getElementById('protagonist-resources'),
        protagonistDanger: document.getElementById('protagonist-danger'),
        protagonistStrategy: document.getElementById('protagonist-strategy'),

        // Antagonist
        antagonistDeck: document.getElementById('antagonist-deck'),
        antagonistAc: document.getElementById('antagonist-ac'),
        antagonistHitBonus: document.getElementById('antagonist-hit-bonus'),
        antagonistReactionChance: document.getElementById('antagonist-reaction-chance'),
        antagonistReactionValue: document.getElementById('antagonist-reaction-value'),
        antagonistCounterChance: document.getElementById('antagonist-counter-chance'),
        antagonistCounterValue: document.getElementById('antagonist-counter-value'),
        antagonistResources: document.getElementById('antagonist-resources'),
        antagonistDanger: document.getElementById('antagonist-danger'),
        antagonistStrategy: document.getElementById('antagonist-strategy'),

        // Simulation controls
        numTurns: document.getElementById('num-turns'),
        startingPlayer: document.getElementById('starting-player'),
        modeSingle: document.getElementById('mode-single'),
        modeBatch: document.getElementById('mode-batch'),
        batchSize: document.getElementById('batch-size'),
        useAsync: document.getElementById('use-async'),
        runButton: document.getElementById('run-button'),

        // UI elements
        errorAlert: document.getElementById('error-alert'),
        errorMessage: document.getElementById('error-message'),
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingProgress: document.getElementById('loading-progress'),
        resultsSummary: document.getElementById('results-summary'),

        // Chart containers
        damageGraph: document.getElementById('damage-graph'),
        resourcesGraph: document.getElementById('resources-graph'),
        damageStatsGraph: document.getElementById('damage-stats-graph'),
        cardsGraph: document.getElementById('cards-graph'),
        reactionsGraph: document.getElementById('reactions-graph'),
        distributionGraph: document.getElementById('distribution-graph')
    };

    // Set up event listeners
    setupEventListeners();

    // Initialize empty charts
    initializeEmptyCharts();
}

/**
 * Set up all event listeners.
 */
function setupEventListeners() {
    // Run button
    elements.runButton.addEventListener('click', handleRunSimulation);

    // Slider value displays
    elements.protagonistReactionChance.addEventListener('input', (e) => {
        elements.protagonistReactionValue.textContent = `${Math.round(e.target.value * 100)}%`;
    });
    elements.protagonistCounterChance.addEventListener('input', (e) => {
        elements.protagonistCounterValue.textContent = `${Math.round(e.target.value * 100)}%`;
    });
    elements.antagonistReactionChance.addEventListener('input', (e) => {
        elements.antagonistReactionValue.textContent = `${Math.round(e.target.value * 100)}%`;
    });
    elements.antagonistCounterChance.addEventListener('input', (e) => {
        elements.antagonistCounterValue.textContent = `${Math.round(e.target.value * 100)}%`;
    });

    // Deck input validation on blur
    elements.protagonistDeck.addEventListener('blur', () => validateDeckInput(elements.protagonistDeck));
    elements.antagonistDeck.addEventListener('blur', () => validateDeckInput(elements.antagonistDeck));

    // Error alert close button
    elements.errorAlert.querySelector('.btn-close')?.addEventListener('click', hideError);
}

/**
 * Validate deck input and show/hide validation feedback.
 * @param {HTMLInputElement} inputElement
 * @returns {boolean}
 */
function validateDeckInput(inputElement) {
    const validation = Deck.validate(inputElement.value);
    
    // Remove existing feedback
    const existingFeedback = inputElement.parentElement.querySelector('.invalid-feedback-custom');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    if (!validation.valid) {
        inputElement.classList.add('is-invalid');
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback-custom';
        feedback.textContent = validation.error;
        inputElement.parentElement.appendChild(feedback);
        return false;
    } else {
        inputElement.classList.remove('is-invalid');
        return true;
    }
}

/**
 * Get all configuration values from the form.
 * @returns {Object}
 */
function getConfig() {
    return {
        protagonistDeck: elements.protagonistDeck.value,
        antagonistDeck: elements.antagonistDeck.value,
        protagonistAc: parseInt(elements.protagonistAc.value) || 10,
        antagonistAc: parseInt(elements.antagonistAc.value) || 10,
        protagonistHitBonus: parseInt(elements.protagonistHitBonus.value) || 0,
        antagonistHitBonus: parseInt(elements.antagonistHitBonus.value) || 0,
        protagonistReactionChance: parseFloat(elements.protagonistReactionChance.value) || 0.5,
        antagonistReactionChance: parseFloat(elements.antagonistReactionChance.value) || 0.5,
        protagonistCounterChance: parseFloat(elements.protagonistCounterChance.value) || 0.3,
        antagonistCounterChance: parseFloat(elements.antagonistCounterChance.value) || 0.3,
        protagonistResources: parseInt(elements.protagonistResources.value) || 10,
        antagonistResources: parseInt(elements.antagonistResources.value) || 10,
        protagonistDanger: parseInt(elements.protagonistDanger.value) || 3,
        antagonistDanger: parseInt(elements.antagonistDanger.value) || 3,
        protagonistStrategy: elements.protagonistStrategy.value || 'random',
        antagonistStrategy: elements.antagonistStrategy.value || 'random',
        numTurns: parseInt(elements.numTurns.value) || 10,
        protagonistStarts: elements.startingPlayer.value === 'protagonist',
        isBatchMode: elements.modeBatch.checked,
        batchSize: parseInt(elements.batchSize.value) || 100,
        useAsync: elements.useAsync.checked
    };
}

/**
 * Validate all inputs before running simulation.
 * @param {Object} config
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateConfig(config) {
    const errors = [];

    // Validate decks
    const protDeckValidation = Deck.validate(config.protagonistDeck);
    if (!protDeckValidation.valid) {
        errors.push(`Protagonist deck: ${protDeckValidation.error}`);
    }

    const antagDeckValidation = Deck.validate(config.antagonistDeck);
    if (!antagDeckValidation.valid) {
        errors.push(`Antagonist deck: ${antagDeckValidation.error}`);
    }

    // Check for empty decks
    if (!config.protagonistDeck.trim()) {
        errors.push("Protagonist deck is empty");
    }
    if (!config.antagonistDeck.trim()) {
        errors.push("Antagonist deck is empty");
    }

    // Validate numeric ranges
    if (config.numTurns < 1 || config.numTurns > 100) {
        errors.push("Number of turns must be between 1 and 100");
    }
    if (config.isBatchMode && (config.batchSize < 10 || config.batchSize > 1000)) {
        errors.push("Batch size must be between 10 and 1000");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Handle the run simulation button click.
 */
async function handleRunSimulation() {
    hideError();

    const config = getConfig();
    const validation = validateConfig(config);

    if (!validation.valid) {
        showError(validation.errors.join('; '));
        return;
    }

    // Update UI to loading state
    setLoadingState(true);

    try {
        if (config.isBatchMode) {
            // Batch simulation
            let result;
            if (config.useAsync) {
                result = await runBatchSimulationAsync({
                    numRuns: config.batchSize,
                    protagonistDeck: config.protagonistDeck,
                    antagonistDeck: config.antagonistDeck,
                    protagonistAc: config.protagonistAc,
                    antagonistAc: config.antagonistAc,
                    protagonistHitBonus: config.protagonistHitBonus,
                    antagonistHitBonus: config.antagonistHitBonus,
                    protagonistReactionChance: config.protagonistReactionChance,
                    antagonistReactionChance: config.antagonistReactionChance,
                    protagonistCounterChance: config.protagonistCounterChance,
                    antagonistCounterChance: config.antagonistCounterChance,
                    protagonistResources: config.protagonistResources,
                    antagonistResources: config.antagonistResources,
                    protagonistDanger: config.protagonistDanger,
                    antagonistDanger: config.antagonistDanger,
                    protagonistStrategy: config.protagonistStrategy,
                    antagonistStrategy: config.antagonistStrategy,
                    numTurns: config.numTurns,
                    protagonistStarts: config.protagonistStarts
                }, updateProgress);
            } else {
                result = runBatchSimulation({
                    numRuns: config.batchSize,
                    protagonistDeck: config.protagonistDeck,
                    antagonistDeck: config.antagonistDeck,
                    protagonistAc: config.protagonistAc,
                    antagonistAc: config.antagonistAc,
                    protagonistHitBonus: config.protagonistHitBonus,
                    antagonistHitBonus: config.antagonistHitBonus,
                    protagonistReactionChance: config.protagonistReactionChance,
                    antagonistReactionChance: config.antagonistReactionChance,
                    protagonistCounterChance: config.protagonistCounterChance,
                    antagonistCounterChance: config.antagonistCounterChance,
                    protagonistResources: config.protagonistResources,
                    antagonistResources: config.antagonistResources,
                    protagonistDanger: config.protagonistDanger,
                    antagonistDanger: config.antagonistDanger,
                    protagonistStrategy: config.protagonistStrategy,
                    antagonistStrategy: config.antagonistStrategy,
                    numTurns: config.numTurns,
                    protagonistStarts: config.protagonistStarts
                });
            }
            displayBatchResults(result);
        } else {
            // Single simulation
            const result = runSingleSimulation({
                protagonistDeck: config.protagonistDeck,
                antagonistDeck: config.antagonistDeck,
                protagonistAc: config.protagonistAc,
                antagonistAc: config.antagonistAc,
                protagonistHitBonus: config.protagonistHitBonus,
                antagonistHitBonus: config.antagonistHitBonus,
                protagonistReactionChance: config.protagonistReactionChance,
                antagonistReactionChance: config.antagonistReactionChance,
                protagonistCounterChance: config.protagonistCounterChance,
                antagonistCounterChance: config.antagonistCounterChance,
                protagonistResources: config.protagonistResources,
                antagonistResources: config.antagonistResources,
                protagonistDanger: config.protagonistDanger,
                antagonistDanger: config.antagonistDanger,
                protagonistStrategy: config.protagonistStrategy,
                antagonistStrategy: config.antagonistStrategy,
                numTurns: config.numTurns,
                protagonistStarts: config.protagonistStarts
            });
            displaySingleResults(result);
        }
    } catch (error) {
        showError(error.message);
        console.error('Simulation error:', error);
    } finally {
        setLoadingState(false);
    }
}

/**
 * Update progress display during async batch simulation.
 * @param {number} completed
 * @param {number} total
 */
function updateProgress(completed, total) {
    elements.loadingProgress.textContent = `${completed} / ${total} runs`;
}

/**
 * Set the UI loading state.
 * @param {boolean} isLoading
 */
function setLoadingState(isLoading) {
    if (isLoading) {
        elements.runButton.disabled = true;
        elements.runButton.querySelector('.btn-text').textContent = 'Running...';
        elements.runButton.querySelector('.spinner-border').classList.remove('d-none');
        elements.loadingOverlay.classList.add('show');
        elements.loadingProgress.textContent = '0 / 0 runs';
    } else {
        elements.runButton.disabled = false;
        elements.runButton.querySelector('.btn-text').textContent = '▶ Run Simulation';
        elements.runButton.querySelector('.spinner-border').classList.add('d-none');
        elements.loadingOverlay.classList.remove('show');
    }
}

/**
 * Show error message.
 * @param {string} message
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorAlert.style.display = 'block';
    elements.errorAlert.classList.add('show');
}

/**
 * Hide error message.
 */
function hideError() {
    elements.errorAlert.classList.remove('show');
    elements.errorAlert.style.display = 'none';
}

/**
 * Initialize empty charts with placeholder.
 */
function initializeEmptyCharts() {
    const emptyLayout = {
        ...LAYOUT_THEME,
        xaxis: { visible: false },
        yaxis: { visible: false },
        annotations: [{
            text: "Run a simulation to see results",
            xref: "paper",
            yref: "paper",
            x: 0.5,
            y: 0.5,
            showarrow: false,
            font: { size: 14, color: '#888' }
        }]
    };

    const config = { responsive: true, displayModeBar: false };

    Plotly.newPlot(elements.damageGraph, [], emptyLayout, config);
    Plotly.newPlot(elements.resourcesGraph, [], emptyLayout, config);
    Plotly.newPlot(elements.damageStatsGraph, [], emptyLayout, config);
    Plotly.newPlot(elements.cardsGraph, [], emptyLayout, config);
    Plotly.newPlot(elements.reactionsGraph, [], emptyLayout, config);
    Plotly.newPlot(elements.distributionGraph, [], emptyLayout, config);
}

/**
 * Display results from a single simulation run.
 * @param {SimulationResult} result
 */
function displaySingleResults(result) {
    // Update summary
    elements.resultsSummary.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h4 class="text-primary">Protagonist</h4>
                <p><strong>Total Damage Taken:</strong> ${result.protagonistTotalDamage}</p>
                <p><strong>Min/Avg/Max Hit:</strong> ${result.protagonistMinDamage || 0} / ${result.protagonistAvgDamage.toFixed(1)} / ${result.protagonistMaxDamage || 0}</p>
                <hr>
                <p><strong>Theoretical (if all hits land):</strong></p>
                <p>Min/Avg/Max: ${result.protagonistTheoreticalMin} / ${result.protagonistTheoreticalAvg.toFixed(1)} / ${result.protagonistTheoreticalMax}</p>
            </div>
            <div class="col-md-6">
                <h4 class="text-danger">Antagonist</h4>
                <p><strong>Total Damage Taken:</strong> ${result.antagonistTotalDamage}</p>
                <p><strong>Min/Avg/Max Hit:</strong> ${result.antagonistMinDamage || 0} / ${result.antagonistAvgDamage.toFixed(1)} / ${result.antagonistMaxDamage || 0}</p>
                <hr>
                <p><strong>Theoretical (if all hits land):</strong></p>
                <p>Min/Avg/Max: ${result.antagonistTheoreticalMin} / ${result.antagonistTheoreticalAvg.toFixed(1)} / ${result.antagonistTheoreticalMax}</p>
            </div>
        </div>
    `;

    // Extract data from turns
    const turns = result.turns.map((_, i) => i + 1);
    const protDamage = result.turns.map(t => t.protagonistDamage);
    const antagDamage = result.turns.map(t => t.antagonistDamage);
    const protResources = result.turns.map(t => t.protagonistResources);
    const antagResources = result.turns.map(t => t.antagonistResources);
    const protCards = result.turns.map(t => t.protagonistCardsRemaining);
    const antagCards = result.turns.map(t => t.antagonistCardsRemaining);
    const protReactions = result.turns.map(t => t.protagonistReactions);
    const antagReactions = result.turns.map(t => t.antagonistReactions);

    const config = { responsive: true, displayModeBar: false };

    // Damage over time
    Plotly.newPlot(elements.damageGraph, [
        {
            x: turns, y: protDamage, mode: 'lines+markers',
            name: 'Protagonist', line: { color: COLORS.protagonist, width: 2 }
        },
        {
            x: turns, y: antagDamage, mode: 'lines+markers',
            name: 'Antagonist', line: { color: COLORS.antagonist, width: 2 }
        }
    ], {
        ...LAYOUT_THEME,
        xaxis: { title: 'Turn' },
        yaxis: { title: 'Cumulative Damage Taken' }
    }, config);

    // Resources over time
    Plotly.newPlot(elements.resourcesGraph, [
        {
            x: turns, y: protResources, mode: 'lines+markers',
            name: 'Protagonist', line: { color: COLORS.protagonist, width: 2 }
        },
        {
            x: turns, y: antagResources, mode: 'lines+markers',
            name: 'Antagonist', line: { color: COLORS.antagonist, width: 2 }
        }
    ], {
        ...LAYOUT_THEME,
        xaxis: { title: 'Turn' },
        yaxis: { title: 'Resources Remaining' }
    }, config);

    // Damage stats bar chart
    const categories = ['Min Hit', 'Avg Hit', 'Max Hit', 'Total', 'Theo Min', 'Theo Avg', 'Theo Max'];
    const protStats = [
        result.protagonistMinDamage || 0,
        result.protagonistAvgDamage,
        result.protagonistMaxDamage || 0,
        result.protagonistTotalDamage,
        result.protagonistTheoreticalMin,
        result.protagonistTheoreticalAvg,
        result.protagonistTheoreticalMax
    ];
    const antagStats = [
        result.antagonistMinDamage || 0,
        result.antagonistAvgDamage,
        result.antagonistMaxDamage || 0,
        result.antagonistTotalDamage,
        result.antagonistTheoreticalMin,
        result.antagonistTheoreticalAvg,
        result.antagonistTheoreticalMax
    ];

    Plotly.newPlot(elements.damageStatsGraph, [
        { name: 'Protagonist', x: categories, y: protStats, type: 'bar', marker: { color: COLORS.protagonist } },
        { name: 'Antagonist', x: categories, y: antagStats, type: 'bar', marker: { color: COLORS.antagonist } }
    ], {
        ...LAYOUT_THEME,
        barmode: 'group'
    }, config);

    // Cards remaining
    Plotly.newPlot(elements.cardsGraph, [
        {
            x: turns, y: protCards, mode: 'lines+markers',
            name: 'Protagonist', line: { color: COLORS.protagonist, width: 2 }
        },
        {
            x: turns, y: antagCards, mode: 'lines+markers',
            name: 'Antagonist', line: { color: COLORS.antagonist, width: 2 }
        }
    ], {
        ...LAYOUT_THEME,
        xaxis: { title: 'Turn' },
        yaxis: { title: 'Cards Remaining' }
    }, config);

    // Reactions
    Plotly.newPlot(elements.reactionsGraph, [
        {
            x: turns, y: protReactions, mode: 'lines+markers',
            name: 'Protagonist', line: { color: COLORS.protagonist, width: 2 }
        },
        {
            x: turns, y: antagReactions, mode: 'lines+markers',
            name: 'Antagonist', line: { color: COLORS.antagonist, width: 2 }
        }
    ], {
        ...LAYOUT_THEME,
        xaxis: { title: 'Turn' },
        yaxis: { title: 'Cumulative Reactions Used' }
    }, config);

    // Distribution (empty for single run)
    Plotly.newPlot(elements.distributionGraph, [], {
        ...LAYOUT_THEME,
        annotations: [{
            text: "Distribution only available in Batch Mode",
            xref: "paper", yref: "paper",
            x: 0.5, y: 0.5, showarrow: false,
            font: { size: 14, color: '#888' }
        }]
    }, config);
}

/**
 * Display results from a batch simulation.
 * @param {BatchResult} result
 */
function displayBatchResults(result) {
    // Update summary
    elements.resultsSummary.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h4 class="text-primary">Protagonist</h4>
                <p><strong>Damage Taken - Min:</strong> ${result.protagonistDamageMin.toFixed(1)}</p>
                <p><strong>Damage Taken - Avg:</strong> ${result.protagonistDamageAvg.toFixed(1)}</p>
                <p><strong>Damage Taken - Max:</strong> ${result.protagonistDamageMax.toFixed(1)}</p>
                <hr>
                <p><strong>Theoretical (if all hits land):</strong></p>
                <p>Min/Avg/Max: ${result.protagonistTheoreticalMin} / ${result.protagonistTheoreticalAvg.toFixed(1)} / ${result.protagonistTheoreticalMax}</p>
            </div>
            <div class="col-md-6">
                <h4 class="text-danger">Antagonist</h4>
                <p><strong>Damage Taken - Min:</strong> ${result.antagonistDamageMin.toFixed(1)}</p>
                <p><strong>Damage Taken - Avg:</strong> ${result.antagonistDamageAvg.toFixed(1)}</p>
                <p><strong>Damage Taken - Max:</strong> ${result.antagonistDamageMax.toFixed(1)}</p>
                <hr>
                <p><strong>Theoretical (if all hits land):</strong></p>
                <p>Min/Avg/Max: ${result.antagonistTheoreticalMin} / ${result.antagonistTheoreticalAvg.toFixed(1)} / ${result.antagonistTheoreticalMax}</p>
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-12 text-center text-muted">
                <small>Results aggregated from ${result.numRuns} simulation runs</small>
            </div>
        </div>
    `;

    const turns = result.protagonistDamagePerTurn.map((_, i) => i + 1);
    const config = { responsive: true, displayModeBar: false };

    // Damage over time (averaged)
    Plotly.newPlot(elements.damageGraph, [
        {
            x: turns, y: result.protagonistDamagePerTurn, mode: 'lines+markers',
            name: 'Protagonist (avg)', line: { color: COLORS.protagonist, width: 2 }
        },
        {
            x: turns, y: result.antagonistDamagePerTurn, mode: 'lines+markers',
            name: 'Antagonist (avg)', line: { color: COLORS.antagonist, width: 2 }
        }
    ], {
        ...LAYOUT_THEME,
        xaxis: { title: 'Turn' },
        yaxis: { title: 'Average Cumulative Damage' }
    }, config);

    // Resources over time (averaged)
    Plotly.newPlot(elements.resourcesGraph, [
        {
            x: turns, y: result.protagonistResourcesPerTurn, mode: 'lines+markers',
            name: 'Protagonist (avg)', line: { color: COLORS.protagonist, width: 2 }
        },
        {
            x: turns, y: result.antagonistResourcesPerTurn, mode: 'lines+markers',
            name: 'Antagonist (avg)', line: { color: COLORS.antagonist, width: 2 }
        }
    ], {
        ...LAYOUT_THEME,
        xaxis: { title: 'Turn' },
        yaxis: { title: 'Average Resources Remaining' }
    }, config);

    // Damage stats bar chart
    const categories = ['Min', 'Avg', 'Max', 'Theo Min', 'Theo Avg', 'Theo Max'];
    const protStats = [
        result.protagonistDamageMin,
        result.protagonistDamageAvg,
        result.protagonistDamageMax,
        result.protagonistTheoreticalMin,
        result.protagonistTheoreticalAvg,
        result.protagonistTheoreticalMax
    ];
    const antagStats = [
        result.antagonistDamageMin,
        result.antagonistDamageAvg,
        result.antagonistDamageMax,
        result.antagonistTheoreticalMin,
        result.antagonistTheoreticalAvg,
        result.antagonistTheoreticalMax
    ];

    Plotly.newPlot(elements.damageStatsGraph, [
        { name: 'Protagonist', x: categories, y: protStats, type: 'bar', marker: { color: COLORS.protagonist } },
        { name: 'Antagonist', x: categories, y: antagStats, type: 'bar', marker: { color: COLORS.antagonist } }
    ], {
        ...LAYOUT_THEME,
        barmode: 'group',
        yaxis: { title: 'Total Damage Taken' }
    }, config);

    // Cards remaining (averaged)
    Plotly.newPlot(elements.cardsGraph, [
        {
            x: turns, y: result.protagonistCardsPerTurn, mode: 'lines+markers',
            name: 'Protagonist (avg)', line: { color: COLORS.protagonist, width: 2 }
        },
        {
            x: turns, y: result.antagonistCardsPerTurn, mode: 'lines+markers',
            name: 'Antagonist (avg)', line: { color: COLORS.antagonist, width: 2 }
        }
    ], {
        ...LAYOUT_THEME,
        xaxis: { title: 'Turn' },
        yaxis: { title: 'Average Cards Remaining' }
    }, config);

    // Reactions (averaged)
    Plotly.newPlot(elements.reactionsGraph, [
        {
            x: turns, y: result.protagonistReactionsPerTurn, mode: 'lines+markers',
            name: 'Protagonist (avg)', line: { color: COLORS.protagonist, width: 2 }
        },
        {
            x: turns, y: result.antagonistReactionsPerTurn, mode: 'lines+markers',
            name: 'Antagonist (avg)', line: { color: COLORS.antagonist, width: 2 }
        }
    ], {
        ...LAYOUT_THEME,
        xaxis: { title: 'Turn' },
        yaxis: { title: 'Average Cumulative Reactions' }
    }, config);

    // Damage distribution histogram
    Plotly.newPlot(elements.distributionGraph, [
        {
            x: result.allProtagonistDamages,
            name: 'Protagonist',
            type: 'histogram',
            opacity: 0.7,
            marker: { color: COLORS.protagonist }
        },
        {
            x: result.allAntagonistDamages,
            name: 'Antagonist',
            type: 'histogram',
            opacity: 0.7,
            marker: { color: COLORS.antagonist }
        }
    ], {
        ...LAYOUT_THEME,
        barmode: 'overlay',
        xaxis: { title: 'Total Damage Taken' },
        yaxis: { title: 'Frequency' }
    }, config);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

