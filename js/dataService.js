
import {shuffleArray} from './utils.js';

const BUILTIN_FETCH_ERROR = new Error('Quiz data not found');
const OFFLINE_NO_CACHE_ERROR = new Error('Offline: no cached quiz data');
const CUSTOM_STORAGE_KEY = 'customQuizzes';

function _getCustomMap() {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function _setCustomMap(mapObj) {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(mapObj));
}

export function getAllCustomQuizzes() {
    const map = _getCustomMap();
    return Object.keys(map).map(id => ({
        id,
        name: map[id].name
    }));
}

export function getCustomQuiz(id) {
    const map = _getCustomMap();
    return map[id] || null;
}

export function saveCustomQuiz(id, rawQuiz) {
    const map = _getCustomMap();
    map[id] = rawQuiz;
    _setCustomMap(map);
}

export function deleteCustomQuiz(id) {
    const map = _getCustomMap();
    if (map[id]) {
        delete map[id];
        _setCustomMap(map);
    }
}

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