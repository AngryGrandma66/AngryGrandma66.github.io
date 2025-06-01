
const STORAGE_KEY = 'quizHighScores';

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
        } else if (newPct === oldPct && newEntry.timestamp < existing.timestamp) {

            all[idx] = newEntry;
        }

    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}


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

export function getRecentScores(limit = 10) {
    const scores = getScores();
    scores.sort((a, b) => b.timestamp - a.timestamp);
    return scores.slice(0, limit);
}
