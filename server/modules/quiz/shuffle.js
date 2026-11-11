const crypto = require('node:crypto');

// Тасование Фишера–Йетса на криптостойком ГСЧ: каждая перестановка равновероятна
function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = crypto.randomInt(i + 1);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

const sameOrder = (a, b) => Boolean(b) && a.length === b.length && a.every((v, i) => v === b[i]);

// Перемешивает так, чтобы результат не совпал ни с одним из запрещённых порядков
// (исходный порядок в банке, порядок прошлой попытки). Для 1 элемента это невозможно — вернём как есть.
function shuffleAvoiding(items, forbidden = [], maxTries = 20) {
    let candidate = shuffle(items);
    for (let i = 0; i < maxTries && items.length > 1 && forbidden.some((f) => sameOrder(candidate, f)); i += 1) {
        candidate = shuffle(items);
    }
    return candidate;
}

module.exports = {shuffle, shuffleAvoiding, sameOrder};
