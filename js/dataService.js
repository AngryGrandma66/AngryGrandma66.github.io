// js/dataService.js
import {shuffleArray} from './utils.js';

const BUILTIN_FETCH_ERROR = new Error('Quiz data not found');
const OFFLINE_NO_CACHE_ERROR = new Error('Offline: no cached quiz data');
const CUSTOM_STORAGE_KEY = 'customQuizzes';

/**
 * Retrieves the entire custom‐quiz map from localStorage.
 */
function _getCustomMap() {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

/**
 * Persists the custom‐quiz map back to localStorage.
 */
function _setCustomMap(mapObj) {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(mapObj));
}

/**
 * Returns an array of all custom quizzes as { id, name }.
 */
export function getAllCustomQuizzes() {
    const map = _getCustomMap();
    return Object.keys(map).map(id => ({
        id,
        name: map[id].name
    }));
}

/**
 * Returns the raw quiz object for a given custom ID, or null if none.
 */
export function getCustomQuiz(id) {
    const map = _getCustomMap();
    return map[id] || null;
}

/**
 * Upserts a custom quiz under the given ID.
 * rawQuiz must be: { name: string, questions: [ { text, right_answer, other_answers: [] } ] }.
 */
export function saveCustomQuiz(id, rawQuiz) {
    const map = _getCustomMap();
    map[id] = rawQuiz;
    _setCustomMap(map);
}

/**
 * Deletes a custom quiz by ID.
 */
export function deleteCustomQuiz(id) {
    const map = _getCustomMap();
    if (map[id]) {
        delete map[id];
        _setCustomMap(map);
    }
}

/**
 * Loads quiz data for either a built‐in or a custom quiz.
 */
export function loadQuizData(topic) {
    // 1) Check custom quizzes first (still use localStorage for user-created)
    const customMap = _getCustomMap();
    if (customMap[topic]) {
        return Promise.resolve(_transform(customMap[topic]));
    }

    // 2) Otherwise, fetch the built-in JSON directly. Service Worker will have it cached.
    return fetch(`data/${topic}.json`)
        .then(res => {
            if (!res.ok) throw BUILTIN_FETCH_ERROR;
            return res.json();
        })
        .then(rawData => _transform(rawData));
}

/**
 * Transforms raw quiz format into { title, questions: [ { text, choices, answer } ] }.
 */
function _transform(raw) {
    const data = {title: raw.name, questions: []};
    raw.questions.forEach(q => {
        if (q.choices) {
            // Already‐transformed format from a saved quiz
            const newQ = {
                text: q.text,
                choices: q.choices,
                answer: q.answer
            };
            if (q.media) {
                newQ.media = q.media;
            }
            data.questions.push(newQ);

        } else {
            // Incoming built-in or new quiz format: { text, right_answer, other_answers, maybe media }
            const allChoices = [...q.other_answers, q.right_answer];
            shuffleArray(allChoices);
            const newQ = {
                text: q.text,
                choices: allChoices,
                answer: allChoices.indexOf(q.right_answer)
            };
            if (q.media) {
                newQ.media = q.media;
            }
            data.questions.push(newQ);
        }
    });
    return data;
}