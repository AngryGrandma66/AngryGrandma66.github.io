// js/scoreService.js

const STORAGE_KEY = 'quizHighScores';

/**
 * Returns an array of all stored score entries.
 * Each entry has: { name: string, quiz: string, correct: number, total: number, timestamp: number }
 */
export function getScores() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

/**
 * Adds or updates a score entry in localStorage. If an entry with the same
 * (name, quiz) already exists, we compare percentages (correct/total) and keep
 * whichever is higher; if percentages tie, we keep the earlier timestamp.
 *
 * @param {{ name: string, quiz: string, correct: number, total: number, timestamp: number }} newEntry
 */
export function addScore(newEntry) {
    const all = getScores();

    // Percentage helper
    function pct(entry) {
        return entry.total > 0 ? entry.correct / entry.total : 0;
    }

    // Look for an existing entry with same name & quiz
    const idx = all.findIndex(e => e.name === newEntry.name && e.quiz === newEntry.quiz);

    if (idx === -1) {
        // No existing (name,quiz) pair → just push
        all.push(newEntry);
    } else {
        const existing = all[idx];
        const newPct = pct(newEntry);
        const oldPct = pct(existing);

        if (newPct > oldPct) {
            // New attempt is strictly better → replace
            all[idx] = newEntry;
        } else if (newPct === oldPct && newEntry.timestamp < existing.timestamp) {
            // Tie in percentage but new attempt is earlier (unlikely if timestamp=now) → replace
            all[idx] = newEntry;
        }
        // Otherwise, existing is better or equal and earlier → do nothing
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/**
 * Returns the top N entries (across all quizzes+players),
 * sorted by highest `correct` first, then oldest timestamp first.
 *
 * @param {number} limit
 * @returns {Array<{ name: string, quiz: string, correct: number, total: number, timestamp: number }>}
 */
export function getTopScores(limit = 10) {
    const scores = getScores();
    scores.sort((a, b) => {
        if (b.correct !== a.correct) {
            return b.correct - a.correct;
        }
        return a.timestamp - b.timestamp;
    });
    return scores.slice(0, limit);
}

/**
 * Returns the N most recent raw entries (unsorted by correctness).
 * Sorted by timestamp descending.
 *
 * @param {number} limit
 */
export function getRecentScores(limit = 10) {
    const scores = getScores();
    scores.sort((a, b) => b.timestamp - a.timestamp);
    return scores.slice(0, limit);
}
