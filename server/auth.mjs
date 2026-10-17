import crypto from 'node:crypto';
import { CORE_BY_FORM, ELECTIVE_CODES, JUNIOR_SUBJECT_CODES } from './data/subjects.mjs';

const SESSION_COOKIE = 'sd_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  try {
    const parts = String(stored || '').split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const [, n, r, p, saltHex, hashHex] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function sessionHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function parseCookies(req) {
  const cookies = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }
  return cookies;
}

export function createSession(db, userId, req) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sessionHash(token);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS);
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(createdAt.toISOString());
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_seen_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    tokenHash,
    userId,
    createdAt.toISOString(),
    expiresAt.toISOString(),
    createdAt.toISOString(),
    String(req.headers['user-agent'] || '').slice(0, 240),
  );
  return token;
}

export function isSecureRequest(req) {
  if (req.socket?.encrypted) return true;
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  return proto === 'https';
}

export function sessionCookie(token, secure = false) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(secure = false) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function clearUserSessions(db, userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function normalizeRecoveryCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function issueRecoveryCode(db, userId) {
  const id = Number(userId).toString(36).toUpperCase();
  const secret = crypto.randomBytes(4).toString('hex').toUpperCase();
  const code = `ZD-${id}-${secret}`;
  db.prepare('UPDATE users SET recovery_hash = ? WHERE id = ?').run(hashPassword(code), userId);
  return code;
}

export function verifyRecoveryCode(db, code) {
  const normalized = normalizeRecoveryCode(code);
  const match = /^ZD-([0-9A-Z]+)-([A-F0-9]{8})$/.exec(normalized);
  if (!match) return null;
  const userId = parseInt(match[1], 36);
  if (!Number.isSafeInteger(userId) || userId <= 0) return null;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user?.recovery_hash || !verifyPassword(normalized, user.recovery_hash)) return null;
  return user;
}

const registerAttempts = new Map();
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_MAX = 5;

export function checkRegisterLimit(req) {
  const key = req.socket?.remoteAddress || 'local';
  const record = registerAttempts.get(key);
  if (!record) return { allowed: true };
  if (Date.now() - record.first > REGISTER_WINDOW_MS) {
    registerAttempts.delete(key);
    return { allowed: true };
  }
  if (record.count >= REGISTER_MAX) {
    return { allowed: false, retryAfter: Math.ceil((REGISTER_WINDOW_MS - (Date.now() - record.first)) / 1000) };
  }
  return { allowed: true };
}

export function noteRegisterAttempt(req) {
  const key = req.socket?.remoteAddress || 'local';
  const record = registerAttempts.get(key);
  if (!record || Date.now() - record.first > REGISTER_WINDOW_MS) {
    registerAttempts.set(key, { count: 1, first: Date.now() });
  } else {
    record.count += 1;
  }
}

export function getSessionUser(db, req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = sessionHash(token);
  const row = db
    .prepare(
      `SELECT u.*, s.token_hash, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(tokenHash);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }
  db.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').run(new Date().toISOString(), tokenHash);
  return row;
}

export function deleteSession(db, req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sessionHash(token));
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    form: user.form,
    goal: user.goal,
    language: user.language || 'zh',
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
  };
}

export function validateUsername(username) {
  return /^[A-Za-z0-9_-]{3,24}$/.test(String(username || ''));
}

export function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 128;
}

export function normalizeSubjects(db, form, codes) {
  const unique = [...new Set((Array.isArray(codes) ? codes : []).map((code) => String(code || '').trim()).filter(Boolean))];
  const subjects = db.prepare('SELECT id, code, name, stage FROM subjects').all();
  const byCode = new Map(subjects.map((subject) => [subject.code, subject]));
  const core = CORE_BY_FORM[form] || [];
  if (!core.length) return { error: '请选择有效的年级。' };

  for (const code of unique) {
    if (!byCode.has(code)) return { error: `未知学科：${code}` };
  }

  if (form === 'S3') {
    for (const code of core) {
      if (!unique.includes(code)) return { error: '中三必须包含中国语文、英国语文、数学。' };
    }
    const allowed = unique.filter((code) => JUNIOR_SUBJECT_CODES.includes(code));
    if (allowed.length < 3) return { error: '请至少选择 3 个科目。' };
    return {
      codes: JUNIOR_SUBJECT_CODES.filter((code) => allowed.includes(code)),
      core,
    };
  }

  for (const code of core) {
    if (!unique.includes(code)) return { error: '高中必须包含中国语文、英国语文、数学、公民与社会发展。' };
  }
  const electives = unique.filter((code) => !core.includes(code));
  const invalid = electives.filter((code) => !ELECTIVE_CODES.includes(code));
  if (invalid.length) return { error: `这些科目不属于高中选修：${invalid.join('、')}` };
  if (electives.length < 2) return { error: '请至少选择 2 门选修科（可包括 M1 / M2）。' };
  if (electives.length > 5) return { error: '选修科最多选择 5 门。' };
  return {
    codes: [...core, ...ELECTIVE_CODES.filter((code) => electives.includes(code))],
    core,
  };
}

export function saveUserSubjects(db, userId, codes, coreCodes) {
  db.prepare('DELETE FROM user_subjects WHERE user_id = ?').run(userId);
  const insert = db.prepare('INSERT INTO user_subjects (user_id, subject_id, is_core, sort_order) VALUES (?, ?, ?, ?)');
  const subjects = db.prepare('SELECT id, code FROM subjects').all();
  const byCode = new Map(subjects.map((subject) => [subject.code, subject.id]));
  codes.forEach((code, index) => {
    const id = byCode.get(code);
    if (id) insert.run(userId, id, coreCodes.includes(code) ? 1 : 0, index);
  });
}

export function getUserSubjects(db, userId) {
  return db
    .prepare(
      `SELECT s.*, us.is_core, us.sort_order
       FROM user_subjects us JOIN subjects s ON s.id = us.subject_id
       WHERE us.user_id = ?
       ORDER BY us.sort_order, s.sort_order`,
    )
    .all(userId)
    .map((subject) => ({ ...subject, isCore: Boolean(subject.is_core) }));
}

export function getUserSubjectCodes(db, userId) {
  return getUserSubjects(db, userId).map((subject) => subject.code);
}

export function userHasSubject(db, userId, subjectCode) {
  return Boolean(
    db
      .prepare(
        'SELECT 1 FROM user_subjects us JOIN subjects s ON s.id = us.subject_id WHERE us.user_id = ? AND s.code = ?',
      )
      .get(userId, subjectCode),
  );
}

const loginFailures = new Map();
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX = 8;

export function loginKey(req, username) {
  return `${req.socket?.remoteAddress || 'local'}|${String(username || '').toLowerCase()}`;
}

export function checkLoginLimit(key) {
  const record = loginFailures.get(key);
  if (!record) return { allowed: true };
  if (Date.now() - record.first > LOGIN_WINDOW_MS) {
    loginFailures.delete(key);
    return { allowed: true };
  }
  if (record.count >= LOGIN_MAX) {
    return { allowed: false, retryAfter: Math.ceil((LOGIN_WINDOW_MS - (Date.now() - record.first)) / 1000) };
  }
  return { allowed: true };
}

export function noteLoginFailure(key) {
  const record = loginFailures.get(key);
  if (!record || Date.now() - record.first > LOGIN_WINDOW_MS) {
    loginFailures.set(key, { count: 1, first: Date.now() });
  } else {
    record.count += 1;
  }
}

export function clearLoginFailures(key) {
  loginFailures.delete(key);
}
