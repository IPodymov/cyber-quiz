// Генерирует SQL-сид из JSON-банка: схема + INSERT'ы. Использование:
//   node scripts/export-sql.js > dist/seed.sql && psql "$DATABASE_URL" -f dist/seed.sql
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', `${name}.json`), 'utf8'));

const lit = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (Array.isArray(v)) return `ARRAY[${v.map(lit).join(', ')}]::text[]`;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') return `${lit(JSON.stringify(v))}::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
const insert = (table, row) =>
  `INSERT INTO ${table} (${Object.keys(row).join(', ')}) VALUES (${Object.values(row).map(lit).join(', ')}) ON CONFLICT DO NOTHING;`;

const { categories, questions } = read('questions');
const { posts } = read('blog');
const { courses } = read('courses');

const out = [fs.readFileSync(path.join(root, 'docs/db/postgres-schema.sql'), 'utf8'), 'BEGIN;'];
for (const c of categories) out.push(insert('categories', { id: c.id, title: c.title, color: c.color }));
for (const q of questions) {
  out.push(insert('questions', {
    id: q.id, category_id: q.category, difficulty: q.difficulty, question: q.question,
    correct_option_id: q.correctOptionId, explanation: q.explanation, tags: q.tags || [],
  }));
  q.options.forEach((o, i) => out.push(insert('question_options', { question_id: q.id, id: o.id, text: o.text, position: i })));
}
for (const p of posts) {
  out.push(insert('blog_posts', {
    id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, category_id: p.category,
    author: p.author, published_at: p.publishedAt, reading_minutes: p.readingMinutes, body: p.body,
  }));
}
for (const c of courses) {
  out.push(insert('courses', { id: c.id, slug: c.slug, title: c.title, description: c.description, level: c.level, status: c.status }));
  c.modules.forEach((m, mi) => {
    out.push(insert('course_modules', { id: m.id, course_id: c.id, title: m.title, position: mi }));
    m.lessons.forEach((l, li) => out.push(insert('lessons', {
      id: l.id, module_id: m.id, title: l.title, type: l.type, position: li,
      blog_post_id: l.blogPostId || null, quiz_config: l.quiz || null,
    })));
  });
}
out.push('COMMIT;');
process.stdout.write(`${out.join('\n')}\n`);
