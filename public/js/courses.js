import { initLayout, api, escapeHtml } from './app.js';

initLayout();

const root = document.querySelector('[data-courses]');
const LEVEL = { beginner: 'Начальный', intermediate: 'Средний', advanced: 'Продвинутый' };

api('/courses')
  .then(({ courses }) => {
    root.innerHTML = `
      <div class="section-head">
        <span class="eyebrow">Курсы</span>
        <h1>Учитесь <span class="gradient-text">системно</span></h1>
        <p class="muted">Статьи из блога и квизы, собранные в программы.</p>
      </div>
      <div class="grid grid-3">
        ${courses.map((c) => `
          <div class="card">
            <span class="chip">${LEVEL[c.level] || escapeHtml(c.level)} · ${c.moduleCount} модуля</span>
            <h3 style="margin-top:12px">${escapeHtml(c.title)}</h3>
            <p class="muted">${escapeHtml(c.description)}</p>
          </div>`).join('')}
      </div>`;
  })
  .catch(() => {
    root.innerHTML = '<p class="muted">Не удалось загрузить курсы.</p>';
  });
