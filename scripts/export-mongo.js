// Готовит файлы для mongoimport (по одной коллекции, формат JSON array). Использование:
//   node scripts/export-mongo.js
//   for c in categories questions blog_posts courses; do
//     mongoimport --uri "$MONGO_URL" --collection $c --jsonArray --file dist/mongo/$c.json --mode upsert
//   done
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', `${name}.json`), 'utf8'));
const outDir = path.join(root, 'dist', 'mongo');
fs.mkdirSync(outDir, { recursive: true });

// В Mongo вопрос хранится одним документом вместе с вариантами — id становится _id
const withMongoId = ({ id, ...rest }) => ({ _id: id, ...rest });
const { categories, questions } = read('questions');

const collections = {
  categories: categories.map(withMongoId),
  questions: questions.map(withMongoId),
  blog_posts: read('blog').posts.map(withMongoId),
  courses: read('courses').courses.map(withMongoId),
};

for (const [name, docs] of Object.entries(collections)) {
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(docs, null, 2));
  console.log(`${name}: ${docs.length} → dist/mongo/${name}.json`);
}
console.log('\nИндексы: db.questions.createIndex({category:1,difficulty:1}); db.users.createIndex({email:1},{unique:true}); db.quiz_attempts.createIndex({ownerId:1,createdAt:-1})');
