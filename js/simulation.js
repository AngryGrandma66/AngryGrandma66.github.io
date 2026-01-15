/**
 * Combat simulation engine.
 * Ported from Python simulation.py
 */

import {
    Combatant,
    Deck,
    TurnSnapshot,
    SimulationResult,
    BatchResult
} from './models.js';

import {
    resolveHitRoll,
    resolveCardCombat,
    isDiamondAttack,
    calculateReactionCost,
    calculateDeckTheoreticalStats
} from './rules.js';

import { getStrategy } from './strategy.js';

/**
 * Simulates turn-based card combat between two combatants.
 */
export class CombatSimulation {
    /**
     * @param {Combatant} protagonist - First combatant
     * @param {Combatant} antagonist - Second combatant
     * @param {number} numTurns - Number of turns to simulate
     * @param {boolean} protagonistStarts - Whether protagonist goes first
     */
    constructor(protagonist, antagonist, numTurns = 10, protagonistStarts = true) {
        this.protagonist = protagonist;
        this.antagonist = antagonist;
        this.numTurns = numTurns;
        this.protagonistStarts = protagonistStarts;
        this.currentTurn = 0;
        this.turns = [];
    }

    /**
     * Get (active, inactive) combatants based on current turn.
     * @returns {[Combatant, Combatant]}
     */
    _getCombatantsInOrder() {
        // Turns alternate: 0=starter, 1=other, 2=starter, etc.
        const isProtagonistTurn = (this.currentTurn % 2 === 0) === this.protagonistStarts;

        if (isProtagonistTurn) {
            return [this.protagonist, this.antagonist];
        } else {
            return [this.antagonist, this.protagonist];
        }
    }

    /**
     * Decide whether to attack or defend.
     * @param {Combatant} attacker
     * @returns {string} 'attack' or 'defend'
     */
    _decideAction(attacker) {
        const strategy = getStrategy(attacker.strategy);

        // Can't attack without cards
        if (attacker.deck.isEmpty()) {
            return 'defend';
        }

        if (strategy.shouldDefendAction(attacker)) {
            return 'defend';
        }

        return 'attack';
    }

    /**
     * Execute a defend action.
     * @param {Combatant} combatant
     * @returns {TurnSnapshot}
     */
    _executeDefend(combatant) {
        combatant.applyDefend();

        return new TurnSnapshot({
            turnNumber: this.currentTurn,
            protagonistDamage: this.protagonist.damageTaken.total,
            antagonistDamage: this.antagonist.damageTaken.total,
            protagonistResources: this.protagonist.currentResources,
            antagonistResources: this.antagonist.currentResources,
            protagonistCardsRemaining: this.protagonist.deck.remaining(),
            antagonistCardsRemaining: this.antagonist.deck.remaining(),
            protagonistReactions: this.protagonist.reactionsUsed,
            antagonistReactions: this.antagonist.reactionsUsed,
            actionTaken: 'defend',
            attacker: combatant.name
        });
    }

    /**
     * Execute an attack action with full resolution.
     * @param {Combatant} attacker
     * @param {Combatant} defender
     * @returns {TurnSnapshot}
     */
    _executeAttack(attacker, defender) {
        const strategyAttacker = getStrategy(attacker.strategy);
        const strategyDefender = getStrategy(defender.strategy);

        // Select attack card
        const attackCard = strategyAttacker.selectAttackCard(attacker);

        if (attackCard === null) {
            // No cards - forced to defend
            attacker.applyDefend();
            return new TurnSnapshot({
                turnNumber: this.currentTurn,
                protagonistDamage: this.protagonist.damageTaken.total,
                antagonistDamage: this.antagonist.damageTaken.total,
                protagonistResources: this.protagonist.currentResources,
                antagonistResources: this.antagonist.currentResources,
                protagonistCardsRemaining: this.protagonist.deck.remaining(),
                antagonistCardsRemaining: this.antagonist.deck.remaining(),
                protagonistReactions: this.protagonist.reactionsUsed,
                antagonistReactions: this.antagonist.reactionsUsed,
                actionTaken: 'no_cards',
                attacker: attacker.name
            });
        }

        attacker.cardsPlayed += 1;
        const isDiamond = isDiamondAttack(attackCard);

        // AC hit roll
        const [hitRoll, hitSuccess] = resolveHitRoll(attacker, defender, attackCard);

        const snapshot = new TurnSnapshot({
            turnNumber: this.currentTurn,
            protagonistDamage: this.protagonist.damageTaken.total,
            antagonistDamage: this.antagonist.damageTaken.total,
            protagonistResources: this.protagonist.currentResources,
            antagonistResources: this.antagonist.currentResources,
            protagonistCardsRemaining: this.protagonist.deck.remaining(),
            antagonistCardsRemaining: this.antagonist.deck.remaining(),
            protagonistReactions: this.protagonist.reactionsUsed,
            antagonistReactions: this.antagonist.reactionsUsed,
            actionTaken: 'attack',
            attacker: attacker.name,
            hitRoll: hitRoll,
            hitSuccess: hitSuccess,
            attackCard: attackCard.toString()
        });

        if (!hitSuccess) {
            // Miss - only counter reactions possible
            if (this._tryCounterReaction(defender, attacker, attackCard, isDiamond)) {
                snapshot.counterOccurred = true;
            }
            return snapshot;
        }

        // Hit succeeded - defender may react
        let defenseCard = null;

        // Check if defender wants to react and can afford it
        const willReact = (
            Math.random() < defender.reactionChance &&
            defender.canReact(isDiamond) &&
            !defender.deck.isEmpty()
        );

        if (willReact) {
            defender.payReactionCost(isDiamond);
            defenseCard = strategyDefender.selectDefenseCard(defender, attackCard);
            if (defenseCard) {
                defender.cardsPlayed += 1;
                snapshot.defenseCard = defenseCard.toString();
                snapshot.reactionOccurred = true;
            }
        }

        // Resolve card combat
        const [attackerDmg, defenderDmg, outcome] = resolveCardCombat(
            attackCard, defenseCard, false
        );

        // Apply damage
        if (attackerDmg > 0) {
            attacker.takeDamage(attackerDmg);
        }
        if (defenderDmg > 0) {
            defender.takeDamage(defenderDmg);
        }

        snapshot.damageDealt = defenderDmg;
        snapshot.protagonistDamage = this.protagonist.damageTaken.total;
        snapshot.antagonistDamage = this.antagonist.damageTaken.total;

        // Check for counter reaction (defender takes damage but counter-attacks)
        if (defenderDmg > 0 && !snapshot.counterOccurred) {
            if (this._tryCounterReaction(defender, attacker, attackCard, isDiamond)) {
                snapshot.counterOccurred = true;
            }
        }

        return snapshot;
    }

    /**
     * Attempt a counter reaction.
     * Counter: Defender takes damage but immediately attacks back.
     * Target cannot react to counter.
     *
     * @param {Combatant} defender
     * @param {Combatant} attacker
     * @param {Card} originalAttack
     * @param {boolean} isDiamond
     * @returns {boolean} Whether counter was attempted
     */
    _tryCounterReaction(defender, attacker, originalAttack, isDiamond) {
        // Check if defender wants to counter and can afford it
        if (Math.random() >= defender.counterChance) {
            return false;
        }

        if (!defender.canReact(isDiamond)) {
            return false;
        }

        if (defender.deck.isEmpty()) {
            return false;
        }

        // Pay counter cost
        defender.payReactionCost(isDiamond);
        defender.countersUsed += 1;

        // Select counter attack card
        const strategy = getStrategy(defender.strategy);
        const counterCard = strategy.selectAttackCard(defender);

        if (counterCard === null) {
            return false;
        }

        defender.cardsPlayed += 1;

        // Counter attack uses AC rules but target cannot react
        const [hitRoll, hitSuccess] = resolveHitRoll(defender, attacker, counterCard);

        if (!hitSuccess) {
            return true;  // Counter attempted but missed
        }

        // Resolve damage - no defense allowed, advantage irrelevant
        const [, damage] = resolveCardCombat(counterCard, null, true);

        if (damage > 0) {
            attacker.takeDamage(damage);
        }

        return true;
    }

    /**
     * Execute a single turn.
     * @returns {TurnSnapshot}
     */
    runTurn() {
        const [attacker, defender] = this._getCombatantsInOrder();

        // Clear temporary bonuses at start of turn
        attacker.clearTempBonuses();

        // Decide and execute action
        const action = this._decideAction(attacker);

        let snapshot;
        if (action === 'defend') {
            snapshot = this._executeDefend(attacker);
        } else {
            snapshot = this._executeAttack(attacker, defender);
        }

        this.turns.push(snapshot);
        this.currentTurn += 1;

        return snapshot;
    }

    /**
     * Run the complete simulation.
     * @returns {SimulationResult}
     */
    run() {
        // Calculate theoretical stats from original decks (before combat)
        const [protTheoMin, protTheoAvg, protTheoMax] = calculateDeckTheoreticalStats(
            this.protagonist.deck._originalCards
        );
        const [antagTheoMin, antagTheoAvg, antagTheoMax] = calculateDeckTheoreticalStats(
            this.antagonist.deck._originalCards
        );

        // Reset combatants
        this.protagonist.reset();
        this.antagonist.reset();
        this.currentTurn = 0;
        this.turns = [];

        // Run all turns
        for (let i = 0; i < this.numTurns; i++) {
            this.runTurn();
        }

        // Compile results
        const result = new SimulationResult();
        result.turns = this.turns;
        result.protagonistTotalDamage = this.protagonist.damageTaken.total;
        result.antagonistTotalDamage = this.antagonist.damageTaken.total;
        result.protagonistMinDamage = this.protagonist.damageTaken.minHit;
        result.protagonistMaxDamage = this.protagonist.damageTaken.maxHit;
        result.protagonistAvgDamage = this.protagonist.damageTaken.average;
        result.antagonistMinDamage = this.antagonist.damageTaken.minHit;
        result.antagonistMaxDamage = this.antagonist.damageTaken.maxHit;
        result.antagonistAvgDamage = this.antagonist.damageTaken.average;
        result.totalTurns = this.numTurns;

        // Theoretical stats (damage opponent's deck could deal if all hits land)
        result.protagonistTheoreticalMin = antagTheoMin;
        result.protagonistTheoreticalAvg = antagTheoAvg;
        result.protagonistTheoreticalMax = antagTheoMax;
        result.antagonistTheoreticalMin = protTheoMin;
        result.antagonistTheoreticalAvg = protTheoAvg;
        result.antagonistTheoreticalMax = protTheoMax;

        return result;
    }
}

/**
 * Run a single simulation with the given parameters.
 * @param {Object} params - Simulation parameters
 * @returns {SimulationResult}
 */
export function runSingleSimulation({
    protagonistDeck,
    antagonistDeck,
    protagonistAc = 10,
    antagonistAc = 10,
    protagonistHitBonus = 0,
    antagonistHitBonus = 0,
    protagonistReactionChance = 0.5,
    antagonistReactionChance = 0.5,
    protagonistCounterChance = 0.3,
    antagonistCounterChance = 0.3,
    protagonistResources = 10,
    antagonistResources = 10,
    protagonistDanger = 3,
    antagonistDanger = 3,
    protagonistStrategy = 'random',
    antagonistStrategy = 'random',
    numTurns = 10,
    protagonistStarts = true
}) {
    const protagonist = new Combatant({
        name: "Protagonist",
        deck: Deck.fromString(protagonistDeck),
        ac: protagonistAc,
        hitBonus: protagonistHitBonus,
        reactionChance: protagonistReactionChance,
        counterChance: protagonistCounterChance,
        baseResources: protagonistResources,
        danger: protagonistDanger,
        strategy: protagonistStrategy
    });

    const antagonist = new Combatant({
        name: "Antagonist",
        deck: Deck.fromString(antagonistDeck),
        ac: antagonistAc,
        hitBonus: antagonistHitBonus,
        reactionChance: antagonistReactionChance,
        counterChance: antagonistCounterChance,
        baseResources: antagonistResources,
        danger: antagonistDanger,
        strategy: antagonistStrategy
    });

    const sim = new CombatSimulation(
        protagonist,
        antagonist,
        numTurns,
        protagonistStarts
    );

    return sim.run();
}

/**
 * Run multiple simulations and aggregate results (synchronous version).
 * @param {Object} params - Simulation parameters including numRuns
 * @returns {BatchResult}
 */
export function runBatchSimulation({
    numRuns,
    protagonistDeck,
    antagonistDeck,
    protagonistAc = 10,
    antagonistAc = 10,
    protagonistHitBonus = 0,
    antagonistHitBonus = 0,
    protagonistReactionChance = 0.5,
    antagonistReactionChance = 0.5,
    protagonistCounterChance = 0.3,
    antagonistCounterChance = 0.3,
    protagonistResources = 10,
    antagonistResources = 10,
    protagonistDanger = 3,
    antagonistDanger = 3,
    protagonistStrategy = 'random',
    antagonistStrategy = 'random',
    numTurns = 10,
    protagonistStarts = true
}) {
    const allResults = [];

    for (let i = 0; i < numRuns; i++) {
        const result = runSingleSimulation({
            protagonistDeck,
            antagonistDeck,
            protagonistAc,
            antagonistAc,
            protagonistHitBonus,
            antagonistHitBonus,
            protagonistReactionChance,
            antagonistReactionChance,
            protagonistCounterChance,
            antagonistCounterChance,
            protagonistResources,
            antagonistResources,
            protagonistDanger,
            antagonistDanger,
            protagonistStrategy,
            antagonistStrategy,
            numTurns,
            protagonistStarts
        });
        allResults.push(result);
    }

    return aggregateBatchResults(allResults, numRuns, numTurns);
}

/**
 * Run multiple simulations with async processing to prevent UI freeze.
 * @param {Object} params - Simulation parameters including numRuns
 * @param {Function} progressCallback - Called with (completed, total) after each batch
 * @returns {Promise<BatchResult>}
 */
export async function runBatchSimulationAsync({
    numRuns,
    protagonistDeck,
    antagonistDeck,
    protagonistAc = 10,
    antagonistAc = 10,
    protagonistHitBonus = 0,
    antagonistHitBonus = 0,
    protagonistReactionChance = 0.5,
    antagonistReactionChance = 0.5,
    protagonistCounterChance = 0.3,
    antagonistCounterChance = 0.3,
    protagonistResources = 10,
    antagonistResources = 10,
    protagonistDanger = 3,
    antagonistDanger = 3,
    protagonistStrategy = 'random',
    antagonistStrategy = 'random',
    numTurns = 10,
    protagonistStarts = true
}, progressCallback = null) {
    const allResults = [];
    const batchSize = 10; // Process in batches to allow UI updates

    for (let i = 0; i < numRuns; i++) {
        const result = runSingleSimulation({
            protagonistDeck,
            antagonistDeck,
            protagonistAc,
            antagonistAc,
            protagonistHitBonus,
            antagonistHitBonus,
            protagonistReactionChance,
            antagonistReactionChance,
            protagonistCounterChance,
            antagonistCounterChance,
            protagonistResources,
            antagonistResources,
            protagonistDanger,
            antagonistDanger,
            protagonistStrategy,
            antagonistStrategy,
            numTurns,
            protagonistStarts
        });
        allResults.push(result);

        // Yield to UI every batchSize iterations
        if ((i + 1) % batchSize === 0 || i === numRuns - 1) {
            if (progressCallback) {
                progressCallback(i + 1, numRuns);
            }
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    return aggregateBatchResults(allResults, numRuns, numTurns);
}

/**
 * Aggregate individual simulation results into batch statistics.
 * @param {SimulationResult[]} allResults
 * @param {number} numRuns
 * @param {number} numTurns
 * @returns {BatchResult}
 */
function aggregateBatchResults(allResults, numRuns, numTurns) {
    const batch = new BatchResult(numRuns);

    // Collect all damage totals
    const protDamages = allResults.map(r => r.protagonistTotalDamage);
    const antagDamages = allResults.map(r => r.antagonistTotalDamage);

    batch.protagonistDamageMin = protDamages.length ? Math.min(...protDamages) : 0;
    batch.protagonistDamageMax = protDamages.length ? Math.max(...protDamages) : 0;
    batch.protagonistDamageAvg = protDamages.length ? protDamages.reduce((a, b) => a + b, 0) / protDamages.length : 0;

    batch.antagonistDamageMin = antagDamages.length ? Math.min(...antagDamages) : 0;
    batch.antagonistDamageMax = antagDamages.length ? Math.max(...antagDamages) : 0;
    batch.antagonistDamageAvg = antagDamages.length ? antagDamages.reduce((a, b) => a + b, 0) / antagDamages.length : 0;

    batch.allProtagonistDamages = protDamages;
    batch.allAntagonistDamages = antagDamages;

    // Theoretical stats (same for all runs since decks are identical)
    if (allResults.length > 0) {
        const first = allResults[0];
        batch.protagonistTheoreticalMin = first.protagonistTheoreticalMin;
        batch.protagonistTheoreticalAvg = first.protagonistTheoreticalAvg;
        batch.protagonistTheoreticalMax = first.protagonistTheoreticalMax;
        batch.antagonistTheoreticalMin = first.antagonistTheoreticalMin;
        batch.antagonistTheoreticalAvg = first.antagonistTheoreticalAvg;
        batch.antagonistTheoreticalMax = first.antagonistTheoreticalMax;
    }

    // Per-turn statistics
    for (let turnIdx = 0; turnIdx < numTurns; turnIdx++) {
        const protResources = [];
        const antagResources = [];
        const protDamage = [];
        const antagDamage = [];
        const protCards = [];
        const antagCards = [];
        const protReactions = [];
        const antagReactions = [];

        for (const result of allResults) {
            if (turnIdx < result.turns.length) {
                const snap = result.turns[turnIdx];
                protResources.push(snap.protagonistResources);
                antagResources.push(snap.antagonistResources);
                protDamage.push(snap.protagonistDamage);
                antagDamage.push(snap.antagonistDamage);
                protCards.push(snap.protagonistCardsRemaining);
                antagCards.push(snap.antagonistCardsRemaining);
                protReactions.push(snap.protagonistReactions);
                antagReactions.push(snap.antagonistReactions);
            }
        }

        if (protResources.length > 0) {
            batch.protagonistResourcesPerTurn.push(avg(protResources));
            batch.antagonistResourcesPerTurn.push(avg(antagResources));
            batch.protagonistDamagePerTurn.push(avg(protDamage));
            batch.antagonistDamagePerTurn.push(avg(antagDamage));
            batch.protagonistCardsPerTurn.push(avg(protCards));
            batch.antagonistCardsPerTurn.push(avg(antagCards));
            batch.protagonistReactionsPerTurn.push(avg(protReactions));
            batch.antagonistReactionsPerTurn.push(avg(antagReactions));
        }
    }

    return batch;
}

/**
 * Calculate average of an array.
 * @param {number[]} arr
 * @returns {number}
 */
function avg(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

