/**
 * Data models for the combat simulation.
 * Ported from Python models.py
 */

// Card suits with their combat effects
export const Suit = {
    SPADES: 's',    // Normal attack
    DIAMONDS: 'd',  // Normal attack; increases reaction costs
    CROSSES: 'c',   // +2 hit chance when attacking
    HEARTS: 'h'     // +2 flat damage when dealing damage
};

// Advantage relationships: key beats value
export const ADVANTAGE_MAP = {
    [Suit.SPADES]: Suit.CROSSES,
    [Suit.CROSSES]: Suit.DIAMONDS,
    [Suit.DIAMONDS]: Suit.HEARTS,
    [Suit.HEARTS]: Suit.SPADES
};

// Suit names for display
export const SUIT_NAMES = {
    [Suit.SPADES]: 'Spades',
    [Suit.DIAMONDS]: 'Diamonds',
    [Suit.CROSSES]: 'Crosses',
    [Suit.HEARTS]: 'Hearts'
};

/**
 * A single card with suit and value.
 */
export class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
    }

    toString() {
        return `${this.value}${this.suit}`;
    }

    /**
     * Parse a card from notation like '2d', '10h', '3s'.
     * @param {string} s - Card notation string
     * @returns {Card}
     * @throws {Error} If notation is invalid
     */
    static fromString(s) {
        s = s.trim().toLowerCase();
        const match = s.match(/^(\d+)([sdch])$/);
        if (!match) {
            throw new Error(`Invalid card notation: '${s}'. Expected format: <number><suit> (e.g., '2d', '10h')`);
        }
        const value = parseInt(match[1], 10);
        const suitChar = match[2];
        const suitMap = {
            's': Suit.SPADES,
            'd': Suit.DIAMONDS,
            'c': Suit.CROSSES,
            'h': Suit.HEARTS
        };
        return new Card(suitMap[suitChar], value);
    }

    /**
     * Create a deep copy of this card.
     * @returns {Card}
     */
    clone() {
        return new Card(this.suit, this.value);
    }
}

/**
 * A deck of cards that can be drawn from.
 */
export class Deck {
    constructor(cards = []) {
        this.cards = cards;
        this._originalCards = cards.map(c => c.clone());
    }

    /**
     * Parse a deck from space-separated card notation.
     * @param {string} notation - Space-separated cards (e.g., '2d 2d 3h 3c 5s 10h')
     * @returns {Deck}
     */
    static fromString(notation) {
        if (!notation || !notation.trim()) {
            return new Deck([]);
        }
        const cardStrings = notation.trim().split(/\s+/);
        const cards = cardStrings.map(s => Card.fromString(s));
        return new Deck(cards);
    }

    /**
     * Validate deck notation without creating a deck.
     * @param {string} notation - Space-separated cards
     * @returns {{valid: boolean, error: string|null, invalidCards: string[]}}
     */
    static validate(notation) {
        if (!notation || !notation.trim()) {
            return { valid: true, error: null, invalidCards: [] };
        }
        const cardStrings = notation.trim().split(/\s+/);
        const invalidCards = [];

        for (const s of cardStrings) {
            const match = s.trim().toLowerCase().match(/^(\d+)([sdch])$/);
            if (!match) {
                invalidCards.push(s);
            }
        }

        if (invalidCards.length > 0) {
            return {
                valid: false,
                error: `Invalid card notation: ${invalidCards.join(', ')}`,
                invalidCards
            };
        }

        return { valid: true, error: null, invalidCards: [] };
    }

    /**
     * Shuffle the deck in place using Fisher-Yates algorithm.
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    /**
     * Draw a card from the deck.
     * @returns {Card|null} The drawn card or null if empty
     */
    draw() {
        if (this.cards.length === 0) {
            return null;
        }
        return this.cards.pop();
    }

    /**
     * View all remaining cards without removing them.
     * @returns {Card[]}
     */
    peek() {
        return [...this.cards];
    }

    /**
     * Number of cards remaining.
     * @returns {number}
     */
    remaining() {
        return this.cards.length;
    }

    /**
     * Check if deck is exhausted.
     * @returns {boolean}
     */
    isEmpty() {
        return this.cards.length === 0;
    }

    /**
     * Reset deck to original state.
     */
    reset() {
        this.cards = this._originalCards.map(c => c.clone());
    }

    /**
     * Get original deck size.
     * @returns {number}
     */
    originalSize() {
        return this._originalCards.length;
    }

    /**
     * Remove a specific card from the deck.
     * @param {Card} card - Card to remove
     * @returns {boolean} True if card was found and removed
     */
    removeCard(card) {
        const index = this.cards.findIndex(c => c.suit === card.suit && c.value === card.value);
        if (index !== -1) {
            this.cards.splice(index, 1);
            return true;
        }
        return false;
    }
}

/**
 * Track damage statistics.
 */
export class DamageStats {
    constructor() {
        this.total = 0;
        this.minHit = null;
        this.maxHit = null;
        this.hitCount = 0;
    }

    /**
     * Record a damage instance.
     * @param {number} damage - Damage amount
     */
    record(damage) {
        if (damage > 0) {
            this.total += damage;
            this.hitCount += 1;
            if (this.minHit === null || damage < this.minHit) {
                this.minHit = damage;
            }
            if (this.maxHit === null || damage > this.maxHit) {
                this.maxHit = damage;
            }
        }
    }

    /**
     * Calculate average damage per hit.
     * @returns {number}
     */
    get average() {
        if (this.hitCount === 0) {
            return 0.0;
        }
        return this.total / this.hitCount;
    }
}

/**
 * A combat participant (Protagonist or Antagonist).
 */
export class Combatant {
    constructor({
        name,
        deck,
        ac = 10,
        hitBonus = 0,
        reactionChance = 0.5,
        counterChance = 0.3,
        baseResources = 10,
        danger = 3,
        strategy = 'random'
    }) {
        this.name = name;
        this.deck = deck;
        this.ac = ac;
        this.hitBonus = hitBonus;
        this.reactionChance = reactionChance;
        this.counterChance = counterChance;
        this.baseResources = baseResources;
        this.danger = danger;
        this.strategy = strategy;

        // Runtime state
        this.currentResources = baseResources;
        this.damageTaken = new DamageStats();
        this.tempAcBonus = 0;
        this.cardsPlayed = 0;
        this.reactionsUsed = 0;
        this.countersUsed = 0;
    }

    /**
     * Reset combatant to initial state.
     */
    reset() {
        this.deck.reset();
        this.deck.shuffle();
        this.currentResources = this.baseResources;
        this.damageTaken = new DamageStats();
        this.tempAcBonus = 0;
        this.cardsPlayed = 0;
        this.reactionsUsed = 0;
        this.countersUsed = 0;
    }

    /**
     * Get AC including temporary bonuses.
     * @returns {number}
     */
    effectiveAc() {
        return this.ac + this.tempAcBonus;
    }

    /**
     * Check if combatant can afford a reaction.
     * @param {boolean} isDiamondAttack - Whether the attack is with diamonds
     * @returns {boolean}
     */
    canReact(isDiamondAttack = false) {
        const cost = this.danger + (isDiamondAttack ? 2 : 0);
        return this.currentResources >= cost;
    }

    /**
     * Pay the cost for a reaction.
     * @param {boolean} isDiamondAttack - Whether the attack is with diamonds
     */
    payReactionCost(isDiamondAttack = false) {
        const cost = this.danger + (isDiamondAttack ? 2 : 0);
        this.currentResources -= cost;
        this.reactionsUsed += 1;
    }

    /**
     * Record damage taken.
     * @param {number} amount - Damage amount
     */
    takeDamage(amount) {
        this.damageTaken.record(amount);
    }

    /**
     * Clear temporary bonuses at start of turn.
     */
    clearTempBonuses() {
        this.tempAcBonus = 0;
    }

    /**
     * Apply defend action bonus.
     */
    applyDefend() {
        this.tempAcBonus = 3;
    }
}

/**
 * Snapshot of game state at end of a turn.
 */
export class TurnSnapshot {
    constructor({
        turnNumber,
        protagonistDamage,
        antagonistDamage,
        protagonistResources,
        antagonistResources,
        protagonistCardsRemaining,
        antagonistCardsRemaining,
        protagonistReactions,
        antagonistReactions,
        actionTaken,
        attacker,
        hitRoll = null,
        hitSuccess = null,
        attackCard = null,
        defenseCard = null,
        damageDealt = 0,
        reactionOccurred = false,
        counterOccurred = false
    }) {
        this.turnNumber = turnNumber;
        this.protagonistDamage = protagonistDamage;
        this.antagonistDamage = antagonistDamage;
        this.protagonistResources = protagonistResources;
        this.antagonistResources = antagonistResources;
        this.protagonistCardsRemaining = protagonistCardsRemaining;
        this.antagonistCardsRemaining = antagonistCardsRemaining;
        this.protagonistReactions = protagonistReactions;
        this.antagonistReactions = antagonistReactions;
        this.actionTaken = actionTaken;
        this.attacker = attacker;
        this.hitRoll = hitRoll;
        this.hitSuccess = hitSuccess;
        this.attackCard = attackCard;
        this.defenseCard = defenseCard;
        this.damageDealt = damageDealt;
        this.reactionOccurred = reactionOccurred;
        this.counterOccurred = counterOccurred;
    }
}

/**
 * Result of a single simulation run.
 */
export class SimulationResult {
    constructor() {
        this.turns = [];
        this.protagonistTotalDamage = 0;
        this.antagonistTotalDamage = 0;
        this.protagonistMinDamage = null;
        this.protagonistMaxDamage = null;
        this.protagonistAvgDamage = 0.0;
        this.antagonistMinDamage = null;
        this.antagonistMaxDamage = null;
        this.antagonistAvgDamage = 0.0;
        this.totalTurns = 0;

        // Theoretical stats (damage if all hits land, no defense)
        this.protagonistTheoreticalMin = 0;
        this.protagonistTheoreticalAvg = 0.0;
        this.protagonistTheoreticalMax = 0;
        this.antagonistTheoreticalMin = 0;
        this.antagonistTheoreticalAvg = 0.0;
        this.antagonistTheoreticalMax = 0;
    }
}

/**
 * Aggregated results from multiple simulation runs.
 */
export class BatchResult {
    constructor(numRuns) {
        this.numRuns = numRuns;

        // Damage statistics across all runs
        this.protagonistDamageMin = 0;
        this.protagonistDamageAvg = 0;
        this.protagonistDamageMax = 0;

        this.antagonistDamageMin = 0;
        this.antagonistDamageAvg = 0;
        this.antagonistDamageMax = 0;

        // Theoretical stats
        this.protagonistTheoreticalMin = 0;
        this.protagonistTheoreticalAvg = 0.0;
        this.protagonistTheoreticalMax = 0;
        this.antagonistTheoreticalMin = 0;
        this.antagonistTheoreticalAvg = 0.0;
        this.antagonistTheoreticalMax = 0;

        // Per-turn statistics
        this.protagonistResourcesPerTurn = [];
        this.antagonistResourcesPerTurn = [];
        this.protagonistDamagePerTurn = [];
        this.antagonistDamagePerTurn = [];
        this.protagonistCardsPerTurn = [];
        this.antagonistCardsPerTurn = [];
        this.protagonistReactionsPerTurn = [];
        this.antagonistReactionsPerTurn = [];

        // Per-run totals for distribution analysis
        this.allProtagonistDamages = [];
        this.allAntagonistDamages = [];
    }
}

