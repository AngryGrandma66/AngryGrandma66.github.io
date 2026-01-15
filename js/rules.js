/**
 * Combat rules and mechanics.
 * Ported from Python rules.py
 */

import { Suit, ADVANTAGE_MAP } from './models.js';

/**
 * Roll a d20.
 * @returns {number} Random integer from 1 to 20
 */
export function rollD20() {
    return Math.floor(Math.random() * 20) + 1;
}

/**
 * Roll multiple d4s and sum.
 * @param {number} count - Number of d4s to roll
 * @returns {number} Sum of all dice
 */
export function rollD4(count = 1) {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * 4) + 1;
    }
    return total;
}

/**
 * Get hit bonus from card suit.
 * @param {Card} card - The card being used
 * @returns {number} Hit bonus (2 for Crosses, 0 otherwise)
 */
export function getHitBonus(card) {
    if (card.suit === Suit.CROSSES) {
        return 2;
    }
    return 0;
}

/**
 * Get flat damage bonus from card suit.
 * @param {Card} card - The card being used
 * @returns {number} Damage bonus (2 for Hearts, 0 otherwise)
 */
export function getDamageBonus(card) {
    if (card.suit === Suit.HEARTS) {
        return 2;
    }
    return 0;
}

/**
 * Check if attack card is Diamonds (increases reaction cost).
 * @param {Card} card - The attack card
 * @returns {boolean}
 */
export function isDiamondAttack(card) {
    return card.suit === Suit.DIAMONDS;
}

/**
 * Check advantage relationship between cards.
 * Advantage is only relevant when attack value equals defense value.
 *
 * @param {Card} attackerCard - The attacker's card
 * @param {Card} defenderCard - The defender's card
 * @returns {[boolean, boolean]} [attackerHasAdvantage, defenderHasAdvantage]
 */
export function checkAdvantage(attackerCard, defenderCard) {
    const attackerSuit = attackerCard.suit;
    const defenderSuit = defenderCard.suit;

    // Check if attacker's suit beats defender's suit
    const attackerAdvantage = ADVANTAGE_MAP[attackerSuit] === defenderSuit;
    const defenderAdvantage = ADVANTAGE_MAP[defenderSuit] === attackerSuit;

    return [attackerAdvantage, defenderAdvantage];
}

/**
 * Resolve AC-layer hit roll.
 *
 * @param {Combatant} attacker - The attacking combatant
 * @param {Combatant} defender - The defending combatant
 * @param {Card} attackCard - The card being used to attack
 * @returns {[number, boolean]} [rollResult, hitSuccess]
 */
export function resolveHitRoll(attacker, defender, attackCard) {
    const roll = rollD20();
    const hitBonus = attacker.hitBonus + getHitBonus(attackCard);
    const total = roll + hitBonus;

    const targetAc = defender.effectiveAc();

    // Hit succeeds if roll > AC (not >=)
    const hitSuccess = total > targetAc;

    return [total, hitSuccess];
}

/**
 * Resolve card-layer defense.
 *
 * @param {Card} attackCard - The attacker's card
 * @param {Card|null} defenseCard - The defender's card (null = no defense)
 * @param {boolean} isCounter - If true, advantage is ignored
 * @returns {[number, number, string]} [attackerDamage, defenderDamage, outcomeDescription]
 */
export function resolveCardCombat(attackCard, defenseCard, isCounter = false) {
    const attackValue = attackCard.value;
    const defenseValue = defenseCard ? defenseCard.value : 0;

    const delta = Math.abs(attackValue - defenseValue);
    const damageBonus = getDamageBonus(attackCard);

    if (attackValue > defenseValue) {
        // Defender takes damage
        const damage = delta > 0 ? rollD4(delta) + damageBonus : damageBonus;
        return [0, damage, `Attack wins by ${delta}: defender takes ${damage} damage`];
    } else if (defenseValue > attackValue) {
        // Attacker takes damage (no bonus for defender)
        const damage = delta > 0 ? rollD4(delta) : 0;
        return [damage, 0, `Defense wins by ${delta}: attacker takes ${damage} damage`];
    } else {
        // Tied - check advantage (unless counter-attack)
        if (isCounter) {
            return [0, 0, "Counter attack tied: no damage"];
        }

        if (defenseCard === null) {
            // No defense card means defender takes 1d4 + bonus
            const damage = rollD4(1) + damageBonus;
            return [0, damage, `No defense: defender takes ${damage} damage`];
        }

        const [attackerAdv, defenderAdv] = checkAdvantage(attackCard, defenseCard);

        if (attackerAdv) {
            const damage = rollD4(1) + damageBonus;
            return [0, damage, `Attacker advantage (${attackCard.suit} > ${defenseCard.suit}): defender takes ${damage}`];
        } else if (defenderAdv) {
            const damage = rollD4(1);
            return [damage, 0, `Defender advantage (${defenseCard.suit} > ${attackCard.suit}): attacker takes ${damage}`];
        } else {
            return [0, 0, "Tied with no advantage: fully blocked"];
        }
    }
}

/**
 * Calculate the resource cost for a reaction.
 * @param {number} danger - Base danger level
 * @param {boolean} isDiamond - Whether attack is with diamonds
 * @returns {number}
 */
export function calculateReactionCost(danger, isDiamond) {
    let baseCost = danger;
    if (isDiamond) {
        baseCost += 2;
    }
    return baseCost;
}

/**
 * Calculate theoretical min/avg/max damage from a card assuming hit lands with no defense.
 * Damage formula: card_value d4 + (2 if hearts else 0)
 *
 * @param {number} cardValue - The value on the card (number of d4s rolled)
 * @param {boolean} isHearts - Whether the card is Hearts (+2 flat damage)
 * @returns {[number, number, number]} [minDamage, avgDamage, maxDamage]
 */
export function calculateTheoreticalDamage(cardValue, isHearts = false) {
    const bonus = isHearts ? 2 : 0;

    if (cardValue <= 0) {
        return [bonus, bonus, bonus];
    }

    // d4 stats: min=1, max=4, avg=2.5
    const minDamage = cardValue * 1 + bonus;  // All 1s
    const maxDamage = cardValue * 4 + bonus;  // All 4s
    const avgDamage = cardValue * 2.5 + bonus;  // Average of d4 is 2.5

    return [minDamage, avgDamage, maxDamage];
}

/**
 * Calculate theoretical total damage stats for an entire deck.
 * This represents the damage potential if every card was used to attack
 * and every attack hit with no defense.
 *
 * @param {Card[]} cards - List of Card objects
 * @returns {[number, number, number]} [totalMin, totalAvg, totalMax]
 */
export function calculateDeckTheoreticalStats(cards) {
    let totalMin = 0;
    let totalAvg = 0.0;
    let totalMax = 0;

    for (const card of cards) {
        const isHearts = card.suit === Suit.HEARTS;
        const [minD, avgD, maxD] = calculateTheoreticalDamage(card.value, isHearts);
        totalMin += minD;
        totalAvg += avgD;
        totalMax += maxD;
    }

    return [totalMin, totalAvg, totalMax];
}

