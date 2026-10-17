// 端到端 API 冒烟测试：账号、选科、数据隔离、语言偏好、备份。
// 使用临时数据目录启动独立服务器，不污染真实笔记。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.TEST_PORT || 4471);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'zhixu-smoke-'));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let child = null;
let passed = 0;

async function waitForHealth(timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return;
    } catch {
      // 服务器尚未监听。
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('服务器启动超时');
}

async function json(pathname, { method = 'GET', body, cookie } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${BASE}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${pathname} ${response.status}: ${data.error || 'unknown'}`);
  return data;
}

async function register(username, displayName, subjects, extra = {}) {
  const response = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password: 'secret123',
      displayName,
      form: 'S4',
      goal: '2027 DSE',
      language: 'zh',
      subjects,
      ...extra,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`register ${response.status}: ${data.error}`);
  return { data, cookie: (response.headers.getSetCookie?.()[0] || '').split(';')[0] };
}

async function step(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

try {
  child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: ROOT,
    env: { ...process.env, STUDYDESK_DATA_DIR: DATA_DIR, PORT: String(PORT), HOST: '127.0.0.1' },
    stdio: 'ignore',
    windowsHide: true,
  });
  await waitForHealth();
  console.log('\n知序 StudyDesk · account smoke test\n');

  const aliceSubjects = ['chi', 'eng', 'math', 'csd', 'phy', 'chem', 'm1'];
  let aliceCookie = '';
  let aliceNoteId = null;

  await step('健康检查、公开目录与登录保护', async () => {
    const health = await fetch(`${BASE}/api/health`).then((response) => response.json());
    assert.equal(health.ok, true);
    const catalog = await fetch(`${BASE}/api/catalog`).then((response) => response.json());
    assert.equal(catalog.subjects.length, 16);
    assert.ok(catalog.electives.includes('m1'));
    assert.ok(catalog.electives.includes('m2'));
    const bootstrap = await fetch(`${BASE}/api/bootstrap`);
    assert.equal(bootstrap.status, 401);
  });

  await step('注册：核心科 + 选修科（含 M1）', async () => {
    const result = await register('alice_test', 'Alice', aliceSubjects);
    aliceCookie = result.cookie;
    assert.equal(result.data.user.displayName, 'Alice');
    assert.equal(result.data.user.language, 'zh');
    assert.equal(result.data.subjects.length, 7);
    assert.equal(result.data.subjects.find((subject) => subject.code === 'm1').isCore, false);
    assert.ok(aliceCookie.startsWith('sd_session='));
    const me = await json('/api/auth/me', { cookie: aliceCookie });
    assert.equal(me.user.username, 'alice_test');
    assert.ok(me.selectedSubjects.includes('m1'));
  });

  await step('新用户只看到示范笔记，统计从 0 开始', async () => {
    const boot = await json('/api/bootstrap', { cookie: aliceCookie });
    assert.equal(boot.stats.notes, 0);
    assert.equal(boot.mySubjects.length, 7);
    assert.equal(boot.recentNotes.length, 3);
    assert.ok(boot.recentNotes.every((note) => note.isSample));
    const notes = await json('/api/notes', { cookie: aliceCookie });
    assert.equal(notes.total, 3);
  });

  await step('选科限制：不能给未选科目建笔记', async () => {
    const blocked = await fetch(`${BASE}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: aliceCookie },
      body: JSON.stringify({ subjectCode: 'bio', topicCode: 'bio-s4-photo', form: 'S4', text: '光合作用是把光能转化为化学能的过程。' }),
    });
    assert.equal(blocked.status, 400);

    const result = await json('/api/notes', {
      method: 'POST',
      cookie: aliceCookie,
      body: {
        subjectCode: 'phy',
        topicCode: 'phy-s4-mech',
        form: 'S4',
        title: '冒烟测试：牛顿第二定律',
        text: '牛顿第二定律的公式是 F = ma。注意质量与重量不同，重量是重力作用下的力，单位是牛顿。例如质量 2 kg 的物体受 10 N 合力，加速度为 5 m/s²。',
      },
    });
    aliceNoteId = result.note.id;
    assert.equal(result.note.isOwner, true);
    assert.ok(result.note.sections.length >= 7);
    const boot = await json('/api/bootstrap', { cookie: aliceCookie });
    assert.equal(boot.recentNotes.length, 1);
    assert.equal(boot.recentNotes[0].id, aliceNoteId);
    assert.equal(boot.recentNotes[0].isSample, false);
  });

  await step('笔记、搜索、导出与人工修订', async () => {
    const detail = await json(`/api/notes/${aliceNoteId}`, { cookie: aliceCookie });
    assert.equal(detail.note.title, '冒烟测试：牛顿第二定律');
    const search = await json(`/api/search?q=${encodeURIComponent('牛顿')}`, { cookie: aliceCookie });
    assert.ok(search.notes.some((note) => note.id === aliceNoteId));
    const exportResponse = await fetch(`${BASE}/api/export`, { headers: { Cookie: aliceCookie } });
    const backup = await exportResponse.json();
    assert.equal(backup.user.username, 'alice_test');
    assert.equal(backup.notes.length, 1);
    const patched = await json(`/api/notes/${aliceNoteId}`, {
      method: 'PATCH',
      cookie: aliceCookie,
      body: { title: '冒烟测试：牛顿第二定律（修订）' },
    });
    assert.equal(patched.note.revision, 2);
  });

  await step('答题记录按用户统计', async () => {
    const questions = await json('/api/questions?subject=phy&limit=5', { cookie: aliceCookie });
    const question = questions.questions[0];
    const first = await json('/api/attempts', {
      method: 'POST',
      cookie: aliceCookie,
      body: { questionId: question.id, response: question.answer, isCorrect: true },
    });
    assert.equal(first.stats.attempts, 1);
    assert.equal(first.stats.accuracy, 100);
  });

  await step('第二个用户：选科独立、数据隔离、语言偏好', async () => {
    const bobSubjects = ['chi', 'eng', 'math', 'csd', 'bio', 'econ', 'm2'];
    const bob = await register('bob_test', 'Bob', bobSubjects);
    assert.equal(bob.data.user.language, 'zh');
    const boot = await json('/api/bootstrap', { cookie: bob.cookie });
    assert.equal(boot.mySubjects.length, 7);
    assert.ok(boot.mySubjects.some((subject) => subject.code === 'm2'));
    const notes = await json('/api/notes', { cookie: bob.cookie });
    assert.equal(notes.notes.some((note) => note.id === aliceNoteId), false);
    const blocked = await fetch(`${BASE}/api/notes/${aliceNoteId}`, { headers: { Cookie: bob.cookie } });
    assert.equal(blocked.status, 404);
    const search = await json(`/api/search?q=${encodeURIComponent('牛顿')}`, { cookie: bob.cookie });
    assert.equal(search.notes.length, 0);
    const settings = await json('/api/settings', {
      method: 'PUT',
      cookie: bob.cookie,
      body: { profile: { name: 'Bob', form: 'S4', goal: '2028 DSE', language: 'en' }, subjects: bobSubjects },
    });
    assert.equal(settings.profile.language, 'en');
    assert.equal(settings.user.language, 'en');
  });

  await step('登出、失效会话与删除', async () => {
    const del = await fetch(`${BASE}/api/notes/${aliceNoteId}`, { method: 'DELETE', headers: { Cookie: aliceCookie } });
    assert.equal(del.status, 200);
    const logout = await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: { Cookie: aliceCookie } });
    assert.equal(logout.status, 200);
    const after = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: aliceCookie } });
    assert.equal(after.status, 401);
    const blockedDelete = await fetch(`${BASE}/api/notes/${aliceNoteId}`, { method: 'DELETE', headers: { Cookie: aliceCookie } });
    assert.equal(blockedDelete.status, 401);
  });

  console.log(`\n通过 ${passed}/8 项测试。\n`);
} catch (error) {
  console.error('\n✗ 测试失败：', error.stack || error.message);
  process.exitCode = 1;
} finally {
  if (child) {
    child.kill();
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  try {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  } catch {
    // Windows 上偶尔仍有文件句柄，忽略清理失败。
  }
}
