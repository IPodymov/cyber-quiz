import {initLayout, api, escapeHtml} from './app.js';

const DIFFICULTY = {easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный'};
const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

const views = Object.fromEntries([...document.querySelectorAll('[data-view]')].map((el) => [el.dataset.view, el]));
const $ = (sel) => document.querySelector(sel);

const setupForm = $('[data-setup-form]');
const setupError = $('[data-setup-error]');
const categorySelect = $('#category');

let categories = new Map();
let state = null; // { attemptId, questions, index, answered, lastSettings }

function show(name) {
    for (const [key, el] of Object.entries(views)) el.hidden = key !== name;
}

async function init() {
    const config = await initLayout();
    $('[data-guest-hint]').hidden = Boolean(config.user);

    const meta = await api('/quiz/meta');
    categories = new Map(meta.categories.map((c) => [c.id, c]));
    for (const c of meta.categories) {
        categorySelect.add(new Option(`${c.title} (${c.questionCount})`, c.id));
    }
    const preset = new URLSearchParams(location.search).get('category');
    if (preset && categories.has(preset)) categorySelect.value = preset;
}

async function start(settings) {
    setupError.hidden = true;
    try {
        const data = await api('/quiz/attempts', {method: 'POST', body: settings});
        state = {
            attemptId: data.attemptId,
            questions: data.questions,
            index: 0,
            answered: false,
            lastSettings: settings
        };
        show('question');
        renderQuestion();
    } catch (err) {
        show('setup');
        setupError.textContent = err.message;
        setupError.hidden = false;
    }
}

function renderQuestion() {
    const {questions, index} = state;
    const q = questions[index];
    const category = categories.get(q.category);
    state.answered = false;

    // Прогресс стартует не с нуля — так пользователь сразу видит движение
    const percent = Math.round(((index + 1) / questions.length) * 100);
    $('[data-progress-bar]').style.width = `${percent}%`;
    $('[data-progress-label]').textContent = `${index + 1} / ${questions.length}`;
    const track = $('[data-progress-track]');
    track.setAttribute('aria-valuemax', String(questions.length));
    track.setAttribute('aria-valuenow', String(index + 1));
    track.setAttribute('aria-label', `Вопрос ${index + 1} из ${questions.length}`);

    $('[data-question-meta]').innerHTML = `
    <span class="chip" style="color:${escapeHtml(category?.color || 'var(--cyan)')}"><span class="dot"></span>${escapeHtml(category?.title || q.category)}</span>
    <span class="chip">${DIFFICULTY[q.difficulty] || q.difficulty}</span>`;
    const title = $('[data-question-title]');
    title.textContent = q.question;

    $('[data-options]').innerHTML = q.options
        .map((o, i) => `
      <li>
        <button class="option" type="button" data-option-id="${escapeHtml(o.id)}">
          <span class="option-key" aria-hidden="true">${KEYS[i]}</span>
          <span>${escapeHtml(o.text)}</span>
          <span class="option-status" aria-hidden="true"></span>
        </button>
      </li>`)
        .join('');

    $('[data-feedback]').innerHTML = '';
    const next = $('[data-next]');
    next.hidden = true;
    next.textContent = index === questions.length - 1 ? 'Показать результат →' : 'Далее →';
    title.focus({preventScroll: true});
    window.scrollTo({top: 0, behavior: 'smooth'});
}

async function choose(optionId) {
    if (state.answered) return;
    state.answered = true;
    const q = state.questions[state.index];
    const buttons = [...document.querySelectorAll('[data-option-id]')];
    buttons.forEach((b) => {
        b.disabled = true;
    });

    try {
        const result = await api(`/quiz/attempts/${state.attemptId}/answers`, {
            method: 'POST',
            body: {questionId: q.id, optionId},
        });
        for (const b of buttons) {
            const id = b.dataset.optionId;
            const status = b.querySelector('.option-status');
            if (id === result.correctOptionId) {
                b.classList.add('is-correct');
                status.textContent = '✓';
                b.setAttribute('aria-label', `${b.textContent.trim()} — правильный ответ`);
            } else if (id === optionId) {
                b.classList.add('is-wrong');
                status.textContent = '✕';
                b.setAttribute('aria-label', `${b.textContent.trim()} — ваш ответ, неверно`);
            } else {
                b.classList.add('is-dim');
            }
        }
        // Не полагаемся только на цвет: текстовый заголовок + иконки ✓/✕
        $('[data-feedback]').innerHTML = `
      <div class="feedback ${result.correct ? 'ok' : 'bad'}" role="status">
        <strong>${result.correct ? '✓ Верно!' : '✕ Не совсем.'}</strong>
        ${escapeHtml(result.explanation)}
      </div>`;
        const next = $('[data-next]');
        next.hidden = false;
        next.focus({preventScroll: true});
    } catch (err) {
        state.answered = false;
        buttons.forEach((b) => {
            b.disabled = false;
        });
        $('[data-feedback]').innerHTML = `<div class="feedback bad" role="alert"><strong>Ошибка</strong>${escapeHtml(err.message)}</div>`;
    }
}

async function next() {
    if (state.index < state.questions.length - 1) {
        state.index += 1;
        renderQuestion();
        return;
    }
    const summary = await api(`/quiz/attempts/${state.attemptId}/finish`, {method: 'POST'});
    renderResult(summary);
}

function verdict(percent) {
    if (percent >= 90) return ['Киберниндзя 🥷', 'Отличный уровень — вас сложно обмануть.'];
    if (percent >= 70) return ['Уверенный защитник 🛡', 'Хорошая база. Пара тем требует внимания.'];
    if (percent >= 40) return ['На верном пути 🚀', 'Посмотрите разборы и попробуйте ещё раз через пару дней.'];
    return ['Время прокачаться 💡', 'Начните с блога и тем, где было больше всего ошибок.'];
}

function renderResult(summary) {
    show('result');
    const [title, text] = verdict(summary.percent);
    $('[data-result-ring]').style.setProperty('--p', summary.percent);
    $('[data-result-score]').textContent = `${summary.percent}%`;
    const heading = $('[data-result-title]');
    heading.textContent = title;
    $('[data-result-text]').textContent = `${summary.score} из ${summary.total} правильных. ${text}`;
    $('[data-result-categories]').innerHTML = summary.byCategory
        .sort((a, b) => a.correct / a.total - b.correct / b.total)
        .map((c) => {
            const p = Math.round((c.correct / c.total) * 100);
            return `
        <div class="cat-row">
          <span>${escapeHtml(c.title)}</span>
          <span class="muted">${c.correct}/${c.total}</span>
          <div class="progress-track"><div class="progress-bar" style="width:${p}%"></div></div>
        </div>`;
        })
        .join('');
    heading.focus({preventScroll: true});
    window.scrollTo({top: 0, behavior: 'smooth'});
}

setupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(setupForm));
    start({category: data.category, difficulty: data.difficulty, count: Number(data.count)});
});

$('[data-options]').addEventListener('click', (event) => {
    const button = event.target.closest('[data-option-id]');
    if (button) choose(button.dataset.optionId);
});

$('[data-next]').addEventListener('click', next);
$('[data-restart]').addEventListener('click', () => start(state.lastSettings));

document.addEventListener('keydown', (event) => {
    if (views.question.hidden || event.metaKey || event.ctrlKey || event.altKey) return;
    const n = Number(event.key);
    if (!state.answered && n >= 1 && n <= state.questions[state.index].options.length) {
        choose(state.questions[state.index].options[n - 1].id);
    }
});

init().catch((err) => {
    setupError.textContent = `Не удалось загрузить квиз: ${err.message}`;
    setupError.hidden = false;
});
