import {initLayout, api, escapeHtml} from './app.js';

initLayout();

const grid = document.querySelector('[data-categories]');

api('/quiz/meta')
    .then(({categories, totalQuestions}) => {
        document.querySelectorAll('[data-total-questions]').forEach((el) => {
            el.textContent = totalQuestions;
        });
        grid.innerHTML = categories
            .map((c) => `
        <div class="card">
          <span class="chip" style="color:${escapeHtml(c.color)}"><span class="dot"></span>${c.questionCount} вопросов</span>
          <h3 style="margin-top:12px">${escapeHtml(c.title)}</h3>
          <a href="/quiz.html?category=${encodeURIComponent(c.id)}">Пройти по теме →</a>
        </div>`)
            .join('');
    })
    .catch(() => {
        grid.innerHTML = '<p class="muted">Не удалось загрузить темы.</p>';
    });
