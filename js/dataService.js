
import {shuffleArray} from './utils.js';

const BUILTIN_FETCH_ERROR = new Error('Quiz data not found');
const CUSTOM_STORAGE_KEY = 'customQuizzes';
/**
 * Retrieve the JSON‐stringified customQuizzes map from localStorage,
 * parse it into an object, and return that object.
 * If missing or parse fails, return {}.
 * @returns {Object<string, Object>} (quizId → rawQuizObject)
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
 * Stringify the given mapObj and store it under the CUSTOM_STORAGE_KEY in localStorage.
 * @param {Object<string, Object>} mapObj – the custom quizzes map to persist
 */
function _setCustomMap(mapObj) {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(mapObj));
}

/**
 * Return an array of all custom quizzes stored in localStorage,
 * each as { id, name } (pulled from rawQuiz.name).
 * @returns {{id:string,name:string}[]}
 */
export function getAllCustomQuizzes() {
    const map = _getCustomMap();
    return Object.keys(map).map(id => ({
        id,
        name: map[id].name
    }));
}
/**
 * Return the raw quiz object (name + questions array + media) for a given quizId,
 * or null if none exists.
 * @param {string} id – custom quiz ID
 * @returns {Object|null}
 */
export function getCustomQuiz(id) {
    const map = _getCustomMap();
    return map[id] || null;
}
/**
 * Save or overwrite a custom quiz under key “id” with the provided rawQuiz object
 * in localStorage. rawQuiz should have shape { name:string, questions:[] }.
 * @param {string} id – unique quiz identifier
 * @param {Object} rawQuiz – the quiz data to persist
 */
export function saveCustomQuiz(id, rawQuiz) {
    const map = _getCustomMap();
    map[id] = rawQuiz;
    _setCustomMap(map);
}

/**
 * Remove the custom quiz with given ID from localStorage (if it exists).
 * @param {string} id – custom quiz ID to delete
 */
export function deleteCustomQuiz(id) {
    const map = _getCustomMap();
    if (map[id]) {
        delete map[id];
        _setCustomMap(map);
    }
}
/**
 * Load quiz data for a given topic (either a builtin JSON file under /data or a custom quiz).
 *   – First check if topic exists in customMap; if so, return a resolved Promise of transform(raw)
 *   – Otherwise, fetch("/data/{topic}.json"). If 404 or network failure, throw FETCH_ERROR.
 *   – On success, parse JSON and pass to _transform(rawData).
 * @param {string} topic – quiz ID (builtin or custom)
 * @returns {Promise<{title:string,questions:Array}>}
 */
export function loadQuizData(topic) {

    const customMap = _getCustomMap();
    if (customMap[topic]) {
        return Promise.resolve(_transform(customMap[topic]));
    }


    return fetch(`data/${topic}.json`)
        .then(res => {
            if (!res.ok) throw BUILTIN_FETCH_ERROR;
            return res.json();
        })
        .then(rawData => _transform(rawData));
}

/**
 * Convert a raw quiz (with “name” and questions that have either:
 *     • choices & answer fields (if someone pre‐shuffled their own custom format), OR
 *     • right_answer + other_answers fields (for built‐in JSON).
 * For the latter, merge right_answer with other_answers, shuffle them,
 * and compute the “answer” index. Return an object of shape:
 *     { title: raw.name, questions: [ { text, choices:[...], answer:index, media? } ] }
 * @param {Object} raw – raw JSON from data file or custom storage
 * @returns {{title:string,questions:Array}}
 */
function _transform(raw) {
    const data = {title: raw.name, questions: []};
    raw.questions.forEach(q => {
        if (q.choices) {
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