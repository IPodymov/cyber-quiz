const test = require('node:test');
const assert = require('node:assert/strict');
const { shuffle, shuffleAvoiding, sameOrder } = require('../server/modules/quiz/shuffle');

test('shuffle сохраняет элементы и не мутирует вход', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), input);
});

test('shuffle равномерен (все 24 перестановки из 4 встречаются)', () => {
  const seen = new Map();
  for (let i = 0; i < 24000; i += 1) {
    const key = shuffle(['a', 'b', 'c', 'd']).join('');
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  assert.equal(seen.size, 24);
  for (const n of seen.values()) assert.ok(n > 700 && n < 1300, `перекос распределения: ${n}`);
});

test('shuffleAvoiding никогда не возвращает запрещённый порядок', () => {
  const items = ['a', 'b', 'c', 'd'];
  for (let i = 0; i < 2000; i += 1) {
    const out = shuffleAvoiding(items, [items, ['d', 'c', 'b', 'a']]);
    assert.ok(!sameOrder(out, items) && !sameOrder(out, ['d', 'c', 'b', 'a']));
  }
});
