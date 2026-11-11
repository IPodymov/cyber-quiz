import { initLayout, api, escapeHtml } from './app.js';

const config = await initLayout();
const root = document.querySelector('[data-profile]');

if (!config.user) {
  location.replace('/login?next=/profile');
} else {
  const [{ user }, { attempts }] = await Promise.all([api('/auth/me'), api('/quiz/history')]);
  const best = attempts.reduce((max, a) => Math.max(max, a.percent), 0);
  root.innerHTML = `
    <span class="eyebrow">Профиль</span>
    <h1>Привет, <span class="gradient-text">${escapeHtml(user.name)}</span></h1>
    <p class="muted">${escapeHtml(user.email)}</p>
    <div class="grid grid-3" style="margin:24px 0">
      <div class="card"><div class="stat-value gradient-text">${attempts.length}</div><p class="muted">попыток</p></div>
      <div class="card"><div class="stat-value gradient-text">${best}%</div><p class="muted">лучший результат</p></div>
    </div>
    <h2>История</h2>
    ${attempts.length
      ? attempts.map((a) => `
          <div class="card" style="margin-bottom:12px">
            <div class="cat-row">
              <strong>${a.score} из ${a.total} · ${a.percent}%</strong>
              <span class="muted">${new Date(a.finishedAt).toLocaleString('ru-RU')}</span>
              <div class="progress-track"><div class="progress-bar" style="width:${a.percent}%"></div></div>
            </div>
            <span class="muted">${a.byCategory.map((c) => escapeHtml(c.title)).join(' · ')}</span>
          </div>`).join('')
      : '<p class="muted">Вы ещё не проходили квиз. <a href="/quiz">Начать →</a></p>'}`;
}
