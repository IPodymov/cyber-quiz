import { initLayout, api, escapeHtml, formatDate } from './app.js';

initLayout();

const container = document.querySelector('[data-post]');
const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop());

api(`/blog/posts/${encodeURIComponent(slug)}`)
  .then(({ post }) => {
    document.title = `${post.title} — CyberQuiz`;
    container.innerHTML = `
      <a href="/blog">← Все статьи</a>
      <h1 style="margin-top:16px">${escapeHtml(post.title)}</h1>
      <p class="muted">${escapeHtml(post.author)} · ${formatDate(post.publishedAt)} · ${post.readingMinutes} мин</p>
      ${post.body.map((para) => `<p>${escapeHtml(para)}</p>`).join('')}
      <div class="cta-band" style="margin-top:40px">
        <h2>Закрепите знания</h2>
        <p class="muted">Ответьте на вопросы по этой теме — так материал запомнится надолго.</p>
        <a class="btn btn-primary" href="/quiz?category=${encodeURIComponent(post.category)}">Квиз по теме →</a>
      </div>`;
  })
  .catch((err) => {
    container.innerHTML = `<h1>Статья не найдена</h1><p class="muted">${escapeHtml(err.message)}</p><a href="/blog">← Все статьи</a>`;
  });
