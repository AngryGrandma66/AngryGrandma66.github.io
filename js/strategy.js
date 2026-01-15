/**
 * AI strategies for card selection.
 * Ported from Python strategy.py
 */

/**
 * Base strategy class with default implementations.
 */
class Strategy {
    /**
     * Select a card to use for attacking.
     * @param {Combatant} combatant - The attacking combatant
     * @returns {Card|null}
     */
    static selectAttackCard(combatant) {
        throw new Error("Not implemented");
    }

    /**
     * Select a card to use for defending.
     * @param {Combatant} combatant - The defending combatant
     * @param {Card} attackCard - The attack card to defend against
     * @returns {Card|null}
     */
    static selectDefenseCard(combatant, attackCard) {
        throw new Error("Not implemented");
    }

    /**
     * Decide whether to take defend action instead of attacking.
     * @param {Combatant} combatant - The combatant deciding
     * @returns {boolean}
     */
    static shouldDefendAction(combatant) {
        throw new Error("Not implemented");
    }
}

/**
 * Random card selection - the default strategy.
 */
export class RandomStrategy extends Strategy {
    /**
     * Randomly select a card to attack with.
     */
    static selectAttackCard(combatant) {
        const cards = combatant.deck.peek();
        if (cards.length === 0) {
            return null;
        }
        // Draw from deck (removes the card)
        return combatant.deck.draw();
    }

    /**
     * Randomly decide whether to defend, and with which card.
     */
    static selectDefenseCard(combatant, attackCard) {
        const cards = combatant.deck.peek();
        if (cards.length === 0) {
            return null;
        }
        // 70% chance to play a defense card if available
        if (Math.random() < 0.7) {
            return combatant.deck.draw();
        }
        return null;
    }

    /**
     * 20% chance to take defend action.
     */
    static shouldDefendAction(combatant) {
        return Math.random() < 0.2;
    }
}

/**
 * Save high-value cards for later.
 */
export class ConservativeStrategy extends Strategy {
    /**
     * Select lowest value card for attack.
     */
    static selectAttackCard(combatant) {
        const cards = combatant.deck.peek();
        if (cards.length === 0) {
            return null;
        }
        // Find lowest value card
        let minCard = cards[0];
        for (const card of cards) {
            if (card.value < minCard.value) {
                minCard = card;
            }
        }
        combatant.deck.removeCard(minCard);
        return minCard;
    }

    /**
     * Try to match attack value with lowest sufficient card.
     */
    static selectDefenseCard(combatant, attackCard) {
        const cards = combatant.deck.peek();
        if (cards.length === 0) {
            return null;
        }

        // Find cards that can match or beat the attack
        const sufficient = cards.filter(c => c.value >= attackCard.value);

        let chosen;
        if (sufficient.length > 0) {
            // Use the lowest sufficient card
            chosen = sufficient.reduce((min, c) => c.value < min.value ? c : min);
        } else {
            // Use lowest card as sacrifice or don't defend
            if (Math.random() < 0.3) {
                chosen = cards.reduce((min, c) => c.value < min.value ? c : min);
            } else {
                return null;
            }
        }

        combatant.deck.removeCard(chosen);
        return chosen;
    }

    /**
     * More likely to defend when low on cards.
     */
    static shouldDefendAction(combatant) {
        const remainingRatio = combatant.deck.remaining() / Math.max(1, combatant.deck.originalSize());
        // Higher chance to defend when cards are scarce
        return Math.random() < (0.4 - remainingRatio * 0.3);
    }
}

/**
 * Use high-value cards first for maximum damage.
 */
export class AggressiveStrategy extends Strategy {
    /**
     * Select highest value card for attack.
     */
    static selectAttackCard(combatant) {
        const cards = combatant.deck.peek();
        if (cards.length === 0) {
            return null;
        }
        // Find highest value card
        let maxCard = cards[0];
        for (const card of cards) {
            if (card.value > maxCard.value) {
                maxCard = card;
            }
        }
        combatant.deck.removeCard(maxCard);
        return maxCard;
    }

    /**
     * Aggressive defense - try to win the exchange.
     */
    static selectDefenseCard(combatant, attackCard) {
        const cards = combatant.deck.peek();
        if (cards.length === 0) {
            return null;
        }

        // Find cards that beat the attack
        const winning = cards.filter(c => c.value > attackCard.value);

        if (winning.length > 0) {
            // Use the lowest winning card to save higher ones
            const chosen = winning.reduce((min, c) => c.value < min.value ? c : min);
            combatant.deck.removeCard(chosen);
            return chosen;
        }

        // If can't win, don't waste a card (50% chance)
        if (Math.random() < 0.5) {
            return null;
        }

        // Otherwise use lowest card
        const chosen = cards.reduce((min, c) => c.value < min.value ? c : min);
        combatant.deck.removeCard(chosen);
        return chosen;
    }

    /**
     * Rarely defend - prefer attacking.
     */
    static shouldDefendAction(combatant) {
        return Math.random() < 0.1;
    }
}

// Strategy registry
const STRATEGIES = {
    'random': RandomStrategy,
    'conservative': ConservativeStrategy,
    'aggressive': AggressiveStrategy
};

/**
 * Get strategy class by name.
 * @param {string} name - Strategy name
 * @returns {typeof Strategy}
 */
export function getStrategy(name) {
    return STRATEGIES[name.toLowerCase()] || RandomStrategy;
}

