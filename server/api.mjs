import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  APP_VERSION,
  DATA_DIR,
  DB_FILE,
  MAX_UPLOAD_BYTES,
  UPLOAD_DIR,
  PUBLIC_URL,
} from './config.mjs';
import {
  buildNoteSearchText,
  buildQuestionSearchText,
  getActivity,
  getOfficialResources,
  getSetting,
  getStats,
  getSubjectsWithTopics,
  recordActivity,
  setSetting,
} from './db.mjs';
import { generateLocalNote, buildMarkdown } from './engine.mjs';
import { extractFromUpload, detectKind } from './extract.mjs';
import { maskAiConfig, testAiConnection } from './ai.mjs';
import { needsEnglishKnowledge, translateNoteToEnglish } from './translate.mjs';
import { ocrAvailable } from './ocr.mjs';
import { getLanUrls } from './network.mjs';
import {
  checkLoginLimit,
  checkRegisterLimit,
  clearLoginFailures,
  clearSessionCookie,
  clearUserSessions,
  createSession,
  deleteSession,
  getSessionUser,
  getUserSubjectCodes,
  getUserSubjects,
  hashPassword,
  isSecureRequest,
  issueRecoveryCode,
  loginKey,
  noteLoginFailure,
  noteRegisterAttempt,
  normalizeSubjects,
  publicUser,
  saveUserSubjects,
  sessionCookie,
  userHasSubject,
  validatePassword,
  validateUsername,
  verifyPassword,
  verifyRecoveryCode,
} from './auth.mjs';
import { CORE_BY_FORM, ELECTIVE_CODES, JUNIOR_SUBJECT_CODES, FORMS as FORM_LIST } from './data/subjects.mjs';

const FORMS = new Set(['S3', 'S4', 'S5', 'S6']);
const DANGEROUS_EXT = new Set(['.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.ps1', '.vbs', '.js', '.jar', '.dll', '.sh', '.app']);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(body);
}

function fail(res, status, message) {
  sendJson(res, status, { ok: false, error: message });
}

function parseJsonBody(req, limit = MAX_UPLOAD_BYTES * 1.6) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('请求体太大，请上传 24 MB 以内的文件。'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('请求格式不是有效 JSON。'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function safeParse(raw, fallback) {
  try {
    const value = JSON.parse(raw);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, '\\$&');
}

function subjectRow(db, code) {
  if (!code) return null;
  return db.prepare('SELECT * FROM subjects WHERE code = ?').get(String(code)) || null;
}

function topicRow(db, code) {
  if (!code) return null;
  return db.prepare('SELECT * FROM topics WHERE code = ?').get(String(code)) || null;
}

function serializeQuestion(row) {
  if (!row) return null;
  return {
    id: row.id,
    subjectId: row.subject_id,
    subjectCode: row.subject_code,
    subjectName: row.subject_name,
    subjectColor: row.subject_color,
    topicId: row.topic_id,
    topicCode: row.topic_code,
    topicName: row.topic_name,
    form: row.form,
    origin: row.origin,
    year: row.year,
    paper: row.paper,
    questionNo: row.question_no,
    difficulty: row.difficulty,
    type: row.type,
    stem: row.stem,
    options: safeParse(row.options_json, []),
    answer: row.answer,
    explanation: row.explanation,
    marks: row.marks,
    tags: safeParse(row.tags_json, []),
    adapted: Boolean(row.adapted),
    officialUrl: row.official_url,
  };
}

function serializeNoteSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    subjectId: row.subject_id,
    subjectCode: row.subject_code,
    subjectName: row.subject_name,
    subjectColor: row.subject_color,
    topicId: row.topic_id,
    topicCode: row.topic_code,
    topicName: row.topic_name,
    topicNameEn: row.topic_name_en || '',
    form: row.form,
    keywords: safeParse(row.keywords_json, []),
    coverage: row.coverage,
    engine: row.engine,
    revision: row.revision || 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readingMinutes: Math.max(1, Math.round((row.search_text || '').length / 380)),
    sourceKind: row.source_kind || null,
  };
}

const NOTE_LIST_SQL = `
  SELECT n.*, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color,
         t.name AS topic_name, t.name_en AS topic_name_en, t.code AS topic_code, src.kind AS source_kind
  FROM notes n
  JOIN subjects s ON s.id = n.subject_id
  LEFT JOIN topics t ON t.id = n.topic_id
  LEFT JOIN sources src ON src.id = n.source_id
`;

function listNotes(db, { userId, subjectCode, topicCode, form, q, scope = 'all', limit = 50, offset = 0 } = {}) {
  if (!userId) return { notes: [], total: 0 };
  const where = [];
  const params = [];
  if (scope === 'mine') {
    where.push('n.user_id = ?');
    params.push(userId);
  } else if (scope === 'samples') {
    where.push('n.user_id IS NULL');
  } else {
    where.push('(n.user_id = ? OR n.user_id IS NULL)');
    params.push(userId);
  }
  if (subjectCode) {
    where.push('s.code = ?');
    params.push(subjectCode);
  }
  if (topicCode) {
    where.push('t.code = ?');
    params.push(topicCode);
  }
  if (form && FORMS.has(form)) {
    where.push('n.form = ?');
    params.push(form);
  }
  if (q) {
    where.push("(n.title LIKE ? ESCAPE '\\' OR n.summary LIKE ? ESCAPE '\\' OR n.search_text LIKE ? ESCAPE '\\')");
    const like = `%${escapeLike(q)}%`;
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const count = db.prepare(`SELECT COUNT(*) AS n FROM notes n JOIN subjects s ON s.id = n.subject_id LEFT JOIN topics t ON t.id = n.topic_id ${whereSql}`).get(...params).n;
  const rows = db
    .prepare(`${NOTE_LIST_SQL} ${whereSql} ORDER BY n.updated_at DESC, n.id DESC LIMIT ? OFFSET ?`)
    .all(...params, Math.min(100, Math.max(1, limit)), Math.max(0, offset));
  return {
    notes: rows.map((row) => ({
      ...serializeNoteSummary(row),
      isOwner: row.user_id === userId,
      isSample: row.user_id === null,
    })),
    total: count,
  };
}

function getNoteDetail(db, id, userId) {
  const row = db
    .prepare(`${NOTE_LIST_SQL} WHERE n.id = ?`)
    .get(id);
  if (!row) return null;
  if (row.user_id !== null && row.user_id !== userId) return null;
  const source = row.source_id
    ? db.prepare('SELECT * FROM sources WHERE id = ?').get(row.source_id)
    : null;
  if (source && source.user_id !== null && source.user_id !== userId) return null;
  const note = serializeNoteSummary(row);
  note.isOwner = row.user_id === userId;
  note.isSample = row.user_id === null;
  note.summary = row.summary;
  note.sections = safeParse(row.sections_json, []);
  note.keywords = safeParse(row.keywords_json, []);
  note.searchText = row.search_text;
  note.status = row.status;
  note.source = source
    ? {
        id: source.id,
        filename: source.filename,
        mime: source.mime,
        size: source.size,
        kind: source.kind,
        ocr: Boolean(source.ocr),
        text: source.text_content || '',
        hasFile: Boolean(source.stored_name),
        warnings: safeParse(source.meta_json, []).warnings || [],
      }
    : null;
  note.stats = {
    chars: source?.text_content?.length || row.search_text.length,
    sections: note.sections.length,
    concepts: note.sections.find((s) => s.type === 'concepts')?.items?.length || 0,
    keypoints: note.sections.find((s) => s.type === 'keypoints')?.items?.length || 0,
    flashcards: note.sections.find((s) => s.type === 'flashcards')?.items?.length || 0,
    readingMinutes: Math.max(1, Math.ceil((source?.text_content?.length || row.search_text.length) / 380)),
  };
  note.linkedQuestions = findLinkedQuestions(db, row, note.keywords);
  note.relatedNotes = db
    .prepare(
      `${NOTE_LIST_SQL} WHERE n.subject_id = ? AND n.id != ? AND (n.user_id = ? OR n.user_id IS NULL) ORDER BY n.updated_at DESC LIMIT 3`,
    )
    .all(row.subject_id, row.id, userId)
    .map((related) => ({
      ...serializeNoteSummary(related),
      isOwner: related.user_id === userId,
      isSample: related.user_id === null,
    }));
  return note;
}

function findLinkedQuestions(db, row, keywords = []) {
  const questions = db
    .prepare(
      `SELECT q.*, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color,
              t.name AS topic_name, t.code AS topic_code, t.form AS form
       FROM questions q
       JOIN subjects s ON s.id = q.subject_id
       LEFT JOIN topics t ON t.id = q.topic_id
       WHERE q.subject_id = ?`,
    )
    .all(row.subject_id);
  const scored = questions
    .map((question) => {
      let score = 0;
      if (question.topic_id && question.topic_id === row.topic_id) score += 10;
      const haystack = `${question.stem} ${safeParse(question.tags_json, []).join(' ')} ${question.explanation}`;
      for (const keyword of keywords.slice(0, 8)) {
        if (keyword && haystack.includes(keyword)) score += 3;
      }
      if (question.form === row.form) score += 1;
      return { question, score };
    })
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score || a.question.difficulty - b.question.difficulty)
    .slice(0, 4);
  return scored.map((item) => serializeQuestion(item.question));
}

function questionList(db, query) {
  const where = [];
  const params = [];
  if (query.scope !== 'all' && Array.isArray(query.subjectCodes) && query.subjectCodes.length) {
    where.push(`s.code IN (${query.subjectCodes.map(() => '?').join(',')})`);
    params.push(...query.subjectCodes);
  }
  if (query.subjectCode) {
    where.push('s.code = ?');
    params.push(query.subjectCode);
  }
  if (query.topicCode) {
    where.push('t.code = ?');
    params.push(query.topicCode);
  }
  if (query.form && FORMS.has(query.form)) {
    where.push('t.form = ?');
    params.push(query.form);
  }
  if (query.origin) {
    where.push('q.origin = ?');
    params.push(query.origin);
  }
  if (query.year) {
    where.push('q.year = ?');
    params.push(Number(query.year));
  }
  if (query.difficulty) {
    where.push('q.difficulty = ?');
    params.push(Number(query.difficulty));
  }
  if (query.q) {
    where.push("(q.stem LIKE ? ESCAPE '\\' OR q.explanation LIKE ? ESCAPE '\\' OR q.tags_json LIKE ? ESCAPE '\\')");
    const like = `%${escapeLike(query.q)}%`;
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const base = `FROM questions q JOIN subjects s ON s.id = q.subject_id LEFT JOIN topics t ON t.id = q.topic_id ${whereSql}`;
  const total = db.prepare(`SELECT COUNT(*) AS n ${base}`).get(...params).n;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
  const offset = Math.max(0, Number(query.offset) || 0);
  const rows = db
    .prepare(
      `SELECT q.*, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color,
              t.name AS topic_name, t.code AS topic_code, t.form AS form
       ${base}
       ORDER BY s.sort_order, q.year DESC, q.id ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset);
  return { questions: rows.map(serializeQuestion), total, limit, offset };
}

function getAllSettings(db, user) {
  const ai = getSetting(db, 'ai', { enabled: false, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '' });
  const appearance = getSetting(db, 'appearance', { accent: 'jade' });
  return {
    user: publicUser(user),
    profile: {
      name: user.display_name,
      username: user.username,
      form: user.form,
      goal: user.goal,
      language: user.language || 'zh',
    },
    subjects: getUserSubjects(db, user.id),
    ai: maskAiConfig(ai),
    appearance,
  };
}

function buildSearch(db, q, userId, limit = 6) {
  if (!q || !userId) return { notes: [], questions: [], total: 0 };
  const like = `%${escapeLike(q)}%`;
  const notes = db
    .prepare(
      `${NOTE_LIST_SQL} WHERE (n.user_id = ? OR n.user_id IS NULL)
       AND (n.title LIKE ? ESCAPE '\\' OR n.summary LIKE ? ESCAPE '\\' OR n.search_text LIKE ? ESCAPE '\\')
       ORDER BY n.updated_at DESC LIMIT ?`,
    )
    .all(userId, like, like, like, limit)
    .map((row) => ({
      ...serializeNoteSummary(row),
      isOwner: row.user_id === userId,
      isSample: row.user_id === null,
    }));
  const subjectCodes = getUserSubjectCodes(db, userId);
  const subjectSql = subjectCodes.length ? `AND s.code IN (${subjectCodes.map(() => '?').join(',')})` : '';
  const questions = db
    .prepare(
      `SELECT q.*, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color,
              t.name AS topic_name, t.code AS topic_code, t.form AS form
       FROM questions q JOIN subjects s ON s.id = q.subject_id LEFT JOIN topics t ON t.id = q.topic_id
       WHERE (q.stem LIKE ? ESCAPE '\\' OR q.explanation LIKE ? ESCAPE '\\' OR q.tags_json LIKE ? ESCAPE '\\')
       ${subjectSql}
       ORDER BY q.year DESC LIMIT ?`,
    )
    .all(like, like, like, ...subjectCodes, limit)
    .map(serializeQuestion);
  return { notes, questions, total: notes.length + questions.length };
}

function computeStreak(db, userId) {
  if (!userId) return 0;
  const days = db
    .prepare("SELECT DISTINCT substr(created_at, 1, 10) AS day FROM activity WHERE user_id = ? ORDER BY day DESC")
    .all(userId)
    .map((row) => row.day);
  if (!days.length) return 0;
  const today = new Date();
  const key = (date) => date.toISOString().slice(0, 10);
  const todayKey = key(today);
  const yesterday = new Date(today.getTime() - 86400000);
  const yesterdayKey = key(yesterday);
  if (days[0] !== todayKey && days[0] !== yesterdayKey) return 0;
  let streak = 0;
  let cursor = new Date(`${days[0]}T00:00:00Z`);
  const set = new Set(days);
  while (set.has(key(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}

function dataInfo() {
  let dbSize = 0;
  let uploadSize = 0;
  let uploadCount = 0;
  try {
    dbSize = fs.statSync(DB_FILE).size;
  } catch {
    dbSize = 0;
  }
  try {
    for (const name of fs.readdirSync(UPLOAD_DIR)) {
      const stat = fs.statSync(path.join(UPLOAD_DIR, name));
      if (stat.isFile()) {
        uploadCount += 1;
        uploadSize += stat.size;
      }
    }
  } catch {
    // 忽略。
  }
  return { dbSize, uploadSize, uploadCount, dataDir: DATA_DIR };
}

function sanitizeProfile(profile) {
  const name = String(profile?.name || '同学').trim().slice(0, 40) || '同学';
  const form = FORMS.has(profile?.form) ? profile.form : 'S5';
  const goal = String(profile?.goal || '2027 DSE').trim().slice(0, 60);
  return { name, form, goal };
}

function validateAiConfig(input, existing) {
  const baseUrl = String(input?.baseUrl || existing.baseUrl || 'https://api.openai.com/v1').trim();
  if (!/^https?:\/\/[^\s]+$/i.test(baseUrl)) {
    throw Object.assign(new Error('API Base URL 必须以 http:// 或 https:// 开头。'), { status: 400 });
  }
  const model = String(input?.model || existing.model || 'gpt-4o-mini').trim().slice(0, 100);
  if (!model) throw Object.assign(new Error('请填写模型名称。'), { status: 400 });
  let apiKey = existing.apiKey || '';
  if (typeof input?.apiKey === 'string' && input.apiKey.trim()) apiKey = input.apiKey.trim();
  if (input?.clearKey) apiKey = '';
  return { enabled: Boolean(input?.enabled), baseUrl, model, apiKey };
}

function decodeFile(file) {
  if (!file || typeof file !== 'object') return null;
  const name = String(file.name || '未命名文件').slice(0, 160);
  const ext = path.extname(name).toLowerCase();
  if (DANGEROUS_EXT.has(ext)) {
    throw Object.assign(new Error('出于安全原因，不支持上传可执行文件。'), { status: 400 });
  }
  const raw = String(file.data || '');
  if (!raw) throw Object.assign(new Error('文件内容为空。'), { status: 400 });
  const base64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(base64)) {
    throw Object.assign(new Error('文件编码无法识别。'), { status: 400 });
  }
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0) throw Object.assign(new Error('文件内容为空。'), { status: 400 });
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw Object.assign(new Error(`文件超过 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB 限制。`), { status: 413 });
  }
  return { name, ext, buffer, mime: String(file.mime || 'application/octet-stream') };
}

function saveUpload(file) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const ext = file.ext && /^\.[a-z0-9]{1,8}$/.test(file.ext) ? file.ext : '';
  const storedName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const target = path.join(UPLOAD_DIR, storedName);
  fs.writeFileSync(target, file.buffer);
  return { storedName, target };
}

function buildNoteRecord({ note, subject, topic, form, sourceId, engine }) {
  return {
    subject_id: subject.id,
    topic_id: topic?.id || null,
    form,
    title: note.title,
    summary: note.summary,
    sections: note.sections,
    keywords: note.keywords,
    source_id: sourceId,
    engine,
    coverage: note.coverage,
    search_text: buildNoteSearchText({ ...note, sections: note.sections, keywords: note.keywords }),
  };
}

// 从 OCR / 文件 / 粘贴内容里挑一个像标题的行，避免把页眉乱码当成标题。
function pickTitleFromText(text, filename = '', topicName = '') {
  const common = /^(solution|answer|example|note|exercise|chapter\s*\d+|summary|introduction|solutions?|注意|解答|例題|例题|答案|練習|练习)\b/i;
  const lines = String(text || '')
    .split('\n')
    .map((line) =>
      line
        .replace(/^#{1,6}\s*/, '')
        .replace(/^[-•*·]\s*/, '')
        .replace(/^第[一二三四五六七八九十百\d]+[章課课節节單元单元篇讲講]\s*[：:、.．\s]*/, '')
        .trim(),
    )
    .filter(Boolean);
  const candidates = [];
  let firstHeading = null;
  for (const [index, line] of lines.slice(0, 15).entries()) {
    if (line.length < 4 || line.length > 100) continue;
    if (/^[（(【[「『:：;；,，.。·_\-—]+/.test(line)) continue;
    const compact = line.replace(/\s+/g, '');
    const cjk = (compact.match(/[\u3400-\u9fff]/g) || []).length;
    const letters = (compact.match(/[A-Za-z]/g) || []).length;
    const words = line.match(/[A-Za-z]{2,}/g) || [];
    if (cjk === 0) {
      if (words.length < 2 || letters / compact.length < 0.55) continue;
      if (!/[aeiouyAEIOUY]/.test(compact)) continue;
    } else if (cjk < 3) {
      continue;
    }
    let score = cjk > 0 ? cjk * 2 + line.length * 0.08 : words.length * 2.5 + line.length * 0.06;
    if (/^[A-Z]/.test(line)) score += 1.5;
    score += Math.max(0, 5 - index * 0.5);
    const capitals = words.filter((word) => /^[A-Z]/.test(word)).length;
    score += capitals * 1.2;
    if (/[()]/.test(line)) score -= 2;
    if (/\b(reacts?|produce[sd]?|contains?|occurs?|causes?|shows?|means?|is|are|was|were)\b/i.test(line)) score -= 3;
    if (/[。！？.!?]$/.test(line)) score -= 5;
    if (common.test(line)) score -= 6;
    if (/[:：]$/.test(line)) score -= 1;
    candidates.push({ line, score });
    if (!firstHeading && line.length <= 50 && !/[。！？.!?]$/.test(line) && (cjk >= 3 || (words.length >= 2 && index < 5))) {
      firstHeading = line;
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  let chosen = firstHeading || candidates[0]?.line || '';
  if (!chosen) {
    const stem = String(filename || '').replace(/\.[^.]+$/, '').trim();
    if (stem && !/^(img|dsc|pxl|screenshot|photo|image|scan)[-_ ]?\d*$/i.test(stem)) chosen = stem;
  }
  if (!chosen) chosen = topicName ? `${topicName} · 整理笔记` : '整理笔记';
  return chosen
    .replace(/^第[一二三四五六七八九十百\d]+[章課课節节單元单元篇讲講]\s*[：:、.．\s]*/, '')
    .replace(/\bthetr\b/gi, 'their')
    .replace(/^Of\b/, 'Of')
    .replace(/\bOf\b/g, 'of')
    .replace(/[。；;]\s*$/, '')
    .slice(0, 140);
}

export async function handleApi(req, res, url, db) {
  const method = req.method || 'GET';
  const pathname = url.pathname;

  if (method === 'OPTIONS') {
    res.writeHead(204, { Allow: 'GET,POST,PATCH,DELETE,OPTIONS' });
    res.end();
    return;
  }

  if (pathname === '/api/health' && method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      version: APP_VERSION,
      uptime: Math.round(process.uptime()),
      database: fs.existsSync(DB_FILE) ? 'ready' : 'missing',
      ocr: ocrAvailable(),
      ai: maskAiConfig(getSetting(db, 'ai', {})).ready,
      time: new Date().toISOString(),
    });
  }

  // 公开的学科目录：注册页在登录前就需要选科。
  if (pathname === '/api/catalog' && method === 'GET') {
    const hasUsers = db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0;
    return sendJson(res, 200, {
      ok: true,
      subjects: getSubjectsWithTopics(db, null),
      forms: FORM_LIST,
      coreByForm: CORE_BY_FORM,
      electives: ELECTIVE_CODES,
      juniorSubjects: JUNIOR_SUBJECT_CODES,
      legacyProfile: hasUsers ? null : getSetting(db, 'profile', null),
    });
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    const registerLimit = checkRegisterLimit(req);
    if (!registerLimit.allowed) {
      return fail(res, 429, `这台设备注册过于频繁，请 ${Math.ceil(registerLimit.retryAfter / 60)} 分钟后再试。`);
    }
    noteRegisterAttempt(req);
    const body = await parseJsonBody(req);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    const displayName = String(body.displayName || '').trim().slice(0, 40);
    const form = FORMS.has(body.form) ? body.form : 'S4';
    const goal = String(body.goal || '').trim().slice(0, 60) || `${form} DSE`;
    const language = body.language === 'en' ? 'en' : 'zh';
    if (!validateUsername(username)) return fail(res, 400, '用户名需为 3–24 位英文、数字、下划线或连字符。');
    if (!validatePassword(password)) return fail(res, 400, '密码至少 6 位。');
    if (!displayName) return fail(res, 400, '请填写显示名称。');
    const selection = normalizeSubjects(db, form, body.subjects);
    if (selection.error) return fail(res, 400, selection.error);
    if (db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username)) {
      return fail(res, 409, '这个用户名已经被注册。');
    }

    const passwordHash = hashPassword(password);
    let userId = null;
    db.exec('BEGIN');
    try {
      const info = db
        .prepare(
          'INSERT INTO users (username, display_name, password_hash, form, goal, language, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(username, displayName, passwordHash, form, goal, language, new Date().toISOString(), new Date().toISOString());
      userId = Number(info.lastInsertRowid);
      saveUserSubjects(db, userId, selection.codes, selection.core);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    const created = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const recoveryCode = issueRecoveryCode(db, userId);
    const token = createSession(db, userId, req);
    recordActivity(db, {
      type: 'system',
      title: '账号已创建',
      detail: `欢迎加入知序，${displayName}`,
      userId,
    });
    return sendJson(
      res,
      201,
      {
        ok: true,
        user: publicUser(created),
        subjects: getUserSubjects(db, userId),
        recoveryCode,
      },
      { 'Set-Cookie': sessionCookie(token, isSecureRequest(req)) },
    );
  }

  if (pathname === '/api/auth/recover' && method === 'POST') {
    const body = await parseJsonBody(req);
    const key = loginKey(req, 'recover');
    const limit = checkLoginLimit(key);
    if (!limit.allowed) return fail(res, 429, `恢复尝试过多，请 ${limit.retryAfter} 秒后再试。`);
    const password = String(body.password || '');
    if (!validatePassword(password)) return fail(res, 400, '新密码至少 6 位。');
    const user = verifyRecoveryCode(db, body.code);
    if (!user) {
      noteLoginFailure(key);
      return fail(res, 401, '恢复码不正确，或这个账号还没有生成恢复码。');
    }
    clearLoginFailures(key);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), user.id);
    clearUserSessions(db, user.id);
    const recoveryCode = issueRecoveryCode(db, user.id);
    return sendJson(res, 200, {
      ok: true,
      username: user.username,
      displayName: user.display_name,
      recoveryCode,
    });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await parseJsonBody(req);
    const username = String(body.username || '').trim().toLowerCase();
    const key = loginKey(req, username);
    const limit = checkLoginLimit(key);
    if (!limit.allowed) return fail(res, 429, `尝试次数过多，请 ${limit.retryAfter} 秒后再试。`);
    const found = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
    if (!found || !verifyPassword(String(body.password || ''), found.password_hash)) {
      noteLoginFailure(key);
      return fail(res, 401, '用户名或密码不正确。');
    }
    clearLoginFailures(key);
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), found.id);
    const token = createSession(db, found.id, req);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(found.id);
    return sendJson(
      res,
      200,
      { ok: true, user: publicUser(user), subjects: getUserSubjects(db, found.id) },
      { 'Set-Cookie': sessionCookie(token, isSecureRequest(req)) },
    );
  }

  const sessionUser = getSessionUser(db, req);
  if (pathname === '/api/auth/me' && method === 'GET') {
    if (!sessionUser) return fail(res, 401, '未登录。');
    return sendJson(res, 200, {
      ok: true,
      user: publicUser(sessionUser),
      subjects: getUserSubjects(db, sessionUser.id),
      selectedSubjects: getUserSubjectCodes(db, sessionUser.id),
    });
  }
  if (pathname === '/api/auth/logout' && method === 'POST') {
    deleteSession(db, req);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie(isSecureRequest(req)) });
  }

  if (!sessionUser) return fail(res, 401, '请先登录。');
  const userId = sessionUser.id;

  if (pathname === '/api/auth/recovery-code' && method === 'POST') {
    const body = await parseJsonBody(req);
    if (!verifyPassword(String(body.password || ''), sessionUser.password_hash)) {
      return fail(res, 403, '密码不正确。');
    }
    return sendJson(res, 200, { ok: true, recoveryCode: issueRecoveryCode(db, userId) });
  }

  if (pathname === '/api/auth/account' && method === 'DELETE') {
    const body = await parseJsonBody(req);
    if (String(body.confirm || '') !== 'DELETE') return fail(res, 400, '请输入 DELETE 确认注销。');
    if (!verifyPassword(String(body.password || ''), sessionUser.password_hash)) {
      return fail(res, 403, '密码不正确。');
    }
    const sources = db.prepare('SELECT stored_name FROM sources WHERE user_id = ?').all(userId);
    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM notes WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM sources WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM attempts WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM activity WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM resources WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_subjects WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    for (const source of sources) {
      if (!source.stored_name) continue;
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(source.stored_name)));
      } catch {
        // 附件可能已被清理。
      }
    }
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie(isSecureRequest(req)) });
  }

  if (pathname === '/api/bootstrap' && method === 'GET') {
    const settings = getAllSettings(db, sessionUser);
    const requestPort = Number(url.port) || (url.protocol === 'https:' ? 443 : 80);
    const lanUrls = getLanUrls(requestPort);
    const ownRecent = listNotes(db, { userId, scope: 'mine', limit: 4 }).notes;
    const recentNotes = ownRecent.length
      ? ownRecent
      : listNotes(db, { userId, scope: 'samples', limit: 3 }).notes;
    return sendJson(res, 200, {
      ok: true,
      version: APP_VERSION,
      user: publicUser(sessionUser),
      mySubjects: getUserSubjects(db, userId),
      network: { port: requestPort, urls: lanUrls, primary: lanUrls[0]?.url || '', publicUrl: PUBLIC_URL },
      forms: [
        { code: 'S3', label: '中三 S3', group: 'junior' },
        { code: 'S4', label: '中四 S4', group: 'senior' },
        { code: 'S5', label: '中五 S5', group: 'senior' },
        { code: 'S6', label: '中六 S6', group: 'senior' },
      ],
      coreByForm: CORE_BY_FORM,
      electives: ELECTIVE_CODES,
      juniorSubjects: JUNIOR_SUBJECT_CODES,
      subjects: getSubjectsWithTopics(db, userId),
      stats: { ...getStats(db, userId), streak: computeStreak(db, userId) },
      recentNotes,
      activity: getActivity(db, userId, 8),
      settings,
      officialResources: getOfficialResources(),
      features: { ocr: ocrAvailable(), ai: settings.ai.ready },
    });
  }

  if (pathname === '/api/subjects' && method === 'GET') {
    return sendJson(res, 200, { ok: true, subjects: getSubjectsWithTopics(db, userId) });
  }

  if (pathname === '/api/stats' && method === 'GET') {
    return sendJson(res, 200, { ok: true, stats: { ...getStats(db, userId), streak: computeStreak(db, userId) } });
  }

  if (pathname === '/api/notes' && method === 'GET') {
    const result = listNotes(db, {
      userId,
      subjectCode: url.searchParams.get('subject') || '',
      topicCode: url.searchParams.get('topic') || '',
      form: url.searchParams.get('form') || '',
      q: url.searchParams.get('q') || '',
      scope: url.searchParams.get('scope') || 'all',
      limit: Number(url.searchParams.get('limit') || 50),
      offset: Number(url.searchParams.get('offset') || 0),
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (pathname === '/api/notes' && method === 'POST') {
    const body = await parseJsonBody(req);
    const subject = subjectRow(db, body.subjectCode);
    if (!subject) return fail(res, 400, '请选择有效的学科。');
    if (!userHasSubject(db, userId, subject.code)) {
      return fail(res, 400, '这门科目不在你的选科中，请先在设置里添加。');
    }
    const topic = topicRow(db, body.topicCode);
    if (body.topicCode && !topic) return fail(res, 400, '课题不存在，请刷新后重试。');
    if (topic && topic.subject_id !== subject.id) return fail(res, 400, '课题与学科不匹配。');
    const form = FORMS.has(body.form) ? body.form : topic?.form || (subject.stage === 'junior' ? 'S3' : 'S4');

    const file = decodeFile(body.file);
    let saved = null;
    let extracted = null;
    let text = String(body.text || '').trim();
    const warnings = [];

    try {
      if (file) {
        saved = saveUpload(file);
        const kind = detectKind(file.name, file.mime);
        if (!text || text.length < 8 || kind !== 'image') {
          // 有文件时优先提取；若用户同时提供了文字，则以文字为准。
          if (!text) {
            extracted = await extractFromUpload({
              buffer: file.buffer,
              filename: file.name,
              mime: file.mime,
              filePath: saved.target,
            });
            text = extracted.text;
            warnings.push(...(extracted.warnings || []));
          }
        }
      }
      if (!text) return fail(res, 400, '请粘贴文字，或上传一个包含文字的文件 / 图片。');
      if (text.length < 8) return fail(res, 400, '内容太短，至少需要 8 个字符。');

      const title =
        String(body.title || '').trim() ||
        pickTitleFromText(text, file?.name || '', topic?.name || '') ||
        `${topic?.name || '综合'} · 整理笔记`;

      const aiConfig = getSetting(db, 'ai', {});
      let note = generateLocalNote({
        text,
        title,
        subject: { code: subject.code, name: subject.name },
        topic: { name: topic?.name || '综合整理' },
        form,
      });
      if (title) note.title = String(title).slice(0, 140);
      let usedAi = false;
      let engine = 'local';
      if (needsEnglishKnowledge(subject.code) && aiConfig.enabled) {
        const translation = await translateNoteToEnglish(note, aiConfig);
        if (translation.translated && translation.errors.length === 0) {
          note = translation.note;
          usedAi = true;
          engine = 'ollama-en';
          warnings.push('知识稿已用本地模型转为英文；请校对专有名词与公式。');
        } else {
          warnings.push(`英文转写未完成：${translation.errors[0] || '模型未返回完整结果'}。已保存原文稿。`);
        }
      }

      const sourceInfo = db
        .prepare(
          `INSERT INTO sources (user_id, subject_id, topic_id, form, filename, mime, size, kind, text_content, stored_name, ocr, meta_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          userId,
          subject.id,
          topic?.id || null,
          form,
          file?.name || '粘贴文字',
          file?.mime || 'text/plain',
          file?.buffer.length || Buffer.byteLength(text, 'utf8'),
          extracted?.kind || (file ? detectKind(file.name, file.mime) : 'text'),
          text,
          saved?.storedName || null,
          extracted?.ocr ? 1 : 0,
          JSON.stringify({ warnings, originalName: file?.name || null }),
          new Date().toISOString(),
        );
      const sourceId = Number(sourceInfo.lastInsertRowid);

      const record = buildNoteRecord({ note, subject, topic, form, sourceId, engine });
      const info = db
        .prepare(
          `INSERT INTO notes (user_id, subject_id, topic_id, form, title, summary, sections_json, keywords_json, source_id,
             engine, coverage, status, search_text, created_at, updated_at, revision)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, ?, 1)`,
        )
        .run(
          userId,
          record.subject_id,
          record.topic_id,
          record.form,
          record.title,
          note.summary,
          JSON.stringify(note.sections),
          JSON.stringify(note.keywords),
          record.source_id,
          record.engine,
          record.coverage,
          record.search_text,
          new Date().toISOString(),
          new Date().toISOString(),
        );
      const noteId = Number(info.lastInsertRowid);
      recordActivity(db, {
        type: 'note',
        title: `整理完成：${note.title}`,
        detail: `${subject.name} · ${topic?.name || '综合'} · ${note.keywords.slice(0, 3).join('、')}`,
        subjectId: subject.id,
        noteId,
        userId,
      });
      return sendJson(res, 201, {
        ok: true,
        note: getNoteDetail(db, noteId, userId),
        usedAi,
        warnings,
      });
    } catch (error) {
      if (saved?.target) {
        try {
          fs.unlinkSync(saved.target);
        } catch {
          // 忽略。
        }
      }
      throw error;
    }
  }

  const noteMatch = pathname.match(/^\/api\/notes\/(\d+)(\/export\.md|\/regenerate)?$/);
  if (noteMatch) {
    const id = parseId(noteMatch[1]);
    const action = noteMatch[2] || '';
    if (!id) return fail(res, 400, '无效的笔记编号。');
    if (action === '' && method === 'GET') {
      const note = getNoteDetail(db, id, userId);
      if (!note) return fail(res, 404, '笔记不存在。');
      return sendJson(res, 200, { ok: true, note });
    }
    if (action === '' && method === 'PATCH') {
      const body = await parseJsonBody(req);
      const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
      if (!existing) return fail(res, 404, '笔记不存在。');
      if (existing.user_id !== userId) return fail(res, 403, '示范笔记只读，不能修改。');
      const title = body.title !== undefined ? String(body.title).trim().slice(0, 140) : existing.title;
      if (!title) return fail(res, 400, '标题不能为空。');
      const summary = body.summary !== undefined ? String(body.summary).trim().slice(0, 600) : existing.summary;
      let sections = safeParse(existing.sections_json, []);
      if (body.sections !== undefined) {
        if (!Array.isArray(body.sections)) return fail(res, 400, '笔记结构格式不正确。');
        sections = body.sections;
      }
      let keywords = safeParse(existing.keywords_json, []);
      if (body.keywords !== undefined) {
        if (!Array.isArray(body.keywords)) return fail(res, 400, '关键词格式不正确。');
        keywords = body.keywords.map((item) => String(item).slice(0, 40)).filter(Boolean).slice(0, 20);
      }
      const coverage = body.coverage !== undefined ? Math.max(0, Math.min(100, Number(body.coverage) || 0)) : existing.coverage;
      const searchText = buildNoteSearchText({ title, summary, sections, keywords });
      db.prepare(
        `UPDATE notes SET title = ?, summary = ?, sections_json = ?, keywords_json = ?, coverage = ?,
         search_text = ?, updated_at = ?, revision = revision + 1 WHERE id = ?`,
      ).run(title, summary, JSON.stringify(sections), JSON.stringify(keywords), coverage, searchText, new Date().toISOString(), id);
      recordActivity(db, {
        type: 'edit',
        title: `更新笔记：${title}`,
        detail: '手动修订',
        subjectId: existing.subject_id,
        noteId: id,
        userId,
      });
      return sendJson(res, 200, { ok: true, note: getNoteDetail(db, id, userId) });
    }
    if (action === '' && method === 'DELETE') {
      const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
      if (!existing) return fail(res, 404, '笔记不存在。');
      if (existing.user_id !== userId) return fail(res, 403, '示范笔记只读，不能删除。');
      db.prepare('DELETE FROM notes WHERE id = ?').run(id);
      if (existing.source_id) {
        const used = db.prepare('SELECT COUNT(*) AS n FROM notes WHERE source_id = ?').get(existing.source_id).n;
        if (!used) {
          const source = db.prepare('SELECT * FROM sources WHERE id = ?').get(existing.source_id);
          db.prepare('DELETE FROM sources WHERE id = ?').run(existing.source_id);
          if (source?.stored_name) {
            try {
              fs.unlinkSync(path.join(UPLOAD_DIR, source.stored_name));
            } catch {
              // 忽略。
            }
          }
        }
      }
      recordActivity(db, { type: 'delete', title: `删除笔记：${existing.title}`, detail: '', subjectId: existing.subject_id, userId });
      return sendJson(res, 200, { ok: true });
    }
    if (action === '/export.md' && method === 'GET') {
      const note = getNoteDetail(db, id, userId);
      if (!note) return fail(res, 404, '笔记不存在。');
      const markdown = buildMarkdown({
        ...note,
        subjectName: note.subjectName,
        topicName: note.topicName,
      });
      const filename = `${note.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)}.md`;
      res.writeHead(200, {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      });
      return res.end(markdown);
    }
    if (action === '/regenerate' && method === 'POST') {
      const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
      if (!row) return fail(res, 404, '笔记不存在。');
      if (row.user_id !== userId) return fail(res, 403, '示范笔记不能重新归纳。');
      const source = row.source_id ? db.prepare('SELECT * FROM sources WHERE id = ?').get(row.source_id) : null;
      if (!source?.text_content) return fail(res, 400, '这条笔记没有可重新归纳的原始文本。');
      const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(row.subject_id);
      const topic = row.topic_id ? db.prepare('SELECT * FROM topics WHERE id = ?').get(row.topic_id) : null;
      let note = generateLocalNote({
        text: source.text_content,
        title: row.title,
        subject: { code: subject.code, name: subject.name },
        topic: { name: topic?.name || '综合整理' },
        form: row.form,
      });
      note.title = row.title;
      let usedAi = false;
      let engine = 'local';
      const warnings = [];
      const aiConfig = getSetting(db, 'ai', {});
      if (needsEnglishKnowledge(subject.code) && aiConfig.enabled) {
        const translation = await translateNoteToEnglish(note, aiConfig);
        if (translation.translated && translation.errors.length === 0) {
          note = translation.note;
          usedAi = true;
          engine = 'ollama-en';
        } else {
          warnings.push(`英文转写未完成：${translation.errors[0] || '模型未返回完整结果'}`);
        }
      }
      const searchText = buildNoteSearchText(note);
      db.prepare(
        `UPDATE notes SET summary = ?, sections_json = ?, keywords_json = ?, engine = ?, coverage = ?,
         search_text = ?, updated_at = ?, revision = revision + 1 WHERE id = ?`,
      ).run(note.summary, JSON.stringify(note.sections), JSON.stringify(note.keywords), engine, note.coverage, searchText, new Date().toISOString(), id);
      recordActivity(db, { type: 'edit', title: `重新归纳：${note.title}`, detail: usedAi ? 'Ollama 英文' : '本地引擎', subjectId: row.subject_id, noteId: id, userId });
      return sendJson(res, 200, { ok: true, note: getNoteDetail(db, id, userId), usedAi, warnings });
    }
  }

  if (pathname === '/api/resources' && method === 'GET') {
    const subjectCode = url.searchParams.get('subject') || '';
    const rows = db
      .prepare(
        `SELECT r.*, s.code AS subject_code, s.name AS subject_name, s.name_en AS subject_name_en
         FROM resources r LEFT JOIN subjects s ON s.id = r.subject_id
         WHERE (r.user_id = ? OR (r.user_id IS NULL AND r.subject_id IN (SELECT subject_id FROM user_subjects WHERE user_id = ?)))
         ${subjectCode ? 'AND s.code = ?' : ''}
         ORDER BY (r.user_id IS NULL) DESC, r.id DESC`,
      )
      .all(...(subjectCode ? [userId, userId, subjectCode] : [userId, userId]));
    return sendJson(res, 200, {
      ok: true,
      resources: rows.map((row) => ({
        id: row.id,
        title: row.title,
        url: row.url,
        description: row.description,
        kind: row.kind,
        subjectCode: row.subject_code || '',
        subjectName: row.subject_name || '',
        subjectNameEn: row.subject_name_en || '',
        isMine: row.user_id === userId,
        createdAt: row.created_at,
      })),
    });
  }

  if (pathname === '/api/resources' && method === 'POST') {
    const body = await parseJsonBody(req);
    const title = String(body.title || '').trim().slice(0, 160);
    const rawUrl = String(body.url || '').trim();
    const subjectCode = String(body.subjectCode || '').trim();
    const description = String(body.description || '').trim().slice(0, 400);
    if (!title) return fail(res, 400, '请填写题库名称。');
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return fail(res, 400, '链接格式不正确，需要 http:// 或 https://。');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) return fail(res, 400, '只支持 http/https 链接。');
    const subject = subjectCode ? db.prepare('SELECT * FROM subjects WHERE code = ?').get(subjectCode) : null;
    if (subjectCode && !subject) return fail(res, 400, '学科不存在。');
    if (subject && !userHasSubject(db, userId, subject.code)) return fail(res, 403, '你没有选这门课，不能添加它的题库。');
    const info = db
      .prepare(
        `INSERT INTO resources (user_id, subject_id, title, url, description, kind, created_at)
         VALUES (?, ?, ?, ?, ?, 'question-bank', ?)`,
      )
      .run(userId, subject?.id || null, title, parsed.toString(), description, new Date().toISOString());
    return sendJson(res, 201, { ok: true, id: Number(info.lastInsertRowid) });
  }

  const resourceMatch = pathname.match(/^\/api\/resources\/(\d+)$/);
  if (resourceMatch && method === 'DELETE') {
    const id = Number(resourceMatch[1]);
    const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
    if (!row) return fail(res, 404, '资源不存在。');
    if (row.user_id !== userId) return fail(res, 403, '只能删除自己添加的题库。');
    db.prepare('DELETE FROM resources WHERE id = ?').run(id);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/questions' && method === 'GET') {
    const result = questionList(db, {
      subjectCodes: getUserSubjectCodes(db, userId),
      scope: url.searchParams.get('scope') || 'mine',
      subjectCode: url.searchParams.get('subject') || '',
      topicCode: url.searchParams.get('topic') || '',
      form: url.searchParams.get('form') || '',
      origin: url.searchParams.get('origin') || '',
      year: url.searchParams.get('year') || '',
      difficulty: url.searchParams.get('difficulty') || '',
      q: url.searchParams.get('q') || '',
      limit: url.searchParams.get('limit') || 30,
      offset: url.searchParams.get('offset') || 0,
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (pathname === '/api/questions/daily' && method === 'GET') {
    const subjectCode = url.searchParams.get('subject') || '';
    const myCodes = getUserSubjectCodes(db, userId);
    const where = [];
    const params = [];
    if (subjectCode) {
      where.push('s.code = ?');
      params.push(subjectCode);
    } else if (myCodes.length) {
      where.push(`s.code IN (${myCodes.map(() => '?').join(',')})`);
      params.push(...myCodes);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = db
      .prepare(
        `SELECT q.*, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color,
                t.name AS topic_name, t.code AS topic_code, t.form AS form
         FROM questions q JOIN subjects s ON s.id = q.subject_id LEFT JOIN topics t ON t.id = q.topic_id
         ${whereSql} ORDER BY q.id`,
      )
      .all(...params);
    if (!rows.length) return fail(res, 404, '你的选科下还没有题目。');
    const day = new Date().toISOString().slice(0, 10);
    const hash = [...day].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return sendJson(res, 200, { ok: true, question: serializeQuestion(rows[hash % rows.length]) });
  }

  const questionMatch = pathname.match(/^\/api\/questions\/(\d+)$/);
  if (questionMatch && method === 'GET') {
    const id = parseId(questionMatch[1]);
    const row = db
      .prepare(
        `SELECT q.*, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color,
                t.name AS topic_name, t.code AS topic_code, t.form AS form
         FROM questions q JOIN subjects s ON s.id = q.subject_id LEFT JOIN topics t ON t.id = q.topic_id
         WHERE q.id = ?`,
      )
      .get(id);
    if (!row) return fail(res, 404, '题目不存在。');
    return sendJson(res, 200, { ok: true, question: serializeQuestion(row) });
  }

  if (pathname === '/api/attempts' && method === 'POST') {
    const body = await parseJsonBody(req);
    const questionId = parseId(body.questionId);
    if (!questionId) return fail(res, 400, '题目编号无效。');
    const question = db.prepare('SELECT id FROM questions WHERE id = ?').get(questionId);
    if (!question) return fail(res, 404, '题目不存在。');
    const isCorrect = body.isCorrect === true || body.isCorrect === 1 ? 1 : 0;
    const selfGrade = ['correct', 'wrong', 'unsure'].includes(body.selfGrade) ? body.selfGrade : null;
    db.prepare('INSERT INTO attempts (question_id, note_id, response, is_correct, self_grade, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      questionId,
      parseId(body.noteId),
      String(body.response || '').slice(0, 2000),
      isCorrect,
      selfGrade,
      userId,
      new Date().toISOString(),
    );
    return sendJson(res, 200, { ok: true, stats: getStats(db, userId) });
  }

  if (pathname === '/api/search' && method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim();
    return sendJson(res, 200, { ok: true, q, ...buildSearch(db, q, userId) });
  }

  if (pathname === '/api/settings' && method === 'GET') {
    return sendJson(res, 200, { ok: true, ...getAllSettings(db, sessionUser), data: dataInfo() });
  }

  if (pathname === '/api/settings' && method === 'PUT') {
    const body = await parseJsonBody(req);
    const profile = body.profile || {};
    const displayName = profile.name !== undefined ? String(profile.name).trim().slice(0, 40) : sessionUser.display_name;
    const form = FORMS.has(profile.form) ? profile.form : sessionUser.form;
    const goal = profile.goal !== undefined ? String(profile.goal).trim().slice(0, 60) : sessionUser.goal;
    const language = profile.language === 'en' || profile.language === 'zh' ? profile.language : sessionUser.language;
    if (!displayName) return fail(res, 400, '显示名称不能为空。');

    let selection = null;
    if (body.subjects !== undefined) {
      selection = normalizeSubjects(db, form, body.subjects);
      if (selection.error) return fail(res, 400, selection.error);
    } else if (form !== sessionUser.form) {
      const current = getUserSubjectCodes(db, userId);
      selection = normalizeSubjects(db, form, current);
      if (selection.error) return fail(res, 400, '改年级后需要重新选择科目：' + selection.error);
    }

    db.prepare('UPDATE users SET display_name = ?, form = ?, goal = ?, language = ? WHERE id = ?').run(
      displayName,
      form,
      goal,
      language,
      userId,
    );
    if (selection) saveUserSubjects(db, userId, selection.codes, selection.core);
    if (body.ai !== undefined) {
      const existing = getSetting(db, 'ai', { enabled: false, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '' });
      setSetting(db, 'ai', validateAiConfig(body.ai, existing));
    }
    if (body.appearance !== undefined) {
      setSetting(db, 'appearance', { accent: String(body.appearance?.accent || 'jade').slice(0, 20) });
    }
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    recordActivity(db, { type: 'system', title: '更新学习档案', detail: `${displayName} · ${form}`, userId });
    return sendJson(res, 200, { ok: true, ...getAllSettings(db, updated) });
  }

  if (pathname === '/api/settings/ai-test' && method === 'POST') {
    const body = await parseJsonBody(req);
    const existing = getSetting(db, 'ai', { enabled: false, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '' });
    const config = validateAiConfig({ ...body, enabled: true }, existing);
    try {
      const result = await testAiConnection(config);
      return sendJson(res, 200, { ok: true, ...result });
    } catch (error) {
      return sendJson(res, 200, { ok: false, error: error.message || '连接失败' });
    }
  }

  if (pathname === '/api/export' && method === 'GET') {
    const subjects = db.prepare('SELECT * FROM subjects ORDER BY sort_order').all();
    const topics = db.prepare('SELECT * FROM topics ORDER BY subject_id, sort_order').all();
    const notes = db
      .prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY id')
      .all(userId)
      .map((note) => ({
        ...note,
        sections: safeParse(note.sections_json, []),
        keywords: safeParse(note.keywords_json, []),
        sections_json: undefined,
        keywords_json: undefined,
        search_text: undefined,
      }));
    const sources = db
      .prepare('SELECT id, subject_id, topic_id, form, filename, mime, size, kind, ocr, created_at FROM sources WHERE user_id = ? ORDER BY id')
      .all(userId);
    const questions = db.prepare('SELECT * FROM questions ORDER BY id').all().map((question) => ({
      ...question,
      options: safeParse(question.options_json, []),
      tags: safeParse(question.tags_json, []),
      options_json: undefined,
      tags_json: undefined,
    }));
    const payload = {
      app: '知序 StudyDesk',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      user: publicUser(sessionUser),
      mySubjects: getUserSubjects(db, userId),
      subjects,
      topics,
      notes,
      sources,
      questions,
      attempts: db.prepare('SELECT * FROM attempts WHERE user_id = ? ORDER BY id').all(userId),
    };
    const body = JSON.stringify(payload, null, 2);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="studydesk-${sessionUser.username}-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    });
    return res.end(body);
  }

  if (pathname === '/api/official-resources' && method === 'GET') {
    return sendJson(res, 200, { ok: true, resources: getOfficialResources() });
  }

  const fileMatch = pathname.match(/^\/api\/files\/(\d+)$/);
  if (fileMatch && method === 'GET') {
    const source = db.prepare('SELECT * FROM sources WHERE id = ?').get(parseId(fileMatch[1]));
    if (!source?.stored_name) return fail(res, 404, '文件不存在。');
    if (source.user_id !== null && source.user_id !== userId) return fail(res, 404, '文件不存在。');
    const target = path.join(UPLOAD_DIR, source.stored_name);
    const relative = path.relative(UPLOAD_DIR, target);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(target)) {
      return fail(res, 404, '文件不存在。');
    }
    const ext = path.extname(target).toLowerCase();
    const contentType = MIME[ext] || source.mime || 'application/octet-stream';
    const stat = fs.statSync(target);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(source.filename || 'file')}`,
      'X-Content-Type-Options': 'nosniff',
    });
    return fs.createReadStream(target).pipe(res);
  }

  return fail(res, 404, 'API 路径不存在。');
}

export { MIME, parseJsonBody, pickTitleFromText };
