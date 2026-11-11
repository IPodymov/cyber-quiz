-- Схема PostgreSQL для CyberQuiz. Наполнение: npm run export:sql > dist/seed.sql && psql -f dist/seed.sql

CREATE TABLE IF NOT EXISTS categories (
  id         text PRIMARY KEY,
  title      text NOT NULL,
  color      text
);

CREATE TABLE IF NOT EXISTS questions (
  id                text PRIMARY KEY,
  category_id       text NOT NULL REFERENCES categories(id),
  difficulty        text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question          text NOT NULL,
  correct_option_id text NOT NULL,
  explanation       text NOT NULL,
  tags              text[] NOT NULL DEFAULT '{}',
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS questions_category_difficulty_idx ON questions (category_id, difficulty) WHERE is_active;

CREATE TABLE IF NOT EXISTS question_options (
  question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  id          text NOT NULL,
  text        text NOT NULL,
  position    smallint NOT NULL,
  PRIMARY KEY (question_id, id)
);

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'user',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    text NOT NULL,              -- 'user:<uuid>' или 'guest:<uuid>'
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  filters     jsonb NOT NULL DEFAULT '{}',
  items       jsonb NOT NULL,             -- [{questionId, optionOrder[]}] — порядок, показанный пользователю
  answers     jsonb NOT NULL DEFAULT '{}',
  score       integer,
  created_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS quiz_attempts_owner_idx ON quiz_attempts (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quiz_attempts_user_idx ON quiz_attempts (user_id, finished_at DESC);

CREATE TABLE IF NOT EXISTS blog_posts (
  id              text PRIMARY KEY,
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  excerpt         text NOT NULL,
  category_id     text REFERENCES categories(id),
  author          text NOT NULL,
  published_at    date NOT NULL,
  reading_minutes smallint NOT NULL,
  body            text[] NOT NULL
);

-- ===== Курсы (будущий модуль) =====
CREATE TABLE IF NOT EXISTS courses (
  id          text PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL,
  description text NOT NULL,
  level       text NOT NULL,
  status      text NOT NULL DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS course_modules (
  id        text PRIMARY KEY,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title     text NOT NULL,
  position  smallint NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id           text PRIMARY KEY,
  module_id    text NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title        text NOT NULL,
  type         text NOT NULL CHECK (type IN ('article', 'quiz', 'video')),
  position     smallint NOT NULL,
  blog_post_id text REFERENCES blog_posts(id),
  quiz_config  jsonb                        -- {category, difficulty, count} для type = 'quiz'
);

CREATE TABLE IF NOT EXISTS enrollments (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    text NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  attempt_id   uuid REFERENCES quiz_attempts(id),
  PRIMARY KEY (user_id, lesson_id)
);
