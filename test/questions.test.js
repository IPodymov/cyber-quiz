const test = require('node:test');
const assert = require('node:assert/strict');
const bank = require('../data/questions.json');

test('банк вопросов валиден', () => {
  const categoryIds = new Set(bank.categories.map((c) => c.id));
  const ids = new Set();
  for (const q of bank.questions) {
    assert.ok(!ids.has(q.id), `дубликат id ${q.id}`);
    ids.add(q.id);
    assert.ok(categoryIds.has(q.category), `${q.id}: неизвестная категория ${q.category}`);
    assert.ok(['easy', 'medium', 'hard'].includes(q.difficulty), `${q.id}: сложность`);
    assert.ok(q.options.length >= 2, `${q.id}: мало вариантов`);
    assert.equal(new Set(q.options.map((o) => o.id)).size, q.options.length, `${q.id}: дубли вариантов`);
    assert.ok(q.options.some((o) => o.id === q.correctOptionId), `${q.id}: нет правильного варианта`);
    assert.ok(q.explanation, `${q.id}: нет объяснения`);
  }
});
