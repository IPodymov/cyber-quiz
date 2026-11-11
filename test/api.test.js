const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const config = require('../server/config');
const { createRepositories } = require('../server/db');
const { createApp } = require('../server/app');

const runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cyberquiz-'));
const testConfig = { ...config, db: { ...config.db, runtimeDir } };
const app = createApp({ config: testConfig, repos: createRepositories(testConfig.db) });
let server;
let base;

test.before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => {
  server.close();
  fs.rmSync(runtimeDir, { recursive: true, force: true });
});

// Мини-клиент с cookie-jar
function client() {
  const jar = new Map();
  return async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const [k, v] = pair.split('=');
      if (v) jar.set(k, v); else jar.delete(k);
    }
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
}

test('навигация содержит ровно 3 пункта', async () => {
  const { body } = await client()('GET', '/api/config');
  assert.deepEqual(body.nav.map((n) => n.label), ['Главная', 'Квиз', 'Блог']);
});

test('регистрация, вход, выход', async () => {
  const req = client();
  const bad = await req('POST', '/api/auth/register', { name: 'A', email: 'nope', password: '123' });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.details.email && bad.body.details.password && bad.body.details.name);

  const reg = await req('POST', '/api/auth/register', { name: 'Тест', email: 'Test@Example.com', password: 'correct horse battery' });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.user.email, 'test@example.com');
  assert.equal(reg.body.user.passwordHash, undefined);

  const dup = await req('POST', '/api/auth/register', { name: 'Тест', email: 'test@example.com', password: 'whatever123' });
  assert.equal(dup.status, 409);

  assert.equal((await req('GET', '/api/auth/me')).status, 200);
  await req('POST', '/api/auth/logout');
  assert.equal((await req('GET', '/api/auth/me')).status, 401);

  assert.equal((await req('POST', '/api/auth/login', { email: 'test@example.com', password: 'wrong-password' })).status, 401);
  const ok = await req('POST', '/api/auth/login', { email: 'test@example.com', password: 'correct horse battery' });
  assert.equal(ok.status, 200);
});

test('квиз: без ответов в выдаче, новый порядок при каждом запуске, подсчёт баллов', async () => {
  const req = client();
  const bank = require('../data/questions.json');
  const original = new Map(bank.questions.map((q) => [q.id, q]));

  const first = await req('POST', '/api/quiz/attempts', { count: 10 });
  assert.equal(first.status, 201);
  assert.equal(first.body.questions.length, 10);
  assert.ok(!JSON.stringify(first.body).includes('correctOptionId'));
  for (const q of first.body.questions) {
    const ids = q.options.map((o) => o.id);
    assert.notDeepEqual(ids, original.get(q.id).options.map((o) => o.id), 'варианты в порядке банка');
  }

  // Весь пул категории (6 вопросов): порядок вопросов и вариантов не должен повторить прошлую попытку
  let prev = await req('POST', '/api/quiz/attempts', { category: 'phishing', count: 6 });
  for (let i = 0; i < 20; i += 1) {
    const cur = await req('POST', '/api/quiz/attempts', { category: 'phishing', count: 6 });
    assert.notDeepEqual(cur.body.questions.map((q) => q.id), prev.body.questions.map((q) => q.id));
    for (const q of cur.body.questions) {
      const before = prev.body.questions.find((p) => p.id === q.id);
      assert.notDeepEqual(q.options.map((o) => o.id), before.options.map((o) => o.id));
    }
    prev = cur;
  }

  const { attemptId, questions } = prev.body;
  for (const [i, q] of questions.entries()) {
    const optionId = i < 3 ? original.get(q.id).correctOptionId : q.options.find((o) => o.id !== original.get(q.id).correctOptionId).id;
    const ans = await req('POST', `/api/quiz/attempts/${attemptId}/answers`, { questionId: q.id, optionId });
    assert.equal(ans.body.correct, i < 3);
    assert.ok(ans.body.explanation);
  }
  const again = await req('POST', `/api/quiz/attempts/${attemptId}/answers`, { questionId: questions[0].id, optionId: questions[0].options[0].id });
  assert.equal(again.status, 409);

  const summary = await req('POST', `/api/quiz/attempts/${attemptId}/finish`);
  assert.equal(summary.body.score, 3);
  assert.equal(summary.body.percent, 50);

  // Чужой клиент не может отвечать в эту попытку
  const stranger = await client()('POST', `/api/quiz/attempts/${attemptId}/answers`, { questionId: questions[0].id, optionId: 'a' });
  assert.equal(stranger.status, 404);
});

test('история сохраняется для авторизованного пользователя', async () => {
  const req = client();
  await req('POST', '/api/auth/register', { name: 'Hist', email: 'hist@example.com', password: 'longpassword' });
  const { body } = await req('POST', '/api/quiz/attempts', { count: 2 });
  await req('POST', `/api/quiz/attempts/${body.attemptId}/finish`);
  const history = await req('GET', '/api/quiz/history');
  assert.equal(history.body.attempts.length, 1);
});

test('блог и страницы', async () => {
  const req = client();
  const list = await req('GET', '/api/blog/posts');
  assert.ok(list.body.posts.length > 0 && !list.body.posts[0].body);
  assert.equal((await req('GET', `/api/blog/posts/${list.body.posts[0].slug}`)).status, 200);
  for (const page of ['/', '/quiz', '/blog', '/login', '/register', `/blog/${list.body.posts[0].slug}`]) {
    assert.equal((await fetch(base + page)).status, 200, page);
  }
  assert.equal((await fetch(`${base}/courses`)).status, 404, 'курсы скрыты флагом');
});
