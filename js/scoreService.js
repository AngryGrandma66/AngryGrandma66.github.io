
const STORAGE_KEY = 'quizHighScores';

/**
 * Retrieve the high‐score array from localStorage (STORAGE_KEY).
 * If missing or invalid JSON, return an empty array.
 * @returns {Array<{name:string,quiz:string,correct:number,total:number,timestamp:number}>}
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
 * Add or update a player’s score entry:
 *   – If there’s no existing entry with same name+quiz, push newEntry.
 *   – If there is, compare new percentage (correct/total) vs old:
 *       → If newPct > oldPct, overwrite. If equal pct but new timestamp < old timestamp, overwrite.
 *   – Finally, save updated array back to localStorage.
 * @param {{name:string,quiz:string,correct:number,total:number,timestamp:number}} newEntry
 */
export function addScore(newEntry) {
    const all = getScores();

    function pct(entry) {
        return entry.total > 0 ? entry.correct / entry.total : 0;
    }


    const idx = all.findIndex(e => e.name === newEntry.name && e.quiz === newEntry.quiz);

    if (idx === -1) {

        all.push(newEntry);
    } else {
        const existing = all[idx];
        const newPct = pct(newEntry);
        const oldPct = pct(existing);

        if (newPct > oldPct) {

            all[idx] = newEntry;
        }

    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/**
 * Return the top “limit” entries sorted by:
 *   1) descending correct count
 *   2) ascending timestamp (earlier run wins ties)
 *
 * @param {number} [limit=10]
 * @returns {Array}
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
