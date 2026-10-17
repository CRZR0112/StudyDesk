import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DATA_DIR, DB_FILE, UPLOAD_DIR } from './config.mjs';
import { SUBJECTS, FORMS } from './data/subjects.mjs';
import { QUESTIONS } from './data/questions.mjs';
import { SAMPLE_NOTES } from './data/sample-notes.mjs';
import { TOPIC_EN, SUBJECT_DESC_EN } from './data/topic-en.mjs';

const now = () => new Date().toISOString();

export const MIGRATIONS = [
  {
    version: 1,
    name: 'initial-schema',
    sql: `
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        name_en TEXT,
        stage TEXT NOT NULL DEFAULT 'both',
        color TEXT,
        glyph TEXT,
        description TEXT,
        official_url TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        unit TEXT,
        form TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
        form TEXT,
        filename TEXT,
        mime TEXT,
        size INTEGER NOT NULL DEFAULT 0,
        kind TEXT NOT NULL DEFAULT 'text',
        text_content TEXT,
        stored_name TEXT,
        ocr INTEGER NOT NULL DEFAULT 0,
        meta_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
        form TEXT,
        title TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        sections_json TEXT NOT NULL DEFAULT '[]',
        keywords_json TEXT NOT NULL DEFAULT '[]',
        source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
        engine TEXT NOT NULL DEFAULT 'local',
        coverage INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ready',
        search_text TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
        origin TEXT NOT NULL,
        year INTEGER NOT NULL,
        paper TEXT,
        question_no TEXT,
        difficulty INTEGER NOT NULL DEFAULT 2,
        type TEXT NOT NULL DEFAULT 'mcq',
        stem TEXT NOT NULL,
        options_json TEXT NOT NULL DEFAULT '[]',
        answer TEXT NOT NULL,
        explanation TEXT NOT NULL DEFAULT '',
        marks INTEGER NOT NULL DEFAULT 1,
        tags_json TEXT NOT NULL DEFAULT '[]',
        adapted INTEGER NOT NULL DEFAULT 1,
        official_url TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
        response TEXT,
        is_correct INTEGER,
        self_grade TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id, form, sort_order);
      CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject_id, form, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notes_topic ON notes(topic_id);
      CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id, topic_id);
      CREATE INDEX IF NOT EXISTS idx_questions_origin ON questions(origin, year);
      CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id);
      CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);
    `,
  },
  {
    version: 2,
    name: 'note-revision',
    sql: `
      ALTER TABLE notes ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
    `,
  },
  {
    version: 3,
    name: 'users-sessions-subjects',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        form TEXT NOT NULL DEFAULT 'S4',
        goal TEXT NOT NULL DEFAULT '',
        language TEXT NOT NULL DEFAULT 'zh',
        created_at TEXT NOT NULL,
        last_login_at TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE);

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        user_agent TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

      CREATE TABLE IF NOT EXISTS user_subjects (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        is_core INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, subject_id)
      );

      ALTER TABLE notes ADD COLUMN user_id INTEGER;
      ALTER TABLE sources ADD COLUMN user_id INTEGER;
      ALTER TABLE attempts ADD COLUMN user_id INTEGER;
      ALTER TABLE activity ADD COLUMN user_id INTEGER;

      CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sources_user ON sources(user_id);
      CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id, created_at DESC);
    `,
  },
  {
    version: 4,
    name: 'external-resources',
    sql: `
      CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT 'question-bank',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_resources_subject ON resources(subject_id);
      CREATE INDEX IF NOT EXISTS idx_resources_user ON resources(user_id);

      INSERT INTO resources (user_id, subject_id, title, url, description, kind, created_at)
      SELECT NULL, id, 'DSE Physics Learning Hub · Beacon College',
             'https://9676e9f0e72c4178985cf45da8757ea9.app.workbuddy.link',
             'Revision notes, worksheets and past papers. The question-bank folders live in the school SharePoint and may require a school account.',
             'question-bank', datetime('now')
      FROM subjects WHERE code = 'phy'
        AND NOT EXISTS (SELECT 1 FROM resources WHERE url = 'https://9676e9f0e72c4178985cf45da8757ea9.app.workbuddy.link');
    `,
  },
  {
    version: 5,
    name: 'english-topic-metadata',
    sql: `
      ALTER TABLE topics ADD COLUMN name_en TEXT NOT NULL DEFAULT '';
      ALTER TABLE topics ADD COLUMN unit_en TEXT NOT NULL DEFAULT '';
      ALTER TABLE subjects ADD COLUMN description_en TEXT NOT NULL DEFAULT '';
    `,
  },
  {
    version: 6,
    name: 'account-recovery',
    sql: `
      ALTER TABLE users ADD COLUMN recovery_hash TEXT;
    `,
  },
];

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
  const row = db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get();
  const current = Number(row?.v || 0);
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    db.exec('BEGIN');
    try {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
        migration.version,
        migration.name,
        now(),
      );
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

function buildQuestionSearchText(question) {
  return [question.stem, question.explanation, ...(question.tags || [])].join(' ');
}

export function buildNoteSearchText(note) {
  const sectionText = (note.sections || [])
    .map((section) => [
      section.title,
      section.root,
      ...(section.branches || []).flatMap((b) => [b.label, ...(b.items || [])]),
      ...(section.items || []).map((item) =>
        typeof item === 'string' ? item : [item.term, item.definition, item.label, item.formula, item.note, item.q, item.a].filter(Boolean).join(' '),
      ),
    ]
      .filter(Boolean)
      .join(' '))
    .join(' ');
  return [note.title, note.summary, ...(note.keywords || []), sectionText].join(' ');
}

function seed(db) {
  const seeded = db.prepare("SELECT value FROM meta WHERE key = 'seed_version'").get();
  if (seeded) return;

  db.exec('BEGIN');
  try {
    const subjectStmt = db.prepare(`
      INSERT INTO subjects (code, name, name_en, stage, color, glyph, description, description_en, official_url, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const topicStmt = db.prepare(`
      INSERT INTO topics (subject_id, code, name, name_en, unit, unit_en, form, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const subjectIds = new Map();
    const topicIds = new Map();
    SUBJECTS.forEach((subject, index) => {
      const info = subjectStmt.run(
        subject.code,
        subject.name,
        subject.nameEn,
        subject.stage,
        subject.color,
        subject.glyph,
        subject.description,
        SUBJECT_DESC_EN[subject.code] || '',
        subject.officialUrl,
        index,
      );
      const subjectId = Number(info.lastInsertRowid);
      subjectIds.set(subject.code, subjectId);
      subject.topics.forEach((topic, topicIndex) => {
        const t = topicStmt.run(
          subjectId,
          topic.code,
          topic.name,
          TOPIC_EN[topic.code]?.name || '',
          topic.unit || '',
          TOPIC_EN[topic.code]?.unit || '',
          topic.form,
          topicIndex,
        );
        topicIds.set(topic.code, Number(t.lastInsertRowid));
      });
    });

    // 题库
    const questionStmt = db.prepare(`
      INSERT INTO questions
        (subject_id, topic_id, origin, year, paper, question_no, difficulty, type,
         stem, options_json, answer, explanation, marks, tags_json, adapted, official_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const seen = new Set();
    let questionCount = 0;
    for (const question of QUESTIONS) {
      const subjectId = subjectIds.get(question.subjectCode);
      const topicId = topicIds.get(question.topicCode);
      if (!subjectId || !topicId) {
        console.warn(`[seed] skip question with unknown subject/topic: ${question.subjectCode}/${question.topicCode}`);
        continue;
      }
      const signature = `${question.subjectCode}|${question.year}|${question.stem}`;
      if (seen.has(signature)) continue;
      seen.add(signature);
      const subject = SUBJECTS.find((s) => s.code === question.subjectCode);
      questionStmt.run(
        subjectId,
        topicId,
        question.origin,
        question.year,
        question.paper,
        question.questionNo,
        question.difficulty,
        question.type,
        question.stem,
        JSON.stringify(question.options || []),
        question.answer,
        question.explanation,
        question.marks,
        JSON.stringify(question.tags || []),
        question.adapted ? 1 : 0,
        subject?.officialUrl || null,
        now(),
      );
      questionCount += 1;
    }

    // 预置示范笔记
    const noteStmt = db.prepare(`
      INSERT INTO notes
        (subject_id, topic_id, form, title, summary, sections_json, keywords_json, source_id,
         engine, coverage, status, search_text, created_at, updated_at, revision)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'sample', ?, 'ready', ?, ?, ?, 1)
    `);
    for (const sample of SAMPLE_NOTES) {
      const subjectId = subjectIds.get(sample.subjectCode);
      const topicId = topicIds.get(sample.topicCode);
      const createdAt = now();
      const searchText = buildNoteSearchText(sample);
      const info = noteStmt.run(
        subjectId,
        topicId,
        sample.form,
        sample.title,
        sample.summary,
        JSON.stringify(sample.sections),
        JSON.stringify(sample.keywords),
        sample.coverage,
        searchText,
        createdAt,
        createdAt,
      );
      const noteId = Number(info.lastInsertRowid);
      db.prepare('INSERT INTO activity (type, title, detail, subject_id, note_id, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        'note',
        `预置示范：${sample.title}`,
        '由系统预先整理，可作为归纳结果的结构参考',
        subjectId,
        noteId,
        createdAt,
      );
    }

    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(
      'profile',
      JSON.stringify({ name: '同学', form: 'S5', goal: '2027 DSE' }),
    );
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(
      'ai',
      JSON.stringify({ enabled: false, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '' }),
    );
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('appearance', JSON.stringify({ accent: 'jade' }));
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('seed_version', '1');
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('created_at', now());
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('forms', JSON.stringify(FORMS));
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('question_count', String(questionCount));

    db.prepare('INSERT INTO activity (type, title, detail, subject_id, note_id, created_at) VALUES (?, ?, ?, ?, NULL, ?)').run(
      'system',
      '知序学习台已就绪',
      `已载入 ${SUBJECTS.length} 个学科、${SUBJECTS.reduce((n, s) => n + s.topics.length, 0)} 个课题、${questionCount} 道 DSE/HKCEE 风格练习`,
      null,
      now(),
    );
    db.exec('COMMIT');
    console.log(`[seed] subjects=${SUBJECTS.length} topics=${topicIds.size} questions=${questionCount} notes=${SAMPLE_NOTES.length}`);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

let singleton = null;

function ensureSeedResources(db) {
  const phy = db.prepare('SELECT id FROM subjects WHERE code = ?').get('phy');
  if (!phy) return;
  const url = 'https://9676e9f0e72c4178985cf45da8757ea9.app.workbuddy.link';
  const exists = db.prepare('SELECT 1 FROM resources WHERE url = ?').get(url);
  if (exists) return;
  db.prepare(
    `INSERT INTO resources (user_id, subject_id, title, url, description, kind, created_at)
     VALUES (NULL, ?, ?, ?, ?, 'question-bank', ?)`,
  ).run(
    phy.id,
    'DSE Physics Learning Hub · Beacon College',
    url,
    'Revision notes, worksheets and past papers. The question-bank folders live in the school SharePoint and may require a school account.',
    now(),
  );
}

function ensureEnglishMetadata(db) {
  const updateSubject = db.prepare(
    `UPDATE subjects SET description_en = ? WHERE code = ? AND (description_en IS NULL OR description_en = '')`,
  );
  for (const [code, description] of Object.entries(SUBJECT_DESC_EN)) {
    updateSubject.run(description, code);
  }
  const updateTopic = db.prepare(
    `UPDATE topics SET name_en = ?, unit_en = ? WHERE code = ? AND (name_en IS NULL OR name_en = '' OR unit_en IS NULL OR unit_en = '')`,
  );
  for (const [code, value] of Object.entries(TOPIC_EN)) {
    updateTopic.run(value.name, value.unit, code);
  }
}

export function openDatabase() {
  if (singleton) return singleton;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  migrate(db);
  seed(db);
  ensureSeedResources(db);
  ensureEnglishMetadata(db);
  singleton = db;
  return db;
}

export function getSetting(db, key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

export function setSetting(db, key, value) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, raw);
  return value;
}

export function recordActivity(db, { type, title, detail = '', subjectId = null, noteId = null, userId = null }) {
  db.prepare('INSERT INTO activity (type, title, detail, subject_id, note_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    type,
    title,
    detail,
    subjectId,
    noteId,
    userId,
    now(),
  );
}

export function getSubjectsWithTopics(db, userId = null) {
  const subjects = db.prepare('SELECT * FROM subjects ORDER BY sort_order, id').all();
  const topics = db.prepare('SELECT * FROM topics ORDER BY form, sort_order, id').all();
  const noteCounts = new Map(
    (userId
      ? db.prepare('SELECT subject_id, COUNT(*) AS n FROM notes WHERE user_id = ? GROUP BY subject_id').all(userId)
      : []
    ).map((r) => [r.subject_id, r.n]),
  );
  const questionCounts = new Map(
    db.prepare('SELECT subject_id, COUNT(*) AS n FROM questions GROUP BY subject_id').all().map((r) => [r.subject_id, r.n]),
  );
  return subjects.map((subject) => ({
    ...subject,
    nameEn: subject.name_en || subject.nameEn || '',
    descriptionEn: subject.description_en || '',
    noteCount: noteCounts.get(subject.id) || 0,
    questionCount: questionCounts.get(subject.id) || 0,
    topics: topics
      .filter((topic) => topic.subject_id === subject.id)
      .map((topic) => ({
        ...topic,
        nameEn: topic.name_en || '',
        unitEn: topic.unit_en || '',
        noteCount: userId
          ? db.prepare('SELECT COUNT(*) AS n FROM notes WHERE topic_id = ? AND user_id = ?').get(topic.id, userId).n
          : 0,
        questionCount: db.prepare('SELECT COUNT(*) AS n FROM questions WHERE topic_id = ?').get(topic.id).n,
      })),
  }));
}

export function getStats(db, userId = null) {
  const questions = userId
    ? db
        .prepare(
          `SELECT COUNT(*) AS n FROM questions q
           JOIN user_subjects us ON us.subject_id = q.subject_id AND us.user_id = ?`,
        )
        .get(userId).n
    : db.prepare('SELECT COUNT(*) AS n FROM questions').get().n;
  if (!userId) {
    return { notes: 0, subjects: 0, questions, attempts: 0, correct: 0, accuracy: 0, avgCoverage: 0 };
  }
  const notes = db.prepare('SELECT COUNT(*) AS n FROM notes WHERE user_id = ?').get(userId).n;
  const subjects = db.prepare('SELECT COUNT(DISTINCT subject_id) AS n FROM notes WHERE user_id = ?').get(userId).n;
  const attempts = db
    .prepare('SELECT COUNT(*) AS n, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS c FROM attempts WHERE user_id = ?')
    .get(userId);
  const avgCoverage = db.prepare('SELECT ROUND(AVG(coverage)) AS n FROM notes WHERE user_id = ?').get(userId).n || 0;
  return {
    notes,
    subjects,
    questions,
    attempts: attempts.n || 0,
    correct: attempts.c || 0,
    accuracy: attempts.n ? Math.round(((attempts.c || 0) / attempts.n) * 100) : 0,
    avgCoverage,
  };
}

export function getActivity(db, userId = null, limit = 8) {
  if (!userId) return [];
  return db.prepare('SELECT * FROM activity WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?').all(userId, limit);
}

export function getOfficialResources() {
  return [
    {
      label: 'HKEAA · DSE 历年试题',
      url: 'https://www.hkeaa.edu.hk/en/hkdse/assessment/past_papers/',
      note: '官方 Past Papers 与评卷参考入口',
    },
    {
      label: 'HKEAA · 科目资讯',
      url: 'https://www.hkeaa.edu.hk/en/hkdse/assessment/subject_information/',
      note: '评核大纲、试卷结构与比重',
    },
    {
      label: 'EDB · 课程指引',
      url: 'https://www.edb.gov.hk/en/curriculum-development/',
      note: '教育局课程文件与学习重点',
    },
  ];
}

export { buildQuestionSearchText };
