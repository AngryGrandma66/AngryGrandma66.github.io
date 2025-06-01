
/**
 * Fisher–Yates shuffle: randomize array in place.
 * @param {any[]} arr – the array to shuffle
 */
export function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}