import {initLayout, api, escapeHtml, formatDate} from './app.js';

initLayout();

const list = document.querySelector('[data-posts]');

api('/blog/posts')
    .then(({posts}) => {
        if (!posts.length) {
            list.innerHTML = '<p class="muted">Статей пока нет — скоро появятся.</p>';
            return;
        }
        list.innerHTML = posts
            .map((p) => `
        <a class="card post-card" href="/post.html?slug=${encodeURIComponent(p.slug)}">
          <span class="chip">${p.readingMinutes} мин чтения</span>
          <h3>${escapeHtml(p.title)}</h3>
          <p class="muted">${escapeHtml(p.excerpt)}</p>
          <span class="post-meta">${formatDate(p.publishedAt)}</span>
        </a>`)
            .join('');
    })
    .catch(() => {
        list.innerHTML = '<p class="muted">Не удалось загрузить статьи.</p>';
    });
