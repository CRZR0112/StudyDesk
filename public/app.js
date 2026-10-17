/* 知序 StudyDesk — client application (vanilla ES modules) */

import { applyStaticI18n, getLang, setLang, t, translateDom } from './i18n.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  bootstrap: null,
  user: null,
  catalog: null,
  auth: null,
  authRedirecting: false,
  lang: getLang(),
  route: { path: '/', query: new URLSearchParams() },
  renderSeq: 0,
  capture: { mode: 'text', file: null },
  practice: null,
  filters: {},
  installPrompt: null,
};

const view = $('#view');
const modalRoot = $('#modal-root');
const toastRoot = $('#toast-root');

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
  notes: '<path d="M6 3h9l5 5v13H6z"/><path d="M15 3v5h5"/><path d="M9 12h7M9 16h7"/>',
  bank: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/><path d="M8 7h8M8 11h5"/>',
  subjects: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  wand: '<path d="m4 20 9-9"/><path d="m13 5 1-2 1 2 2 1-2 1-1 2-1-2-2-1z"/><path d="m19 11 .7-1.4L21 9l-1.3-.6L19 7l-.7 1.4L17 9l1.3.6z"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l3 3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  'chevron-right': '<path d="m9 5 7 7-7 7"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/>',
  refresh: '<path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M6.2 9a7 7 0 0 1 11.6-2.7L20 11M4 13l2.2 4.7A7 7 0 0 0 17.8 15"/>',
  video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l2-3.2A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 11h8M8 14h5"/>',
  printer: '<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="9" rx="2"/><path d="M7 17v4h10v-4"/>',
  edit: '<path d="M4 20h4l11-11-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  flame: '<path d="M12 22c4 0 6-2.8 6-6 0-4-3-6-3-9-2 1.5-3 3.5-3 5.5C10.5 10 9 8 9 5c-2 2.5-3 5-3 7.5C6 18 8 22 12 22Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  alert: '<path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5M12 17.5v.1"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
  text: '<path d="M5 6h14M12 6v13M8 19h8"/>',
  upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5a3 3 0 0 0 3-3c0-3.9-3.6-7-8-7Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="10" cy="6.8" r=".8"/><circle cx="14.5" cy="6.8" r=".8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.1"/>',
  external: '<path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M18 13v6H5V6h6"/>',
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3v12H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
  sparkles: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="m19 15 .7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-.9.6-1.5 1.2-1.5 2.4M12 17v.1"/>',
  scale: '<path d="M12 3v18M7 21h10"/><path d="M5 7h14"/><path d="m5 7-3 7h6zM19 7l-3 7h6z"/>',
  book: '<path d="M4 4h7a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H4z"/><path d="M20 4h-3a3 3 0 0 0-3 3v14a3 3 0 0 1 3-3h3z"/>',
};

function svgIcon(name, size = 18) {
  const paths = ICONS[name] || ICONS.info;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}
const icon = (name, size = 18) => svgIcon(name, size);

function hydrateIcons(root = document) {
  $$('[data-icon]', root).forEach((el) => {
    if (el.dataset.hydrated) return;
    el.innerHTML = svgIcon(el.dataset.icon, el.dataset.size ? Number(el.dataset.size) : 18);
    el.dataset.hydrated = '1';
  });
}

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(state.lang === 'en' ? 'en-HK' : 'zh-Hans', { month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch {
    return '';
  }
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return state.lang === 'en' ? 'just now' : '刚刚';
  if (minutes < 60) return state.lang === 'en' ? `${minutes} min ago` : `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return state.lang === 'en' ? `${hours} hr ago` : `${hours} 小时前`;
  const days = Math.round(hours / 24);
  if (days < 30) return state.lang === 'en' ? `${days} days ago` : `${days} 天前`;
  return fmtDate(iso);
};

const colorOf = (subject) => (/^#[0-9a-f]{3,8}$/i.test(subject?.color || '') ? subject.color : '#0d5145');
const stageLabel = (stage) => (stage === 'junior' ? (state.lang === 'en' ? 'Junior' : '初中') : stage === 'senior' ? (state.lang === 'en' ? 'Senior' : '高中') : state.lang === 'en' ? 'S3–S6' : '中三至中六');
const formLabel = (code) => (state.lang === 'en' ? code || '' : ({ S3: '中三', S4: '中四', S5: '中五', S6: '中六' }[code] || code || ''));
const goalYear = () => {
  const goal = state.bootstrap?.settings?.profile?.goal || state.user?.goal || '';
  const match = String(goal).match(/(20\d{2})/);
  return match ? Number(match[1]) : null;
};
const goalOptions = (selected = '') => {
  const current = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, index) => current + index + 1);
  const selectedYear = Number(String(selected).match(/(20\d{2})/)?.[1]);
  if (selectedYear && !years.includes(selectedYear)) years.unshift(selectedYear);
  return `<option value="">未定 / Undecided</option>${years.map((year) => {
    const value = `${year} DSE`;
    return `<option value="${value}" ${value === selected ? 'selected' : ''}>${value}</option>`;
  }).join('')}`;
};
const subjectLabel = (subject) => (state.lang === 'en' ? subject?.nameEn || subject?.name || '' : subject?.name || '');
const subjectNameFor = (code, fallback) => {
  if (state.lang !== 'en') return fallback;
  return state.catalog?.subjects?.find((subject) => subject.code === code)?.nameEn || fallback;
};
const topicLabel = (topic) => (state.lang === 'en' ? topic?.nameEn || topic?.name || '' : topic?.name || '');
const topicNameFor = (note) => (state.lang === 'en' ? note?.topicNameEn || note?.topicName || '' : note?.topicName || '');
const unitLabel = (topic) => (state.lang === 'en' ? topic?.unitEn || topic?.unit || '' : topic?.unit || '');
const notesCountLabel = (count) => (state.lang === 'en' ? `${count} ${count === 1 ? 'note' : 'notes'}` : `${count} 份笔记`);
const originLabel = (q) => `${q.origin}${q.adapted ? ' 改编' : ''}`;
const difficultyDots = (level) =>
  `<span class="difficulty" title="难度 ${level}/5">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= level ? 'on' : ''}"></i>`).join('')}</span>`;

async function api(path, options = {}) {
  const body = options.body && typeof options.body === 'object' ? JSON.stringify(options.body) : options.body;
  const response = await fetch(path, {
    ...options,
    body,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  });
  const type = response.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await response.json() : await response.text();
  if (response.status === 401 && !path.startsWith('/api/auth/')) {
    handleUnauthorized();
    throw new Error('请先登录。');
  }
  if (!response.ok || (data && data.ok === false)) {
    throw new Error((data && data.error) || `请求失败（${response.status}）`);
  }
  return data;
}

function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'is-error' : type === 'success' ? 'is-success' : ''}`;
  el.innerHTML = `${icon(type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info', 16)}<span>${esc(message)}</span>`;
  toastRoot.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => el.remove(), 320);
  }, 3600);
}

function emptyState({ iconName = 'notes', title, text, action = '' }) {
  return `<div class="empty"><div class="empty-icon">${icon(iconName, 23)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
}

function errorState(error) {
  return `<div class="error-state"><div class="error-code">!</div><h2>这一步没有走通</h2><p>${esc(error.message || error)}</p><button class="btn btn-soft" data-action="reload-page">${icon('refresh', 16)}重新加载</button></div>`;
}

function loadingState(label = '正在整理…') {
  return `<div class="loading-inline"><span class="spinner"></span>${esc(label)}</div>`;
}

/* ---------------- authentication ---------------- */

function defaultAuthSelection(form) {
  if (!state.catalog) return new Set();
  if (form === 'S3') return new Set(state.catalog.juniorSubjects || []);
  return new Set(state.catalog.coreByForm?.[form] || []);
}

function subjectByCode(code) {
  return state.catalog?.subjects?.find((subject) => subject.code === code);
}

function authSubjectGroups(form) {
  const coreCodes = state.catalog?.coreByForm?.[form] || [];
  const core = coreCodes.map(subjectByCode).filter(Boolean);
  if (form === 'S3') {
    const junior = state.catalog?.juniorSubjects || [];
    return {
      core,
      electives: junior
        .filter((code) => !coreCodes.includes(code))
        .map(subjectByCode)
        .filter(Boolean),
    };
  }
  return {
    core,
    electives: (state.catalog?.electives || []).map(subjectByCode).filter(Boolean),
  };
}

function authSubjectCard(subject, { locked = false, selected = false } = {}) {
  return `<button type="button" class="auth-subject ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}" data-auth-subject="${esc(subject.code)}" ${locked ? 'data-locked="1"' : ''} aria-pressed="${selected}">
    <span class="auth-subject-glyph" style="--subject-color:${colorOf(subject)}">${esc(subject.glyph || subject.name.slice(0, 1))}</span>
    <span class="auth-subject-copy"><strong>${esc(subjectLabel(subject))}</strong><small>${esc(state.lang === 'en' ? subject.name : subject.nameEn || '')}</small></span>
    <span class="auth-subject-check">${selected ? icon('check', 14) : (locked ? icon('lock', 12) : icon('plus', 13))}</span>
  </button>`;
}

async function showAuth(mode = 'login') {
  state.bootstrap = null;
  state.user = null;
  state.authRedirecting = false;
  document.body.classList.add('auth-mode');
  document.body.classList.remove('sidebar-open');
  if (!state.catalog) {
    view.innerHTML = loadingState('正在准备登录…');
    try {
      const catalog = await api('/api/catalog');
      state.catalog = {
        ...catalog,
        subjects: (catalog.subjects || []).map((subject) => ({
          ...subject,
          nameEn: subject.nameEn || subject.name_en || '',
          officialUrl: subject.officialUrl || subject.official_url || '',
        })),
      };
    } catch (error) {
      view.innerHTML = errorState(error);
      return;
    }
  }
  const legacy = state.catalog?.legacyProfile || {};
  const form = ['S3', 'S4', 'S5', 'S6'].includes(legacy.form) ? legacy.form : 'S4';
  state.auth = {
    mode,
    step: 1,
    form,
    selected: defaultAuthSelection(form),
    draft: {
      username: '',
      displayName: legacy.name && legacy.name !== '同学' ? legacy.name : '',
      goal: legacy.goal || '2027 DSE',
    },
    error: '',
    busy: false,
  };
  renderAuth();
}

function authErrorMarkup() {
  return state.auth?.error ? `<div class="auth-error" role="alert">${icon('alert', 15)}<span>${esc(state.auth.error)}</span></div>` : '';
}

function renderAuth() {
  const auth = state.auth;
  if (!auth) return;
  const catalog = state.catalog;
  const isRegister = auth.mode === 'register';
  const isRecover = auth.mode === 'recover';
  const step = auth.step;
  view.innerHTML = `<div class="auth-page">
    <section class="auth-brand-panel">
      <div class="auth-brand-top">
        <span class="brand-mark">知</span>
        <div class="brand-copy"><strong>知序</strong><small>STUDYDESK</small></div>
      </div>
      <div class="auth-brand-copy">
        <span class="eyebrow" style="color:#d9bd85">DSE · S3–S6 · LOCAL FIRST</span>
        <h1>把今天的输入，<br /><em>变成考场的输出。</em></h1>
        <p>整理笔记、建立自己的知识库，按选科组织每一份复习材料。每个账号的笔记与设置独立保存。</p>
        <div class="auth-benefits">
          <div>${icon('notes', 16)}<span>文字 / 文件 / 图片 OCR</span></div>
          <div>${icon('sparkles', 16)}<span>结构化概念、重点与闪卡</span></div>
          <div>${icon('lock', 16)}<span>本地 SQLite，账号隔离</span></div>
        </div>
      </div>
      <div class="auth-brand-foot">香港 DSE · 中三至中六 · v${esc(state.bootstrap?.version || '0.3.3')}</div>
    </section>
    <section class="auth-panel">
      <div class="auth-panel-inner">
        <button class="auth-lang" type="button" data-action="toggle-lang">${state.lang === 'en' ? '中文' : 'EN'}</button>
        <div class="auth-tabs">
          <button type="button" class="${auth.mode === 'login' ? 'is-active' : ''}" data-auth-mode="login">登录</button>
          <button type="button" class="${isRegister ? 'is-active' : ''}" data-auth-mode="register">注册</button>
        </div>
        ${authErrorMarkup()}
        ${isRecover ? renderRecoverForm() : !isRegister ? renderLoginForm() : step === 1 ? renderRegisterStepOne() : renderRegisterStepTwo(catalog)}
        <p class="auth-footnote">${isRecover ? '恢复码只在本地校验；重置后旧密码和旧会话立即失效。' : isRegister ? '注册后可在「设置」中修改年级、选科与界面语言。' : '首次使用？先创建一个账号；原有示范笔记会保留。'}</p>
      </div>
    </section>
  </div>`;
  hydrateIcons(view);
  bindAuthEvents();
  translateDom(view);
  applyStaticI18n();
  updateLangLabel();
}

function renderLoginForm() {
  return `<form id="login-form" class="auth-form" novalidate>
    <div class="auth-form-head"><span class="eyebrow">WELCOME BACK</span><h2>登录你的学习台</h2><p>账号只保存在这台电脑的 SQLite 数据库里。</p></div>
    <div class="field"><label for="login-username">用户名</label><input id="login-username" name="username" autocomplete="username" value="${esc(state.auth.loginUsername || '')}" placeholder="例如：anni2027" required /></div>
    <div class="field"><label for="login-password">密码</label><input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="至少 6 位" required /></div>
    <button class="btn btn-primary btn-block auth-submit" type="submit" ${state.auth.busy ? 'disabled' : ''}>${state.auth.busy ? '<span class="spinner"></span>正在登录…' : `${icon('arrow-right', 16)} 登录`}</button>
    <button class="auth-forgot" type="button" data-auth-forgot>忘记密码 / 用户名？</button>
  </form>`;
}

function renderRecoverForm() {
  return `<form id="recover-form" class="auth-form" novalidate>
    <div class="auth-form-head"><span class="eyebrow">ACCOUNT RECOVERY</span><h2>用恢复码找回账号</h2><p>恢复码在注册成功时显示，也可登录后在「设置 → 账号安全」重新生成。它会同时定位用户名。</p></div>
    <div class="field"><label for="recover-code">恢复码</label><input id="recover-code" name="code" placeholder="ZD-XXXX-XXXXXXXX" autocomplete="off" required /></div>
    <div class="form-row">
      <div class="field"><label for="recover-password">新密码</label><input id="recover-password" name="password" type="password" autocomplete="new-password" placeholder="至少 6 位" required /></div>
      <div class="field"><label for="recover-confirm">确认新密码</label><input id="recover-confirm" name="confirm" type="password" autocomplete="new-password" placeholder="再次输入" required /></div>
    </div>
    <button class="btn btn-primary btn-block auth-submit" type="submit" ${state.auth.busy ? 'disabled' : ''}>${state.auth.busy ? '<span class="spinner"></span>正在重置…' : `${icon('refresh', 16)} 重置密码`}</button>
    <button class="auth-back" type="button" data-auth-mode="login">返回登录</button>
  </form>`;
}

function renderRegisterStepOne() {
  const d = state.auth.draft;
  const forms = ['S3', 'S4', 'S5', 'S6'];
  return `<form id="register-step1" class="auth-form" novalidate>
    <div class="auth-form-head"><span class="eyebrow">CREATE ACCOUNT · 1 / 2</span><h2>先建立你的账号</h2><p>下一步选择你实际修读的科目。</p></div>
    <div class="form-row">
      <div class="field"><label for="reg-username">用户名</label><input id="reg-username" name="username" autocomplete="username" value="${esc(d.username)}" placeholder="3–24 位英文 / 数字" required /></div>
      <div class="field"><label for="reg-display">显示名称</label><input id="reg-display" name="displayName" value="${esc(d.displayName)}" placeholder="例如：阿明" maxlength="40" required /></div>
    </div>
    <div class="form-row">
      <div class="field"><label for="reg-password">密码</label><input id="reg-password" name="password" type="password" autocomplete="new-password" placeholder="至少 6 位" required /></div>
      <div class="field"><label for="reg-confirm">确认密码</label><input id="reg-confirm" name="confirm" type="password" autocomplete="new-password" placeholder="再输入一次" required /></div>
    </div>
    <div class="form-row">
      <div class="field"><label for="reg-form">年级</label><select id="reg-form" name="form">${forms.map((form) => `<option value="${form}" ${state.auth.form === form ? 'selected' : ''}>${formLabel(form)}</option>`).join('')}</select></div>
      <div class="field"><label for="reg-goal">目标 DSE 年份</label><select id="reg-goal" name="goal">${goalOptions(d.goal)}</select></div>
    </div>
    <input type="hidden" name="language" value="${state.lang}" />
    <button class="btn btn-primary btn-block auth-submit" type="submit">${icon('arrow-right', 16)} 下一步：选择科目</button>
  </form>`;
}

function renderRegisterStepTwo(catalog) {
  const form = state.auth.form;
  const { core, electives } = authSubjectGroups(form);
  const selectedElectives = electives.filter((subject) => state.auth.selected.has(subject.code)).length;
  return `<form id="register-step2" class="auth-form" novalidate>
    <div class="auth-form-head"><span class="eyebrow">CREATE ACCOUNT · 2 / 2</span><h2>你修读哪些科目？</h2><p>${form === 'S3' ? '中三以核心科为主，可保留你学校有开的科目。' : '核心科已锁定；选修科请选择 2–5 门，M1 / M2 也在列表中。'}</p></div>
    <div class="auth-step-summary"><span class="badge">${formLabel(form)}</span><span>${esc(state.auth.draft.displayName || state.auth.draft.username || '新同学')}</span><button type="button" class="auth-back" data-auth-back>${icon('edit', 12)} 修改资料</button></div>
    <div class="auth-subject-section"><div class="auth-subject-label"><strong>核心科目</strong><span>必修，自动加入</span></div><div class="auth-subject-grid">${core.map((subject) => authSubjectCard(subject, { locked: true, selected: true })).join('')}</div></div>
    <div class="auth-subject-section"><div class="auth-subject-label"><strong>${form === 'S3' ? '学校科目' : '选修科目'}</strong><span>${form === 'S3' ? '至少保留 3 科总计' : `已选 ${selectedElectives} / 2–5 门`}</span></div><div class="auth-subject-grid">${electives.map((subject) => authSubjectCard(subject, { selected: state.auth.selected.has(subject.code) })).join('')}</div></div>
    <div class="auth-actions-row"><button type="button" class="btn btn-ghost" data-auth-back>${icon('arrow-right', 14)} 上一步</button><button class="btn btn-primary" type="submit" ${state.auth.busy ? 'disabled' : ''}>${state.auth.busy ? '<span class="spinner"></span>正在创建…' : `${icon('check', 15)} 创建账号`}</button></div>
  </form>`;
}

function bindAuthEvents() {
  $$('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      state.auth.mode = button.dataset.authMode;
      state.auth.step = 1;
      state.auth.error = '';
      renderAuth();
    });
  });
  $$('[data-auth-forgot]').forEach((button) => {
    button.addEventListener('click', () => showAuth('recover'));
  });

  const loginForm = $('#login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.auth.busy) return;
      const fd = new FormData(loginForm);
      const username = String(fd.get('username') || '').trim();
      const password = String(fd.get('password') || '');
      if (!username || !password) {
        state.auth.error = '请输入用户名和密码。';
        renderAuth();
        return;
      }
      state.auth.busy = true;
      state.auth.error = '';
      renderAuth();
      try {
        const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        await completeAuth(result.user);
      } catch (error) {
        if (!state.auth) {
          toast(error.message, 'error');
          await showAuth('login');
          return;
        }
        state.auth.busy = false;
        state.auth.error = error.message;
        renderAuth();
      }
    });
  }

  const step1 = $('#register-step1');
  if (step1) {
    step1.addEventListener('submit', (event) => {
      event.preventDefault();
      const fd = new FormData(step1);
      const draft = {
        username: String(fd.get('username') || '').trim().toLowerCase(),
        displayName: String(fd.get('displayName') || '').trim(),
        password: String(fd.get('password') || ''),
        confirm: String(fd.get('confirm') || ''),
        goal: String(fd.get('goal') || '').trim(),
        form: String(fd.get('form') || 'S4'),
      };
      if (!/^[a-z0-9_-]{3,24}$/.test(draft.username)) {
        state.auth.error = '用户名需为 3–24 位英文、数字、下划线或连字符。';
        renderAuth();
        return;
      }
      if (!draft.displayName) {
        state.auth.error = '请填写显示名称。';
        renderAuth();
        return;
      }
      if (draft.password.length < 6) {
        state.auth.error = '密码至少 6 位。';
        renderAuth();
        return;
      }
      if (draft.password !== draft.confirm) {
        state.auth.error = '两次输入的密码不一致。';
        renderAuth();
        return;
      }
      state.auth.draft = draft;
      state.auth.form = draft.form;
      state.auth.selected = defaultAuthSelection(draft.form);
      state.auth.step = 2;
      state.auth.error = '';
      renderAuth();
    });

    $('#reg-form')?.addEventListener('change', (event) => {
      state.auth.form = event.target.value;
      state.auth.selected = defaultAuthSelection(event.target.value);
    });
  }

  $$('[data-auth-back]').forEach((button) => {
    button.addEventListener('click', () => {
      state.auth.step = 1;
      state.auth.error = '';
      renderAuth();
    });
  });

  $$('[data-auth-subject]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.locked) return;
      const code = button.dataset.authSubject;
      if (state.auth.selected.has(code)) state.auth.selected.delete(code);
      else state.auth.selected.add(code);
      button.classList.toggle('is-selected');
      button.setAttribute('aria-pressed', String(state.auth.selected.has(code)));
      const check = button.querySelector('.auth-subject-check');
      if (check) check.innerHTML = state.auth.selected.has(code) ? icon('check', 14) : icon('plus', 13);
      const counter = $('.auth-subject-label span', button.closest('.auth-subject-section'));
      if (counter && state.auth.form !== 'S3') {
        const { electives } = authSubjectGroups(state.auth.form);
        const count = electives.filter((subject) => state.auth.selected.has(subject.code)).length;
        counter.textContent = state.lang === 'en' ? `${count} of 2–5 selected` : `已选 ${count} / 2–5 门`;
      }
    });
  });

  const step2 = $('#register-step2');
  if (step2) {
    step2.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.auth.busy) return;
      const { core, electives } = authSubjectGroups(state.auth.form);
      const selectedElectives = electives.filter((subject) => state.auth.selected.has(subject.code));
      if (state.auth.form === 'S3') {
        if (state.auth.selected.size < 3) {
          state.auth.error = '中三请至少保留中国语文、英国语文、数学，共 3 科。';
          renderAuth();
          return;
        }
      } else if (selectedElectives.length < 2 || selectedElectives.length > 5) {
        state.auth.error = '请选择 2–5 门选修科（可包括 M1 / M2）。';
        renderAuth();
        return;
      }
      const subjects = [...core.map((subject) => subject.code), ...selectedElectives.map((subject) => subject.code)];
      state.auth.busy = true;
      state.auth.error = '';
      renderAuth();
      try {
        const result = await api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            username: state.auth.draft.username,
            password: state.auth.draft.password,
            displayName: state.auth.draft.displayName,
            form: state.auth.form,
            goal: state.auth.draft.goal,
            language: state.lang,
            subjects,
          }),
        });
        await completeAuth(result.user, result.recoveryCode);
      } catch (error) {
        if (!state.auth) {
          toast(error.message, 'error');
          await showAuth('login');
          return;
        }
        state.auth.busy = false;
        state.auth.error = error.message;
        renderAuth();
      }
    });
  }

  const recoverForm = $('#recover-form');
  if (recoverForm) {
    recoverForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.auth.busy) return;
      const fd = new FormData(recoverForm);
      const password = String(fd.get('password') || '');
      if (password.length < 6) {
        state.auth.error = '新密码至少 6 位。';
        renderAuth();
        return;
      }
      if (password !== String(fd.get('confirm') || '')) {
        state.auth.error = '两次输入的新密码不一致。';
        renderAuth();
        return;
      }
      state.auth.busy = true;
      state.auth.error = '';
      renderAuth();
      try {
        const result = await api('/api/auth/recover', {
          method: 'POST',
          body: { code: String(fd.get('code') || '').trim(), password },
        });
        await showAuth('login');
        state.auth.loginUsername = result.username;
        renderAuth();
        toast(`密码已重置，用户名是 ${result.username}。`, 'success');
        if (result.recoveryCode) showRecoveryCodeModal(result.recoveryCode, '密码已重置，请保存新的恢复码');
      } catch (error) {
        state.auth.busy = false;
        state.auth.error = error.message;
        renderAuth();
      }
    });
  }
}

async function completeAuth(user, recoveryCode = '') {
  state.user = user;
  state.auth = null;
  if (user.language) state.lang = setLang(user.language);
  document.body.classList.remove('auth-mode');
  await loadBootstrap();
  toast(state.lang === 'en' ? `Welcome, ${user.displayName || user.username}.` : `欢迎，${user.displayName || user.username}。`, 'success');
  navigate('/');
  if (recoveryCode) {
    setTimeout(() => showRecoveryCodeModal(recoveryCode, '账号已创建，请保存恢复码'), 350);
  }
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // 即使网络失败也回到登录页；cookie 会在下次请求时失效。
  }
  state.bootstrap = null;
  state.user = null;
  await showAuth('login');
}

function showRecoveryCodeModal(code, title = '保存恢复码') {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal">
    <div class="practice-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}" data-stop="1" style="max-width:420px">
      <div class="practice-top"><span class="badge badge-gold">ACCOUNT RECOVERY</span><span class="spacer"></span><button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon('x', 16)}</button></div>
      <h2 style="margin:14px 0 8px">${esc(title)}</h2>
      <p class="tiny muted">这串恢复码只显示一次。请保存在密码管理器、备忘录或纸上；忘记密码/用户名时用它重置。重新生成会让旧恢复码失效。</p>
      <div class="recovery-code" id="recovery-code-value">${esc(code)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn btn-soft" type="button" data-copy-recovery="${esc(code)}">${icon('copy', 14)} 复制恢复码</button><button class="btn btn-primary" type="button" data-action="close-modal">我已保存</button></div>
    </div>
  </div>`;
  hydrateIcons(modalRoot);
  const copy = modalRoot.querySelector('[data-copy-recovery]');
  if (copy) copy.addEventListener('click', () => copyText(copy.dataset.copyRecovery));
}

function openAccountSecurityModal(mode) {
  const isDelete = mode === 'delete';
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal">
    <div class="practice-modal" role="dialog" aria-modal="true" data-stop="1" style="max-width:440px">
      <div class="practice-top"><span class="badge ${isDelete ? 'badge-gold' : 'badge-blue'}">${isDelete ? 'DELETE ACCOUNT' : 'RECOVERY CODE'}</span><span class="spacer"></span><button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon('x', 16)}</button></div>
      <h2 style="margin:14px 0 8px">${isDelete ? '注销账号' : '生成恢复码'}</h2>
      <p class="tiny muted">${isDelete ? '这会永久删除这个账号的全部笔记、附件、动态与设置，无法恢复；示范笔记和别人账号不受影响。' : '恢复码用于忘记密码或用户名时重置。生成后旧恢复码立即失效。'}</p>
      <form id="security-form">
        <div class="field"><label>当前密码</label><input name="password" type="password" autocomplete="current-password" required /></div>
        ${isDelete ? `<div class="field"><label>输入 DELETE 确认</label><input name="confirm" placeholder="DELETE" autocomplete="off" required /></div>` : ''}
        <div class="auth-error" id="security-error" role="alert" hidden></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn ${isDelete ? 'btn-danger' : 'btn-primary'}" type="submit">${isDelete ? '永久注销' : '生成恢复码'}</button><button class="btn btn-ghost" type="button" data-action="close-modal">取消</button></div>
      </form>
    </div>
  </div>`;
  hydrateIcons(modalRoot);
  const form = modalRoot.querySelector('#security-form');
  const errorBox = modalRoot.querySelector('#security-error');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    const password = String(fd.get('password') || '');
    if (!password) return;
    if (isDelete && String(fd.get('confirm') || '').trim() !== 'DELETE') {
      errorBox.hidden = false;
      errorBox.textContent = '请输入 DELETE 确认。';
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      if (isDelete) {
        await api('/api/auth/account', { method: 'DELETE', body: { password, confirm: 'DELETE' } });
        closeModal();
        state.bootstrap = null;
        state.user = null;
        await showAuth('login');
        toast('账号已注销。');
      } else {
        const result = await api('/api/auth/recovery-code', { method: 'POST', body: { password } });
        closeModal();
        showRecoveryCodeModal(result.recoveryCode);
      }
    } catch (error) {
      errorBox.hidden = false;
      errorBox.textContent = error.message;
      button.disabled = false;
    }
  });
}

function updateLangLabel() {
  const label = $('#lang-label');
  if (label) label.textContent = state.lang === 'en' ? '中文' : 'EN';
  const toggle = $('#lang-toggle');
  if (toggle) toggle.setAttribute('aria-label', state.lang === 'en' ? '切换到中文' : 'Switch to English');
}

async function toggleLanguage() {
  const next = state.lang === 'en' ? 'zh' : 'en';
  state.lang = setLang(next);
  updateLangLabel();
  applyStaticI18n();
  if (state.user) {
    try {
      await api('/api/settings', { method: 'PUT', body: JSON.stringify({ profile: { language: next } }) });
    } catch {
      // 语言先在本机生效；下次保存设置时再同步。
    }
    if (state.bootstrap) {
      await loadBootstrap();
      await renderRoute();
    }
    return;
  }
  if (state.auth) {
    renderAuth();
  } else {
    await showAuth('login');
  }
}

/* ---------------- boot ---------------- */

function initSupportWidget() {
  const widget = document.getElementById('support-widget');
  const toggle = document.getElementById('support-toggle');
  const panel = document.getElementById('support-panel');
  const close = document.getElementById('support-close');
  const copy = document.getElementById('support-copy');
  if (!widget || !toggle || !panel) return;
  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    widget.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  close?.addEventListener('click', () => setOpen(false));
  copy?.addEventListener('click', () => copyText('Rzcr0112', '微信号已复制，去微信添加。'));
  document.addEventListener('click', (event) => {
    if (!panel.hidden && !widget.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
  });
}

async function init() {
  const queryLang = new URLSearchParams(location.search).get('lang');
  if (queryLang === 'en' || queryLang === 'zh') state.lang = setLang(queryLang);
  hydrateIcons();
  bindGlobalEvents();
  initSupportWidget();
  registerServiceWorker();
  setLang(state.lang);
  applyStaticI18n();
  updateLangLabel();
  try {
    const me = await fetchAuthMe();
    if (!me) {
      await showAuth('login');
      return;
    }
    state.user = me.user;
    if (me.user.language) state.lang = setLang(me.user.language);
    document.body.classList.remove('auth-mode');
    await loadBootstrap();
    await renderRoute();
  } catch (error) {
    view.innerHTML = errorState(error);
  }
}

async function fetchAuthMe() {
  const response = await fetch('/api/auth/me');
  if (response.status === 401) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '无法读取登录状态。');
  return data;
}

async function handleUnauthorized() {
  if (state.authRedirecting) return;
  state.authRedirecting = true;
  try {
    await showAuth('login');
  } finally {
    state.authRedirecting = false;
  }
}

async function loadBootstrap() {
  const data = await api('/api/bootstrap');
  const normalizeSubject = (subject) => ({
    ...subject,
    nameEn: subject.nameEn || subject.name_en || '',
    officialUrl: subject.officialUrl || subject.official_url || '',
  });
  data.subjects = (data.subjects || []).map(normalizeSubject);
  data.mySubjects = (data.mySubjects || []).map(normalizeSubject);
  const subjectByCode = new Map(data.subjects.map((subject) => [subject.code, subject]));
  data.mySubjects = data.mySubjects.map((selected) => ({
    ...(subjectByCode.get(selected.code) || {}),
    ...selected,
    nameEn: selected.nameEn || subjectByCode.get(selected.code)?.nameEn || '',
    topics: subjectByCode.get(selected.code)?.topics || [],
  }));
  state.bootstrap = data;
  state.user = data.user;
  state.catalog = {
    subjects: data.subjects,
    forms: data.forms,
    coreByForm: data.coreByForm,
    electives: data.electives,
    juniorSubjects: data.juniorSubjects,
  };
  renderSidebar();
  updateStatus();
  applyStaticI18n();
  translateDom(document);
}

function renderSidebar() {
  const b = state.bootstrap;
  if (!b) return;
  const mySubjects = b.mySubjects?.length ? b.mySubjects : b.subjects;
  const subjects = mySubjects.slice(0, 8);
  $('#sidebar-subjects').innerHTML = subjects
    .map(
      (subject) =>
        `<a class="sidebar-subject" href="#/subjects/${esc(subject.code)}" style="--subject-color:${colorOf(subject)}">
          <span class="dot"></span><span>${esc(subjectLabel(subject))}</span><span class="count">${subject.noteCount || ''}</span>
        </a>`,
    )
    .join('');
  const profile = b.settings.profile;
  $('#sidebar-name').textContent = profile.name;
  $('#sidebar-form').textContent = `${formLabel(profile.form)} · ${profile.goal}`;
  $('#sidebar-avatar').textContent = (profile.name || '同').slice(0, 1);
  const topAvatar = $('#topbar-avatar');
  topAvatar.textContent = (profile.name || '同').slice(0, 1);
  const dse = nextDse();
  $('#countdown-card').innerHTML = `
    <span class="countdown-eyebrow">DSE COUNTDOWN</span>
    <div class="countdown-main"><strong>${dse.days}</strong><span>${state.lang === 'en' ? 'days' : '天'}</span></div>
    <p>${state.lang === 'en' ? (dse.past ? `${dse.year} DSE has started` : `${dse.year} DSE expected start`) : (dse.past ? `${dse.year} DSE 已开考` : `距离 ${dse.year} DSE 预计开考`)}</p>`;
}

function updateStatus() {
  const b = state.bootstrap;
  if (!b) return;
  const el = $('#ocr-status');
  if (b.features.ocr) {
    el.hidden = false;
  } else {
    el.hidden = true;
  }
  if (b.features.ai) {
    el.innerHTML = `<span class="status-dot"></span>AI 增强已开启`;
  } else {
    el.innerHTML = `<span class="status-dot"></span>OCR 就绪`;
  }
}

function nextDse() {
  const now = new Date();
  const selected = goalYear();
  let year = selected;
  if (!year) {
    year = now.getFullYear();
    if (now > new Date(year, 4, 15)) year += 1;
  }
  const target = new Date(year, 3, 1);
  const days = Math.max(0, Math.ceil((target - now) / 86400000));
  return { year, days, past: target < now };
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.installPrompt = event;
    const button = $('#install-btn');
    if (button) button.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    toast('已安装到桌面，可像 App 一样打开。', 'success');
  });
}

/* ---------------- routing ---------------- */

function parseRoute() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, queryString] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(queryString || '') };
}

function navigate(path) {
  if (`#${path}` === location.hash) {
    renderRoute();
  } else {
    location.hash = path;
  }
}

function setActiveNav(path) {
  if (path.startsWith('/capture')) {
    $$('[data-nav]').forEach((el) => el.classList.remove('is-active'));
    return;
  }
  const key = path.startsWith('/notes') || path.startsWith('/note/') ? 'notes' : path.startsWith('/subjects') ? 'subjects' : path.startsWith('/settings') ? 'settings' : 'dashboard';
  $$('[data-nav]').forEach((el) => el.classList.toggle('is-active', el.dataset.nav === key));
}

async function renderRoute() {
  const seq = ++state.renderSeq;
  const route = parseRoute();
  state.route = route;
  setActiveNav(route.path);
  document.body.classList.remove('sidebar-open');
  view.innerHTML = loadingState('正在加载…');
  window.scrollTo({ top: 0, behavior: 'instant' });
  try {
    if (route.path === '/') await renderDashboard(seq);
    else if (route.path === '/notes') await renderNotes(seq, route.query);
    else if (/^\/notes\/\d+$/.test(route.path)) await renderNoteDetail(seq, Number(route.path.split('/')[2]));
    else if (route.path === '/capture') await renderCapture(seq, route.query);
    else if (route.path === '/questions') { navigate('/notes'); return; }
    else if (route.path === '/subjects') await renderSubjects(seq, route.query);
    else if (/^\/subjects\/[a-z0-9-]+$/.test(route.path)) await renderSubjectDetail(seq, route.path.split('/')[2]);
    else if (route.path === '/search') await renderSearch(seq, route.query);
    else if (route.path === '/settings') await renderSettings(seq);
    else view.innerHTML = errorState(new Error('这个页面不存在，可能链接已经过期。'));
  } catch (error) {
    console.error('[renderRoute]', error);
    if (seq === state.renderSeq) view.innerHTML = errorState(error);
  }
  if (seq === state.renderSeq) {
    hydrateIcons(view);
    translateDom(view);
    applyStaticI18n();
    updateLangLabel();
  }
}

/* ---------------- shared cards ---------------- */

function subjectTag(subject) {
  return `<span class="subject-tag" style="--subject-color:${colorOf(subject)}">${esc(subjectLabel(subject))}</span>`;
}

function noteCard(note) {
  const color = note.subjectColor || '#0d5145';
  return `<a class="note-card" href="#/notes/${note.id}" style="--subject-color:${color}">
    <div class="note-card-top">
      <span class="subject-tag" style="--subject-color:${color}">${esc(subjectNameFor(note.subjectCode, note.subjectName))}</span>
      <span class="note-badges">${note.isSample ? `<span class="badge badge-blue">${t('示范')}</span>` : ''}<span class="badge badge-muted">${esc(formLabel(note.form))}</span></span>
    </div>
    <h3>${esc(note.title)}</h3>
    <p>${esc(note.summary || '暂无摘要')}</p>
    <div class="note-card-foot">
      <span>${esc(topicNameFor(note) || '综合')}</span>
      <span class="dot-sep"></span>
      <span>${fmtDate(note.updatedAt)}</span>
      <span class="coverage-pill"><i style="--coverage:${note.coverage || 0}%"></i>${note.coverage || 0}%</span>
    </div>
  </a>`;
}

function subjectCard(subject) {
  return `<a class="subject-card ${subject.stage === 'junior' ? 'is-junior' : ''}" href="#/subjects/${esc(subject.code)}" data-glyph="${esc(subject.glyph || '知')}" style="--subject-color:${colorOf(subject)}">
    <div class="subject-glyph">${esc(subject.glyph || '知')}</div>
    <h3>${esc(subjectLabel(subject))}</h3>
    <p>${esc(state.lang === 'en' ? subject.descriptionEn || subject.description : subject.description || '')}</p>
    <div class="subject-card-foot">
      <span>${subject.topics.length} 个课题</span><span class="dot-sep"></span><span>${subject.questionCount} 题</span>
      <span class="arrow">${icon('arrow-right', 15)}</span>
    </div>
  </a>`;
}

function questionCard(question) {
  return `<article class="question-card">
    <div class="question-source">
      <span class="origin">${esc(question.origin)}</span>
      <span class="year">${esc(question.year)}</span>
    </div>
    <div class="question-main">
      <h3>${esc(question.stem)}</h3>
      <div class="question-meta">
        ${subjectTag({ name: question.subjectName, nameEn: subjectNameFor(question.subjectCode, question.subjectName), color: question.subjectColor })}
        <span>${esc(question.topicName || '')}</span>
        <span>${esc(question.paper || '')}</span>
        <span>${question.marks} 分</span>
        ${question.adapted ? '<span class="badge badge-gold">改编</span>' : '<span class="badge badge-blue">原卷风格</span>'}
      </div>
    </div>
    <div class="question-side">
      ${difficultyDots(question.difficulty)}
      <button class="btn btn-sm btn-soft" data-action="practice" data-id="${question.id}">练习</button>
    </div>
  </article>`;
}

function dseCountdownCard() {
  return '';
}

/* ---------------- dashboard ---------------- */

async function renderDashboard(seq) {
  const b = state.bootstrap;
  const stats = b.stats;
  const profile = b.settings.profile;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早晨' : hour < 18 ? '午安' : '晚上好';
  const dse = nextDse();
  const recent = b.recentNotes || [];
  const features = (b.mySubjects?.length ? b.mySubjects : b.subjects).slice(0, 8);
  view.innerHTML = `
    <section class="dash-hero">
      <div class="hero-main">
        <div>
          <div class="hero-top">
            <span class="hero-kicker">${icon('sparkles', 12)} DSE · S3–S6</span>
            <span class="hero-kicker">${icon('clock', 12)} ${dse.days} 天后开考</span>
          </div>
          <h1>${greeting}，${esc(profile.name)}。<br />把今天的输入，<em>变成考场的输出。</em></h1>
          <p class="hero-lede">粘贴一段笔记、上传讲义 PDF，或直接拍下课本——知序会替你拆成概念、重点、公式、易错点与自测闪卡，整理成一份可以直接温习的结构。</p>
        </div>
        <div class="hero-bottom">
          <a class="hero-cta" href="#/capture">${icon('wand', 17)} 整理一份新材料</a>
          <div class="hero-mini"><strong>${stats.notes}</strong><span>份已整理笔记</span></div>
          <div class="hero-mini"><strong>${stats.subjects}</strong><span>个已覆盖学科</span></div>
        </div>
      </div>
      <div class="hero-capture">
        <div class="capture-head">
          <div>
            <span class="eyebrow">QUICK CAPTURE</span>
            <h2>从哪里开始？</h2>
            <p>选择一种输入方式，30 秒得到结构。</p>
          </div>
          ${icon('wand', 22)}
        </div>
        <div class="capture-tiles">
          <a class="capture-tile" href="#/capture?mode=text">
            <span class="tile-icon">${icon('text', 17)}</span>
            <strong>粘贴文字</strong>
            <span>课堂笔记、网上资料</span>
          </a>
          <a class="capture-tile" href="#/capture?mode=file">
            <span class="tile-icon">${icon('file', 17)}</span>
            <strong>上传文件</strong>
            <span>PDF / DOCX / PPTX</span>
          </a>
          <a class="capture-tile" href="#/capture?mode=image">
            <span class="tile-icon">${icon('image', 17)}</span>
            <strong>拍下图片</strong>
            <span>OCR 自动识字</span>
          </a>
        </div>
        <div class="quick-subjects">
          <div class="quick-subjects-head"><span>按学科开始</span><a href="#/subjects">${t('全部学科')} →</a></div>
          <div class="quick-subject-row">
            ${features.map((s) => `<a class="quick-subject" style="--subject-color:${colorOf(s)}" href="#/capture?subject=${esc(s.code)}">${esc(subjectLabel(s))}</a>`).join('')}
          </div>
        </div>
      </div>
    </section>

    ${b.network?.primary && ['127.0.0.1', 'localhost', '::1'].includes(location.hostname) ? `<div class="lan-hint">
      <span class="lan-hint-icon">${icon('external', 15)}</span>
      <div><strong>手机 / 平板也能用</strong><span>连同一个 Wi-Fi，打开 <code>${esc(b.network.primary)}</code></span></div>
      <button class="btn btn-sm btn-soft" data-action="copy-lan" data-url="${esc(b.network.primary)}">复制地址</button>
    </div>` : ''}

    <section class="stat-grid">
      <div class="stat-card"><div class="stat-top"><span>已整理笔记</span>${icon('notes', 16)}</div><div class="stat-value">${stats.notes}<small>${state.lang === 'en' ? '' : '份'}</small></div><div class="stat-foot">覆盖 ${stats.subjects} 个学科</div></div>
      <div class="stat-card"><div class="stat-top"><span>学科覆盖</span>${icon('subjects', 16)}</div><div class="stat-value">${stats.subjects}<small>${state.lang === 'en' ? '' : '个'}</small></div><div class="stat-foot">按你的选科建立</div></div>
      <div class="stat-card"><div class="stat-top"><span>平均完整度</span>${icon('target', 16)}</div><div class="stat-value">${stats.avgCoverage || 0}<small>%</small></div><div class="stat-foot">概念、重点、闪卡的覆盖程度</div></div>
      <div class="stat-card"><div class="stat-top"><span>连续整理</span>${icon('flame', 16)}</div><div class="stat-value">${stats.streak || 0}<small>${state.lang === 'en' ? (stats.streak === 1 ? 'day' : 'days') : '天'}</small></div><div class="stat-foot">把输入变成复习材料</div></div>
    </section>

    <div class="content-grid">
      <section>
        <div class="section-head">
          <div><h2>继续整理</h2><p>最近更新的笔记，接着上次的脉络往下走。</p></div>
          <a class="link-more" href="#/notes">全部笔记 ${icon('arrow-right', 13)}</a>
        </div>
        ${recent.length ? `<div class="note-grid">${recent.map(noteCard).join('')}</div>` : emptyState({ iconName: 'notes', title: '还没有笔记', text: '从一段课堂笔记开始，知序会替你整理成可复习的结构。', action: '<a class="btn btn-primary btn-sm" href="#/capture">整理第一份</a>' })}
        <div class="section-head">
          <div><h2>按学科进入</h2><p>每个学科都是独立模块，课题可随考纲继续扩展。</p></div>
          <a class="link-more" href="#/subjects">全部学科 ${icon('arrow-right', 13)}</a>
        </div>
        <div class="subject-grid">${features.slice(0, 8).map(subjectCard).join('')}</div>
      </section>
      <aside class="side-stack">
        <div class="daily-card">
          <div class="daily-head"><span>STUDY FOCUS · 今日复习</span><span class="badge">${recent[0] ? esc(formLabel(recent[0].form)) : 'START'}</span></div>
          <h3>${recent[0] ? esc(recent[0].title) : '从第一份笔记开始'}</h3>
          <p class="rail-empty" style="margin:8px 0 0">${recent[0] ? esc(recent[0].summary || '回到最近整理的笔记，先遮住闪卡回忆一遍。') : '把今天的课堂笔记、讲义或课本照片整理成一份可复习的结构。'}</p>
          <a class="btn btn-primary btn-block" style="margin-top:14px" href="${recent[0] ? `#/notes/${recent[0].id}` : '#/capture'}">${recent[0] ? '继续阅读' : '整理第一份'}</a>
        </div>
        <div class="activity-card">
          <h3>最近动态</h3>
          <div class="activity-list">
            ${(b.activity || []).slice(0, 5).map((item) => `<div class="activity-item"><span class="activity-dot"></span><div><strong>${esc(item.title)}</strong><span>${timeAgo(item.created_at || item.createdAt)}</span></div></div>`).join('') || '<p class="rail-empty">还没有动态。</p>'}
          </div>
        </div>
      </aside>
    </div>`;
  hydrateIcons(view);
}

/* ---------------- notes library ---------------- */

async function renderNotes(seq, query) {
  const subject = query.get('subject') || '';
  const form = query.get('form') || '';
  const q = query.get('q') || '';
  const scope = ['mine', 'samples', 'all'].includes(query.get('scope')) ? query.get('scope') : 'mine';
  const data = await api(`/api/notes?limit=60&scope=${encodeURIComponent(scope)}&subject=${encodeURIComponent(subject)}&form=${encodeURIComponent(form)}&q=${encodeURIComponent(q)}`);
  if (seq !== state.renderSeq) return;
  const subjects = state.bootstrap.mySubjects?.length ? state.bootstrap.mySubjects : state.bootstrap.subjects;
  view.innerHTML = `
    <div class="page-head">
      <div><span class="eyebrow">NOTE LIBRARY</span><h1 class="page-title">笔记库</h1><p class="page-sub">所有整理结果都在这里。按学科、年级或关键词筛选，随时回到某一条脉络。</p></div>
      <a class="btn btn-primary" href="#/capture">${icon('plus', 16)} 整理新笔记</a>
    </div>
    <div class="segmented" style="margin-bottom:12px">
      <a href="#/notes?scope=mine" class="${scope === 'mine' ? 'is-active' : ''}">我的笔记</a>
      <a href="#/notes?scope=samples" class="${scope === 'samples' ? 'is-active' : ''}">示范笔记</a>
      <a href="#/notes?scope=all" class="${scope === 'all' ? 'is-active' : ''}">全部</a>
    </div>
    <form class="filter-bar" id="notes-filter">
      <input type="hidden" name="scope" value="${esc(scope)}" />
      <label class="search-inline">${icon('search', 15)}<input name="q" value="${esc(q)}" placeholder="搜索标题、摘要、关键词…" /></label>
      <select name="subject" aria-label="学科">
        <option value="">全部学科</option>
        ${subjects.map((s) => `<option value="${esc(s.code)}" ${s.code === subject ? 'selected' : ''}>${esc(subjectLabel(s))}</option>`).join('')}
      </select>
      <select name="form" aria-label="年级">
        <option value="">全部年级</option>
        ${['S3', 'S4', 'S5', 'S6'].map((f) => `<option value="${f}" ${f === form ? 'selected' : ''}>${formLabel(f)}</option>`).join('')}
      </select>
      <button class="btn btn-soft btn-sm" type="submit">筛选</button>
      <span class="result-count">${data.total} 份笔记</span>
    </form>
    ${data.notes.length ? `<div class="note-grid">${data.notes.map(noteCard).join('')}</div>` : emptyState({ iconName: 'notes', title: scope === 'mine' ? '你还没有自己的笔记' : '没有匹配的笔记', text: scope === 'mine' ? '从一段课堂笔记开始；系统预置的示范笔记在「示范笔记」里。' : '换个关键词或清除筛选；也可以直接整理一份新的材料。', action: '<a class="btn btn-primary btn-sm" href="#/capture">整理新笔记</a>' })}
  `;
  $('#notes-filter').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    if (formData.get('q')) params.set('q', formData.get('q').trim());
    if (formData.get('subject')) params.set('subject', formData.get('subject'));
    if (formData.get('form')) params.set('form', formData.get('form'));
    params.set('scope', String(formData.get('scope') || 'mine'));
    navigate(`/notes?${params}`);
  });
}

/* ---------------- subjects ---------------- */

async function renderSubjects(seq, query) {
  const stage = query.get('stage') || 'all';
  const subjects = state.bootstrap.subjects.filter((s) => (stage === 'junior' ? s.stage !== 'senior' : stage === 'senior' ? s.stage !== 'junior' : true));
  view.innerHTML = `
    <div class="page-head">
      <div><span class="eyebrow">SUBJECT MODULES</span><h1 class="page-title">学科模块</h1><p class="page-sub">16 个学科、174 个课题，按中三至中六分年级组织。每个模块独立整理笔记，可随考纲继续扩充。</p></div>
    </div>
    <div class="segmented" style="margin-bottom:18px">
      <a href="#/subjects?stage=all" class="${stage === 'all' ? 'is-active' : ''}">全部</a>
      <a href="#/subjects?stage=junior" class="${stage === 'junior' ? 'is-active' : ''}">初中 S3</a>
      <a href="#/subjects?stage=senior" class="${stage === 'senior' ? 'is-active' : ''}">高中 S4–S6</a>
    </div>
    <div class="subject-grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${subjects.map(subjectCard).join('')}</div>
    <div class="section-head"><div><h2>官方资源入口</h2><p>需要原文与评卷参考时，以考评局发布为准。</p></div></div>
    <div class="settings-card">
      <div class="resource-list">
        ${state.bootstrap.officialResources.map((r) => `<a class="resource-item" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer"><span class="resource-main"><strong>${esc(r.label)}</strong><span>${esc(r.note)}</span></span>${icon('external', 16)}</a>`).join('')}
      </div>
    </div>`;
}

async function renderSubjectDetail(seq, code) {
  const subject = state.bootstrap.subjects.find((s) => s.code === code);
  if (!subject) throw new Error('找不到这个学科。');
  const isMine = (state.bootstrap.mySubjects || []).some((item) => item.code === subject.code);
  const forms = [...new Set(subject.topics.map((t) => t.form))].sort();
  view.innerHTML = `
    <div class="note-breadcrumb" style="margin-bottom:14px"><a href="#/subjects">学科模块</a>${icon('chevron-right', 11)}<span>${esc(subjectLabel(subject))}</span></div>
    <section class="subject-hero" data-glyph="${esc(subject.glyph)}" style="--subject-color:${colorOf(subject)}">
      <div class="subject-hero-glyph">${esc(subject.glyph)}</div>
      <div>
        <h1>${esc(subjectLabel(subject))} ${isMine ? `<span class="badge badge-gold" style="vertical-align:middle">${state.lang === 'en' ? 'My subject' : '我的选科'}</span>` : `<span class="badge badge-muted" style="vertical-align:middle">${state.lang === 'en' ? 'Not selected' : '未选'}</span>`}</h1>
        <p>${esc(state.lang === 'en' ? subject.descriptionEn || subject.description : subject.description)}</p>
        <div class="subject-hero-stats">
          <div><strong>${subject.topics.length}</strong><span>${state.lang === 'en' ? (subject.topics.length === 1 ? 'topic' : 'topics') : '课题'}</span></div>
          <div><strong>${subject.noteCount}</strong><span>${state.lang === 'en' ? (subject.noteCount === 1 ? 'note' : 'notes') : '笔记'}</span></div>
        </div>
      </div>
      ${isMine ? `<a class="btn" style="background:#f3e8d0;color:#173a30" href="#/capture?subject=${esc(subject.code)}">${icon('plus', 15)} 整理这一科</a>` : `<a class="btn" style="background:#f3e8d0;color:#173a30" href="#/settings">${icon('plus', 15)} 加入我的选科</a>`}
    </section>
    ${forms.map((form) => {
      const topics = subject.topics.filter((t) => t.form === form);
      return `<section class="topic-group">
        <div class="topic-group-head"><h2>${formLabel(form)}</h2><span>${topics.length} 个课题</span></div>
        <div class="topic-list">
          ${topics.map((topic, index) => `<div class="topic-row">
            <span class="topic-index">${String(index + 1).padStart(2, '0')}</span>
            <div class="topic-main"><strong>${esc(topicLabel(topic))}</strong><span>${esc(unitLabel(topic))} · ${notesCountLabel(topic.noteCount)}</span></div>
            <div class="topic-counts"><span>${topic.noteCount ? notesCountLabel(topic.noteCount) : t('未整理')}</span></div>
            <div class="topic-actions">
              ${isMine ? `<a class="btn btn-sm btn-soft" href="#/capture?subject=${esc(subject.code)}&topic=${esc(topic.code)}">${icon('wand', 13)} 整理</a>` : `<a class="btn btn-sm btn-ghost" href="#/settings">${icon('plus', 13)} 加入选科</a>`}
            </div>
          </div>`).join('')}
        </div>
      </section>`;
    }).join('')}
    <div class="section-head"><div><h2>学科资源</h2><p>需要原文时，先看评核大纲与官方 Past Papers。</p></div></div>
    <div class="settings-card"><div class="resource-list">
      <a class="resource-item" href="${esc(subject.officialUrl)}" target="_blank" rel="noopener noreferrer"><span class="resource-main"><strong>HKEAA · ${esc(subjectLabel(subject))} ${t('历年试题')}</strong><span>官方 Past Papers 入口</span></span>${icon('external', 16)}</a>
    </div></div>`;
}

/* ---------------- capture ---------------- */

function subjectOptions(selected = '') {
  const subjects = state.bootstrap.mySubjects?.length ? state.bootstrap.mySubjects : state.bootstrap.subjects;
  return subjects.map((s) => `<option value="${esc(s.code)}" ${s.code === selected ? 'selected' : ''}>${esc(subjectLabel(s))}</option>`).join('');
}

function formOptions(subject, selected = '') {
  const stage = subject?.stage || 'both';
  const forms = stage === 'junior' ? ['S3'] : stage === 'senior' ? ['S4', 'S5', 'S6'] : ['S3', 'S4', 'S5', 'S6'];
  return forms.map((f) => `<option value="${f}" ${f === selected ? 'selected' : ''}>${formLabel(f)}</option>`).join('');
}

function topicOptions(subject, selected = '') {
  if (!subject) return '<option value="">综合整理</option>';
  return `<option value="">${t('综合')}</option>${subject.topics.map((topic) => `<option value="${esc(topic.code)}" ${topic.code === selected ? 'selected' : ''}>${esc(topicLabel(topic))} · ${formLabel(topic.form)}</option>`).join('')}`;
}

async function renderCapture(seq, query) {
  const preselected = query.get('subject') || 'bio';
  const mySubjects = state.bootstrap.mySubjects?.length ? state.bootstrap.mySubjects : state.bootstrap.subjects;
  const subject = mySubjects.find((s) => s.code === preselected) || mySubjects[0];
  const topic = query.get('topic') || '';
  const mode = ['text', 'file', 'image'].includes(query.get('mode')) ? query.get('mode') : 'text';
  state.capture = { mode, file: null };
  const topicRow = subject.topics.find((t) => t.code === topic);
  const form = topicRow?.form || (subject.stage === 'junior' ? 'S3' : 'S4');
  view.innerHTML = `
    <div class="page-head">
      <div><span class="eyebrow">NEW NOTE</span><h1 class="page-title">整理新材料</h1><p class="page-sub">把原始材料交给知序：先提取文字，再拆成概念、重点、公式、易错点与自测闪卡，整理成一份可复习的笔记。</p></div>
      <a class="btn btn-ghost" href="#/notes">${icon('notes', 15)} 返回笔记库</a>
    </div>
    <div class="capture-layout">
      <form class="capture-card" id="capture-form">
        <div class="capture-card-head"><h2>输入材料</h2><p>文字、文件、图片三选一。图片会调用本机 OCR；PDF 只提取文字层。</p></div>
        <div class="capture-body">
          <div class="field-grid">
            <div class="field"><label for="cap-subject">学科</label><select id="cap-subject" name="subject">${subjectOptions(subject.code)}</select></div>
            <div class="field"><label for="cap-form">年级</label><select id="cap-form" name="form">${formOptions(subject, form)}</select></div>
            <div class="field"><label for="cap-topic">课题</label><select id="cap-topic" name="topic">${topicOptions(subject, topic)}</select></div>
            <div class="field field-wide"><label for="cap-title">笔记标题（可选）</label><input id="cap-title" name="title" placeholder="例如：光合作用 · 光反应与卡尔文循环" maxlength="140" /></div>
          </div>
          <div class="mode-tabs" role="tablist">
            <button type="button" class="mode-tab ${mode === 'text' ? 'is-active' : ''}" data-mode="text">${icon('text', 15)} 粘贴文字</button>
            <button type="button" class="mode-tab ${mode === 'file' ? 'is-active' : ''}" data-mode="file">${icon('file', 15)} 上传文件</button>
            <button type="button" class="mode-tab ${mode === 'image' ? 'is-active' : ''}" data-mode="image">${icon('image', 15)} 图片 OCR</button>
          </div>
          <div class="mode-panel" data-panel="text" ${mode !== 'text' ? 'hidden' : ''}>
            <textarea class="capture-textarea" id="cap-text" placeholder="把课堂笔记、课本段落或网上资料粘贴在这里…&#10;&#10;小提示：保留标题、编号与「注意 / 例如 / 公式」等提示词，归纳结果会更贴近你的课堂结构。"></textarea>
            <div class="textarea-meta"><span id="char-count">0 字</span><button type="button" data-action="fill-sample">填入示例文本</button></div>
          </div>
          <div class="mode-panel" data-panel="file" ${mode !== 'file' ? 'hidden' : ''}>
            <label class="dropzone" id="file-drop">
              ${icon('upload', 26)}
              <strong>拖入文件，或点击选择</strong>
              <span>支持 .txt / .md / .docx / .pptx / .xlsx / .pdf，单文件不超过 24 MB</span>
              <input type="file" id="cap-file" accept=".txt,.md,.markdown,.csv,.json,.docx,.pptx,.xlsx,.pdf" />
            </label>
            <div id="file-preview"></div>
          </div>
          <div class="mode-panel" data-panel="image" ${mode !== 'image' ? 'hidden' : ''}>
            <label class="dropzone" id="image-drop">
              ${icon('camera', 26)}
              <strong>拖入图片，或点击拍照 / 选择</strong>
              <span>支持 PNG / JPG / WebP。图片会先保存为附件，再用 Windows OCR 识别文字；识别结果可回到笔记中校对。</span>
              <input type="file" id="cap-image" accept="image/*" />
            </label>
            <div id="image-preview"></div>
          </div>
          <div class="capture-actions">
            <button class="btn btn-primary" type="submit" id="capture-submit">${icon('wand', 16)} 开始归纳</button>
            <a class="btn btn-ghost" href="#/notes">取消</a>
            <span class="privacy">${icon('lock', 12)} 材料只存在本机 SQLite</span>
          </div>
        </div>
      </form>
      <aside class="capture-side">
        <div class="side-card">
          <h3>你会得到什么</h3>
          <p>不是简单摘要，而是一份可以直接温习的「学习包」。</p>
          <div class="output-list">
            <div class="output-item"><span class="output-num">01</span><div><strong>知识脉络</strong><span>把材料拆成 3–4 条分支</span></div></div>
            <div class="output-item"><span class="output-num">02</span><div><strong>概念与公式</strong><span>术语定义、反应式、关键表述</span></div></div>
            <div class="output-item"><span class="output-num">03</span><div><strong>重点与陷阱</strong><span>按考点密度排序，标出易错处</span></div></div>
            <div class="output-item"><span class="output-num">04</span><div><strong>自测闪卡</strong><span>点击翻面，先回忆再看答案</span></div></div>
          </div>
        </div>
        <div class="side-card">
          <h3>整理引擎</h3>
          <p>${state.bootstrap.features.ai ? '已配置 AI 增强：会先调用你的模型，失败时自动回退本地引擎。' : '当前使用本地归纳引擎：离线、可预测、不上传材料。可在设置中接入 OpenAI 兼容接口。'}</p>
          <a class="link-more" style="margin-top:10px" href="#/settings">${icon('settings', 13)} 配置引擎</a>
        </div>
      </aside>
    </div>
    <div id="progress-slot"></div>`;
  hydrateIcons(view);
  bindCapture(subject);
}

function bindCapture(initialSubject) {
  const form = $('#capture-form');
  const subjectSelect = $('#cap-subject');
  const formSelect = $('#cap-form');
  const topicSelect = $('#cap-topic');
  const textArea = $('#cap-text');
  const charCount = $('#char-count');

  const selectedSubject = () => (state.bootstrap.mySubjects?.length ? state.bootstrap.mySubjects : state.bootstrap.subjects).find((s) => s.code === subjectSelect.value);

  subjectSelect.addEventListener('change', () => {
    const subject = selectedSubject();
    formSelect.innerHTML = formOptions(subject);
    topicSelect.innerHTML = topicOptions(subject);
    formSelect.value = subject.stage === 'junior' ? 'S3' : 'S4';
  });

  topicSelect.addEventListener('change', () => {
    const subject = selectedSubject();
    const topic = subject.topics.find((t) => t.code === topicSelect.value);
    if (topic) formSelect.value = topic.form;
  });

  textArea.addEventListener('input', () => {
    charCount.textContent = `${textArea.value.length} 字`;
  });

  $$('.mode-tab', form).forEach((tab) => {
    tab.addEventListener('click', () => {
      state.capture.mode = tab.dataset.mode;
      $$('.mode-tab', form).forEach((el) => el.classList.toggle('is-active', el === tab));
      $$('.mode-panel', form).forEach((panel) => {
        panel.hidden = panel.dataset.panel !== tab.dataset.mode;
      });
    });
  });

  const fileInput = $('#cap-file');
  const imageInput = $('#cap-image');
  const fileDrop = $('#file-drop');
  const imageDrop = $('#image-drop');

  const handlePicked = async (file, kind) => {
    if (!file) return;
    if (file.size > 24 * 1024 * 1024) {
      toast('文件超过 24 MB，请压缩或拆分后再上传。', 'error');
      return;
    }
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    state.capture.file = { name: file.name, mime: file.type || 'application/octet-stream', data, size: file.size, kind };
    if (kind === 'image') {
      $('#image-preview').innerHTML = `<div class="image-preview"><img src="${data}" alt="${esc(file.name)}" /><span class="badge badge-blue image-badge">OCR 待识别</span></div>`;
      $('#file-preview').innerHTML = '';
    } else {
      $('#file-preview').innerHTML = `<div class="file-preview"><span class="file-preview-icon">${icon('file', 19)}</span><div class="file-preview-main"><strong>${esc(file.name)}</strong><span>${(file.size / 1024).toFixed(0)} KB · ${esc(kind === 'image' ? '图片' : '文件')}</span></div><button type="button" data-action="remove-capture-file">${icon('x', 16)}</button></div>`;
      $('#image-preview').innerHTML = '';
    }
  };

  fileInput.addEventListener('change', () => handlePicked(fileInput.files[0], 'file'));
  imageInput.addEventListener('change', () => handlePicked(imageInput.files[0], 'image'));

  const wireDrop = (element, input, kind) => {
    ['dragenter', 'dragover'].forEach((eventName) => element.addEventListener(eventName, (event) => {
      event.preventDefault();
      element.classList.add('is-drag');
    }));
    ['dragleave', 'drop'].forEach((eventName) => element.addEventListener(eventName, (event) => {
      event.preventDefault();
      element.classList.remove('is-drag');
    }));
    element.addEventListener('drop', (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (file) handlePicked(file, kind);
    });
  };
  wireDrop(fileDrop, fileInput, 'file');
  wireDrop(imageDrop, imageInput, 'image');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const mode = state.capture.mode;
    const text = textArea.value.trim();
    if (mode === 'text' && text.length < 8) {
      toast('请至少粘贴一两句可整理的文字。', 'error');
      return;
    }
    if (mode !== 'text' && !state.capture.file) {
      toast(mode === 'image' ? '请选择一张图片。' : '请选择一个文件。', 'error');
      return;
    }
    const subject = selectedSubject();
    const topic = subject.topics.find((t) => t.code === topicSelect.value);
    const body = {
      title: $('#cap-title').value.trim(),
      subjectCode: subject.code,
      topicCode: topic?.code || '',
      form: formSelect.value,
      text: mode === 'text' ? text : '',
      file: mode === 'text' ? null : state.capture.file,
    };
    const progress = showProgress();
    try {
      const result = await api('/api/notes', { method: 'POST', body: JSON.stringify(body) });
      progress.finish();
      await new Promise((resolve) => setTimeout(resolve, 420));
      progress.close();
      toast(`整理完成：${result.note?.title || '新笔记'}`, 'success');
      await loadBootstrap();
      navigate(`/notes/${result.note.id}`);
    } catch (error) {
      progress.close();
      toast(error.message, 'error');
    }
  });
}

function showProgress() {
  const slot = $('#progress-slot');
  const steps = ['读取材料', '识别文字 / 结构', '提取概念与公式', '组织笔记结构', '生成自测闪卡'];
  let index = 0;
  slot.innerHTML = `<div class="progress-overlay"><div class="progress-card">
    <h2>正在整理</h2><p>本地引擎先拆结构；若已配置 AI，会再做一次语言润色。</p>
    <div class="progress-steps">${steps.map((step, i) => `<div class="progress-step ${i === 0 ? 'is-active' : ''}"><span class="step-dot">${i + 1}</span>${step}</div>`).join('')}</div>
    <div class="progress-bar"><i></i></div>
  </div></div>`;
  const bar = $('.progress-bar i', slot);
  translateDom(slot);
  const timer = setInterval(() => {
    index = Math.min(steps.length - 1, index + 1);
    $$('.progress-step', slot).forEach((el, i) => {
      el.classList.toggle('is-active', i === index);
      el.classList.toggle('is-done', i < index);
    });
    bar.style.width = `${((index + 1) / steps.length) * 100}%`;
  }, 700);
  return {
    finish() {
      clearInterval(timer);
      $$('.progress-step', slot).forEach((el) => {
        el.classList.remove('is-active');
        el.classList.add('is-done');
      });
      bar.style.width = '100%';
    },
    close() {
      clearInterval(timer);
      slot.innerHTML = '';
    },
  };
}

/* ---------------- note detail ---------------- */

async function renderNoteDetail(seq, id) {
  const data = await api(`/api/notes/${id}`);
  if (seq !== state.renderSeq) return;
  const note = data.note;
  const color = note.subjectColor;
  const videoTopic = state.lang === 'en' ? note.topicNameEn || note.topicName : note.topicName;
  const videoSubject = subjectNameFor(note.subjectCode, note.subjectName);
  const videoQuery = [...new Set([note.title, videoTopic, videoSubject, 'DSE'].filter(Boolean))].join(' ');
  const encodedVideoQuery = encodeURIComponent(videoQuery);
  view.innerHTML = `
    <div class="note-layout">
      <article class="note-paper" style="--subject-color:${color}">
        <header class="note-hero">
          <div class="note-breadcrumb"><a href="#/notes">笔记库</a>${icon('chevron-right', 11)}<a href="#/subjects/${esc(note.subjectCode)}">${esc(subjectNameFor(note.subjectCode, note.subjectName))}</a>${icon('chevron-right', 11)}<span>${esc(topicNameFor(note) || '综合')}</span></div>
          <h1>${esc(note.title)}</h1>
          <p class="note-summary">${esc(note.summary)}</p>
          <div class="note-meta-row">
            ${subjectTag({ name: note.subjectName, nameEn: subjectNameFor(note.subjectCode, note.subjectName), color })}
            <span class="badge">${esc(formLabel(note.form))}</span>
            <span class="badge badge-muted">${esc(note.engine === 'ai' ? t('AI 增强') : note.engine === 'sample' ? t('示范笔记') : note.engine === 'ollama-en' ? t('Ollama 英文') : t('本地引擎'))}</span>
            <span class="badge badge-gold">完整度 ${note.coverage}%</span>
            <span class="tiny muted">${note.stats.readingMinutes} 分钟阅读 · ${note.stats.sections} 个板块</span>
          </div>
          <div class="note-actions">
            <a class="btn btn-soft btn-sm" href="/api/notes/${note.id}/export.md" download>${icon('download', 14)} 导出 Markdown</a>
            <button class="btn btn-ghost btn-sm" data-action="print-note">${icon('printer', 14)} 打印 / PDF</button>
            ${note.isOwner ? `
            <button class="btn btn-ghost btn-sm" data-action="edit-note-title" data-id="${note.id}">${icon('edit', 14)} 改标题</button>
            <button class="btn btn-ghost btn-sm" data-action="regenerate-note" data-id="${note.id}">${icon('refresh', 14)} 重新归纳</button>
            <span class="spacer"></span>
            <button class="btn btn-danger btn-sm" data-action="delete-note" data-id="${note.id}" data-title="${esc(note.title)}">${icon('trash', 14)} 删除</button>` : `<span class="spacer"></span><span class="badge badge-muted">${icon('lock', 11)} 示范笔记 · 只读</span>`}
          </div>
        </header>
        <div class="note-sections">
          ${(note.sections || []).map((section, index) => renderSection(section, index)).join('')}
        </div>
      </article>
      <aside class="note-rail">
        <div class="rail-card">
          <h3>${icon('target', 14)} 完整度</h3>
          <div class="coverage-ring"><div class="ring" style="--p:${note.coverage}"><strong>${note.coverage}</strong></div><div class="coverage-copy"><strong>${note.coverage >= 80 ? '结构完整' : note.coverage >= 55 ? '可继续补充' : '材料偏少'}</strong><span>${note.stats.chars} 字 · ${note.stats.concepts} 个概念 · ${note.stats.flashcards} 张闪卡</span></div></div>
        </div>
        <div class="rail-card">
          <h3>${icon('notes', 14)} 本页目录</h3>
          <nav class="toc">${(note.sections || []).map((s, i) => `<a href="#note-section-${i}" data-action="scroll-section" data-target="note-section-${i}">${esc(s.title)}</a>`).join('')}</nav>
        </div>
        <div class="rail-card">
          <h3>${icon('sparkles', 14)} 关键词</h3>
          <div class="keyword-cloud">${(note.keywords || []).map((k) => `<span class="keyword">${esc(k)}</span>`).join('') || '<span class="rail-empty">暂无关键词</span>'}</div>
        </div>
        <div class="rail-card">
          <h3>${icon('video', 14)} 相关视频</h3>
          <p class="rail-empty" style="margin:0 0 8px">按这个课题搜索讲解视频，结果会在新标签打开。</p>
          <div class="video-links">
            <a href="https://www.youtube.com/results?search_query=${encodedVideoQuery}" target="_blank" rel="noopener noreferrer">${icon('external', 12)} YouTube 搜索</a>
            <a href="https://www.khanacademy.org/search?page_search_query=${encodedVideoQuery}" target="_blank" rel="noopener noreferrer">${icon('external', 12)} Khan Academy</a>
            <a href="https://www.bing.com/videos/search?q=${encodedVideoQuery}" target="_blank" rel="noopener noreferrer">${icon('external', 12)} Bing 视频</a>
          </div>
        </div>
        <div class="rail-card">
          <h3>${icon('file', 14)} 原始材料</h3>
          ${note.source ? `
            ${note.source.hasFile && note.source.mime?.startsWith('image/') ? `<img class="attachment-preview" src="/api/files/${note.source.id}" alt="原始图片" />` : ''}
            <div class="attachment-meta">${icon(note.source.kind === 'image' ? 'image' : 'file', 12)}<span>${esc(note.source.filename)} · ${(note.source.size / 1024).toFixed(0)} KB</span></div>
            ${note.source.ocr ? '<span class="badge badge-blue" style="margin-top:7px">OCR 识别，建议对照原图校对</span>' : ''}
            <details style="margin-top:9px"><summary class="tiny muted">查看提取文字</summary><div class="source-text">${esc(note.source.text.slice(0, 6000))}${note.source.text.length > 6000 ? '\n…' : ''}</div></details>
            ${note.source.warnings?.length ? `<p class="rail-empty" style="margin-top:7px">${esc(note.source.warnings[0])}</p>` : ''}
          ` : '<p class="rail-empty">示范笔记没有原始附件。</p>'}
        </div>
        ${note.relatedNotes?.length ? `<div class="rail-card"><h3>${icon('book', 14)} 同科笔记</h3>${note.relatedNotes.map((n) => `<div class="rail-question"><a href="#/notes/${n.id}" style="margin:0;color:var(--ink-2);font-size:10.5px;font-weight:500">${esc(n.title)}</a></div>`).join('')}</div>` : ''}
      </aside>
    </div>`;
  hydrateIcons(view);
}

function renderSection(section, index) {
  const body = (() => {
    switch (section.type) {
      case 'mindmap':
        return `<div class="mindmap"><div class="mindmap-root">${esc(section.root || '主题')}</div><div class="mindmap-branches">${(section.branches || []).map((branch) => `<div class="mindmap-branch"><strong>${esc(branch.label)}</strong><ul>${(branch.items || []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div>`).join('')}</div></div>`;
      case 'objectives':
        return `<div class="objectives">${(section.items || []).map((item, i) => `<div class="objective"><span class="num">${String(i + 1).padStart(2, '0')}</span><span>${esc(item)}</span></div>`).join('')}</div>`;
      case 'concepts':
        return `<div class="concept-grid">${(section.items || []).map((item) => `<div class="concept"><div class="concept-head"><strong>${esc(item.term)}</strong>${item.kind === 'context' ? '<span class="kind">文本用法</span>' : ''}</div><p>${esc(item.definition)}</p></div>`).join('')}</div>`;
      case 'keypoints':
        return `<div class="keypoints">${(section.items || []).map((item, i) => `<div class="keypoint"><span class="idx">${String(i + 1).padStart(2, '0')}</span><span>${esc(item)}</span></div>`).join('')}</div>`;
      case 'formulas':
        return `<div class="formula-list">${(section.items || []).map((item) => {
          const formula = typeof item === 'string' ? item : item.formula || item.label || '';
          const label = typeof item === 'string' ? '公式 / 关键表述' : item.label || '公式';
          const note = typeof item === 'string' ? '' : item.note || '';
          return `<div class="formula"><div class="formula-label">${icon('scale', 11)} ${esc(label)}</div><code>${esc(formula)}</code>${note ? `<p>${esc(note)}</p>` : ''}</div>`;
        }).join('')}</div>`;
      case 'pitfalls':
        return (section.items || []).map((item) => `<div class="pitfall">${icon('alert', 15)}<span>${esc(item)}</span></div>`).join('');
      case 'examples':
        return (section.items || []).map((item) => `<div class="example">${esc(item)}</div>`).join('');
      case 'exam':
        return `<div class="exam-list">${(section.items || []).map((item) => `<div class="exam-item">${icon('check', 13)}<span>${esc(item)}</span></div>`).join('')}</div>`;
      case 'flashcards':
        return `<div class="flash-grid">${(section.items || []).map((item, i) => `<button type="button" class="flashcard" data-action="flip-card" aria-label="翻转闪卡"><div class="flashcard-inner"><div class="flash-face flash-front"><small>Q${String(i + 1).padStart(2, '0')} · 点击翻面</small><p>${esc(item.q)}</p></div><div class="flash-face flash-back"><small>ANSWER</small><p>${esc(item.a)}</p></div></div></button>`).join('')}</div>`;
      default:
        return `<p>${esc(JSON.stringify(section.items || ''))}</p>`;
    }
  })();
  return `<section class="note-section" id="note-section-${index}"><div class="section-title-row"><h2>${esc(section.title)}</h2><span>${esc(section.type)}</span></div><div class="section-body">${body}</div></section>`;
}

/* ---------------- questions ---------------- */

async function renderQuestions(seq, query) {
  const filters = {
    subject: query.get('subject') || '',
    form: query.get('form') || '',
    topic: query.get('topic') || '',
    origin: query.get('origin') || '',
    q: query.get('q') || '',
    scope: ['mine', 'all'].includes(query.get('scope')) ? query.get('scope') : 'mine',
  };
  state.filters = filters;
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
  params.set('limit', '60');
  const [data, resourceData] = await Promise.all([api(`/api/questions?${params}`), api('/api/resources')]);
  if (seq !== state.renderSeq) return;
  const subjects = state.bootstrap.mySubjects?.length ? state.bootstrap.mySubjects : state.bootstrap.subjects;
  const resources = resourceData.resources || [];
  view.innerHTML = `
    <div class="page-head">
      <div><span class="eyebrow">PAST PAPER PRACTICE</span><h1 class="page-title">题库练习</h1><p class="page-sub">按 DSE / HKCEE 题型与考纲改编，附答案、解释与难度标记。历年官方原文请使用考评局 Past Papers。</p></div>
      <a class="btn btn-ghost" href="https://www.hkeaa.edu.hk/en/hkdse/assessment/past_papers/" target="_blank" rel="noopener noreferrer">${icon('external', 15)} 官方 Past Papers</a>
    </div>
    <div class="segmented" style="margin-bottom:12px">
      <a href="#/questions?scope=mine" class="${filters.scope === 'mine' ? 'is-active' : ''}">我的选科</a>
      <a href="#/questions?scope=all" class="${filters.scope === 'all' ? 'is-active' : ''}">全部题库</a>
    </div>
    <form class="filter-bar" id="question-filter">
      <input type="hidden" name="scope" value="${esc(filters.scope)}" />
      <label class="search-inline">${icon('search', 15)}<input name="q" value="${esc(filters.q)}" placeholder="搜索题干、知识点…" /></label>
      <select name="subject"><option value="">全部学科</option>${subjects.map((s) => `<option value="${esc(s.code)}" ${s.code === filters.subject ? 'selected' : ''}>${esc(subjectLabel(s))}</option>`).join('')}</select>
      <select name="form"><option value="">全部年级</option>${['S3', 'S4', 'S5', 'S6'].map((f) => `<option value="${f}" ${f === filters.form ? 'selected' : ''}>${formLabel(f)}</option>`).join('')}</select>
      <select name="origin"><option value="">全部来源</option><option value="DSE" ${filters.origin === 'DSE' ? 'selected' : ''}>DSE</option><option value="HKCEE" ${filters.origin === 'HKCEE' ? 'selected' : ''}>HKCEE</option></select>
      <button class="btn btn-soft btn-sm" type="submit">筛选</button>
      <span class="result-count">${data.total} 道题</span>
    </form>
    ${data.questions.length ? `<div class="question-list">${data.questions.map(questionCard).join('')}</div>` : emptyState({ iconName: 'bank', title: '这个筛选下还没有题目', text: filters.scope === 'mine' ? '你的选科下题目较少；可以切换到「全部题库」，或添加外部题库。' : '换个关键词或清除筛选；题库会随复习进度继续扩充。' })}
    <div class="section-head" style="margin-top:28px"><div><h2>外部题库</h2><p>收藏资源网站、SharePoint 文件夹或在线题库；不会自动把外部题目复制进本机。</p></div></div>
    ${resources.length ? `<div class="resource-list">${resources.map((resource) => `<div class="resource-item"><span class="resource-main"><strong>${esc(resource.title)}</strong><span>${resource.subjectCode ? `${esc(subjectNameFor(resource.subjectCode, resource.subjectName))} · ` : ''}${esc(resource.description || '外部题库资源')}</span></span><a class="btn btn-ghost btn-sm" href="${esc(resource.url)}" target="_blank" rel="noopener noreferrer">${icon('external', 14)} 打开</a>${resource.isMine ? `<button type="button" class="icon-btn" data-action="delete-resource" data-id="${resource.id}" aria-label="删除">${icon('trash', 14)}</button>` : ''}</div>`).join('')}</div>` : `<p class="tiny muted">还没有外部题库；下面添加第一个。</p>`}
    <form class="settings-card" id="resource-form" style="margin-top:14px">
      <h3 style="margin:0 0 4px">添加外部题库</h3>
      <p class="tiny muted" style="margin:0 0 12px">只保存链接与说明，不抓取对方网站内容；需要登录的 SharePoint 链接请先确认自己能打开。</p>
      <div class="form-row"><div class="field"><label>名称</label><input name="title" required maxlength="160" placeholder="例如：DSE Physics Question Bank" /></div><div class="field"><label>链接</label><input name="url" type="url" required placeholder="https://…" /></div></div>
      <div class="form-row"><div class="field"><label>学科</label><select name="subjectCode"><option value="">综合 / 未分类</option>${subjects.map((s) => `<option value="${esc(s.code)}">${esc(subjectLabel(s))}</option>`).join('')}</select></div><div class="field"><label>说明</label><input name="description" maxlength="400" placeholder="需要学校账号 / 包含历年题 / 只读" /></div></div>
      <button class="btn btn-primary btn-sm" type="submit">${icon('plus', 14)} 添加题库</button>
    </form>
    <p class="disclaimer" style="margin-top:18px">说明：本页题目按公开考纲与历年题型重新撰写，属 DSE / HKCEE 风格改编练习，并非香港考评局官方原文；年份与试卷标签用于标示参考年份。</p>`;
  hydrateIcons(view);
  $('#question-filter').addEventListener('submit', (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    ['q', 'subject', 'form', 'origin', 'scope'].forEach((key) => {
      const value = String(fd.get(key) || '').trim();
      if (value) params.set(key, value);
    });
    navigate(`/questions${params.toString() ? `?${params}` : ''}`);
  });
  $('#resource-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    try {
      await api('/api/resources', {
        method: 'POST',
        body: {
          title: String(fd.get('title') || '').trim(),
          url: String(fd.get('url') || '').trim(),
          subjectCode: String(fd.get('subjectCode') || ''),
          description: String(fd.get('description') || '').trim(),
        },
      });
      toast('题库链接已添加。');
      navigate(`/questions?scope=${filters.scope}`);
    } catch (error) {
      toast(error.message, 'error');
    }
  });
  view.querySelectorAll('[data-action="delete-resource"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await api(`/api/resources/${button.dataset.id}`, { method: 'DELETE' });
        toast('已删除。');
        navigate(`/questions?scope=${filters.scope}`);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  });
}

async function openPractice(id) {
  try {
    const data = await api(`/api/questions/${id}`);
    state.practice = { question: data.question, selected: null, revealed: false, isCorrect: null };
    renderPractice();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function renderPractice() {
  const p = state.practice;
  if (!p) return;
  const q = p.question;
  const isMcq = q.type === 'mcq' && q.options?.length;
  const selectedIndex = p.selected;
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="practice-modal" role="dialog" aria-modal="true" aria-label="题目练习" data-stop="1">
    <div class="practice-top">
      <span class="badge badge-gold">${esc(q.origin)} ${q.year} · 改编</span>
      <span class="badge badge-muted">${esc(subjectNameFor(q.subjectCode, q.subjectName))}</span>
      <span class="spacer"></span>
      <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon('x', 16)}</button>
    </div>
    <div class="practice-progress"><span>${esc(q.topicName || '')}</span><div class="bar"><i style="width:${p.revealed ? 100 : 12}%"></i></div><span>${q.marks} 分</span></div>
    <h2 class="practice-stem">${esc(q.stem)}</h2>
    ${isMcq ? `<div class="option-list">${q.options.map((option, index) => {
      const letter = String.fromCharCode(65 + index);
      let extra = '';
      if (p.revealed) {
        if (letter === q.answer) extra = 'is-correct';
        else if (index === selectedIndex) extra = 'is-wrong';
      } else if (index === selectedIndex) extra = 'is-selected';
      return `<button type="button" class="option ${extra}" data-action="practice-option" data-index="${index}" ${p.revealed ? 'disabled' : ''}><span class="letter">${letter}</span><span>${esc(option)}</span></button>`;
    }).join('')}</div>` : `<textarea class="capture-textarea" style="min-height:150px" id="practice-response" placeholder="写出你的答案或关键步骤…" ${p.revealed ? 'disabled' : ''}>${esc(p.response || '')}</textarea>`}
    ${p.revealed ? `<div class="answer-box"><h4>${icon('check', 12)} 参考答案</h4>
      <div class="result-line">${isMcq ? (p.isCorrect ? `${icon('check', 15)} 答对了` : `${icon('alert', 15)} 再检查一次`) : '对照参考答案，给自己评分'}</div>
      <p><strong>${esc(q.answer)}</strong>${q.explanation ? `\n${esc(q.explanation)}` : ''}</p>
    </div>` : ''}
    <div class="practice-actions">
      ${!p.revealed ? `<button class="btn btn-primary" data-action="practice-check">${icon('check', 15)} 查看答案</button>` : ''}
      ${p.revealed && !isMcq ? `<div class="self-grade"><button class="btn btn-sm btn-soft" data-action="practice-grade" data-grade="correct">答对了</button><button class="btn btn-sm btn-ghost" data-action="practice-grade" data-grade="wrong">还需复习</button></div>` : ''}
      <span class="spacer"></span>
      ${p.revealed ? `<button class="btn btn-ghost" data-action="close-modal">关闭</button><button class="btn btn-soft" data-action="practice-again">${icon('refresh', 14)} 再来一题</button>` : '<button class="btn btn-ghost" data-action="close-modal">先不做</button>'}
    </div>
  </div></div>`;
  hydrateIcons(modalRoot);
  translateDom(modalRoot);
}

async function checkPractice() {
  const p = state.practice;
  if (!p) return;
  const q = p.question;
  const isMcq = q.type === 'mcq' && q.options?.length;
  if (isMcq && p.selected === null) {
    toast('先选择一个选项。', 'error');
    return;
  }
  p.revealed = true;
  if (isMcq) {
    p.isCorrect = String.fromCharCode(65 + p.selected) === q.answer;
    try {
      await api('/api/attempts', { method: 'POST', body: JSON.stringify({ questionId: q.id, response: String.fromCharCode(65 + p.selected), isCorrect: p.isCorrect }) });
    } catch {}
  }
  renderPractice();
}

async function gradePractice(grade) {
  const p = state.practice;
  if (!p) return;
  try {
    await api('/api/attempts', { method: 'POST', body: JSON.stringify({ questionId: p.question.id, response: p.response || '', selfGrade: grade, isCorrect: grade === 'correct' }) });
    toast(grade === 'correct' ? '已记录：答对。' : '已记录：需要复习。', 'success');
  } catch {}
  closeModal();
}

/* ---------------- search ---------------- */

async function renderSearch(seq, query) {
  const q = (query.get('q') || '').trim();
  const data = q ? await api(`/api/search?q=${encodeURIComponent(q)}`) : { notes: [], questions: [], total: 0 };
  if (seq !== state.renderSeq) return;
  view.innerHTML = `
    <section class="search-hero">
      <span class="eyebrow">SEARCH</span>
      <h1 class="page-title">搜索笔记库</h1>
      <form id="search-page-form">${icon('search', 16)}<input name="q" value="${esc(q)}" placeholder="输入关键词，例如「光合作用」「discriminant」…" autofocus /><button class="btn btn-primary" type="submit">搜索</button></form>
    </section>
    ${q ? `<p class="page-sub" style="margin-bottom:8px">「${esc(q)}」找到 ${data.notes.length} 份笔记。</p>` : '<p class="page-sub">输入关键词，搜索笔记正文、标题与关键词。</p>'}
    ${data.notes.length ? `<section class="search-group"><h2>笔记</h2><div class="note-grid">${data.notes.map(noteCard).join('')}</div></section>` : ''}
    ${q && !data.notes.length ? emptyState({ iconName: 'search', title: '没有搜到结果', text: '试试较短的学科关键词，或检查是否使用了繁体 / 简体不同写法。' }) : ''}`;
  hydrateIcons(view);
  $('#search-page-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('q').trim();
    navigate(`/search?q=${encodeURIComponent(value)}`);
  });
}

/* ---------------- settings ---------------- */

async function renderSettings(seq) {
  const data = await api('/api/settings');
  if (seq !== state.renderSeq) return;
  const profile = data.profile;
  const ai = data.ai;
  view.innerHTML = `
    <div class="page-head">
      <div><span class="eyebrow">SETTINGS</span><h1 class="page-title">设置与数据</h1><p class="page-sub">你的笔记与该 SQLite 数据库都保存在本机。这里可以配置 AI、导出数据，以及查看后续迭代方向。</p></div>
    </div>
    <div class="settings-grid">
      <section class="settings-card">
        <h2>账号</h2><p>账号与笔记只保存在这台电脑的 SQLite 数据库里。</p>
        <div class="account-row">
          <span class="avatar">${esc((profile.name || profile.username || '同').slice(0, 1))}</span>
          <div class="account-copy"><strong>${esc(profile.name)}</strong><span>@${esc(profile.username)} · ${esc(formLabel(profile.form))}</span></div>
          <button class="btn btn-ghost btn-sm" data-action="logout">${icon('lock', 14)} 退出登录</button>
        </div>
        <div class="account-security">
          <button class="btn btn-ghost btn-sm" data-action="generate-recovery">${icon('key', 14)} 生成恢复码</button>
          <button class="btn btn-danger btn-sm" data-action="delete-account">${icon('trash', 14)} 注销账号</button>
        </div>
      </section>
      <section class="settings-card">
        <h2>学习档案</h2><p>用于总览问候与 DSE 倒计时。</p>
        <form id="profile-form">
          <div class="field"><label>称呼</label><input name="name" value="${esc(profile.name)}" maxlength="40" /></div>
          <div class="form-row">
            <div class="field"><label>年级</label><select name="form">${['S3', 'S4', 'S5', 'S6'].map((f) => `<option value="${f}" ${profile.form === f ? 'selected' : ''}>${formLabel(f)}</option>`).join('')}</select></div>
            <div class="field"><label>目标 DSE 年份</label><select name="goal">${goalOptions(profile.goal)}</select></div>
          </div>
          <div class="field"><label>界面语言 / Language</label><select name="language"><option value="zh" ${profile.language !== 'en' ? 'selected' : ''}>中文</option><option value="en" ${profile.language === 'en' ? 'selected' : ''}>English</option></select><p class="tiny muted" style="margin-top:5px">切换界面语言；非中文 / CSD 科目的知识稿为英文，中文与 CSD 保留中文。</p></div>
          <button class="btn btn-primary" type="submit">保存档案</button>
        </form>
      </section>
      <section class="settings-card">
        <h2>我的选科</h2><p>${state.lang === 'en' ? `Current form ${formLabel(profile.form)}. Core subjects stay. Choose 2–5 electives, including M1 / M2. Re-save subjects after changing form.` : `当前年级 ${formLabel(profile.form)}。核心科自动保留；选修科可选 2–5 门，M1 / M2 在列表中。改年级后请重新保存选科。`}</p>
        <form id="settings-subjects-form">
          <div class="settings-subject-section"><strong>核心科目</strong><div class="settings-subject-grid">${authSubjectGroups(profile.form).core.map((subject) => `<label class="settings-subject is-locked"><input type="checkbox" checked disabled value="${esc(subject.code)}" /><span>${esc(subjectLabel(subject))}</span><small>${esc(state.lang === 'en' ? subject.name : subject.nameEn || '')}</small></label>`).join('')}</div></div>
          <div class="settings-subject-section"><strong>${profile.form === 'S3' ? '学校科目' : '选修科目'}</strong><div class="settings-subject-grid">${authSubjectGroups(profile.form).electives.map((subject) => {
            const checked = data.subjects.some((item) => item.code === subject.code);
            return `<label class="settings-subject ${checked ? 'is-selected' : ''}"><input type="checkbox" name="subjects" value="${esc(subject.code)}" ${checked ? 'checked' : ''} /><span>${esc(subjectLabel(subject))}</span><small>${esc(state.lang === 'en' ? subject.name : subject.nameEn || '')}</small></label>`;
          }).join('')}</div></div>
          <button class="btn btn-primary" type="submit" style="margin-top:14px">保存选科</button>
        </form>
      </section>
      <section class="settings-card">
        <h2>AI 增强（可选）</h2><p>兼容 OpenAI Chat Completions 的接口；本机 Ollama 可留空 API Key。非中文 / CSD 科目的知识稿会用它自动转成英文。</p>
        <form id="ai-form">
          <div class="switch-row"><div><strong>启用 AI 润色 / 英文化</strong><span>失败时自动回退本地引擎</span></div><button type="button" class="switch ${ai.enabled ? 'is-on' : ''}" id="ai-switch" aria-label="启用 AI"></button></div>
          <div class="field" style="margin-top:12px"><label>Base URL</label><input name="baseUrl" value="${esc(ai.baseUrl)}" placeholder="http://127.0.0.1:11434/v1" /></div>
          <div class="form-row"><div class="field"><label>模型</label><input name="model" value="${esc(ai.model)}" /></div><div class="field"><label>API Key</label><input name="apiKey" type="password" placeholder="${ai.hasKey ? `已保存 ${esc(ai.keyHint)}` : (ai.local ? 'Ollama 本地可留空' : 'sk-…')}" autocomplete="off" /></div></div>
          ${ai.local ? `<p class="tiny muted" style="margin:-2px 0 10px">检测到本地模型端点；无需 API Key，费用为 0（只消耗本机算力）。局域网内其他设备通过本服务器调用这台电脑的 Ollama，手机无需安装模型；主机休眠或 Ollama 关闭时不可用。</p>` : ''}
          <label class="tiny muted" style="display:flex;gap:6px;align-items:center;margin:2px 0 12px"><input type="checkbox" name="clearKey" /> 清除已保存的 Key</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" type="submit">保存 AI 配置</button><button class="btn btn-ghost" type="button" id="test-ai">${icon('sparkles', 14)} 测试连接</button></div>
          <p class="tiny muted" id="ai-test-result" style="margin-top:9px"></p>
        </form>
      </section>
      <section class="settings-card">
        <h2>数据与备份</h2><p>SQLite 数据库 + 上传附件。定期导出 JSON 备份，换设备或未来 App 可直接迁移。</p>
        <div class="data-grid">
          <div class="data-item"><strong>${(data.data.dbSize / 1024).toFixed(1)} KB</strong><span>数据库</span></div>
          <div class="data-item"><strong>${data.data.uploadCount}</strong><span>附件数</span></div>
          <div class="data-item"><strong>${state.bootstrap.stats.notes}</strong><span>笔记</span></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-soft" href="/api/export" download>${icon('download', 15)} 导出 JSON 备份</a><button class="btn btn-ghost" data-action="install-app">${icon('download', 15)} 安装到桌面</button></div>
        <p class="tiny muted" style="margin-top:10px">位置：${esc(data.data.dataDir)}</p>
      </section>
      <section class="settings-card">
        <h2>局域网访问</h2><p>手机、平板连同一个 Wi-Fi，打开下面的地址即可。电脑需要保持开机，服务器窗口不能关。</p>
        <div class="lan-list">
          ${(state.bootstrap.network?.urls || []).map((item) => `<div class="lan-url"><span>${icon('external', 13)}</span><code>${esc(item.url)}</code><button class="btn btn-sm btn-soft" data-action="copy-lan" data-url="${esc(item.url)}">复制</button></div>`).join('') || '<p class="rail-empty">未检测到局域网 IPv4 地址。请确认电脑已连接 Wi-Fi 或网线。</p>'}
        </div>
        <p class="tiny muted" style="margin-top:10px">当前访问：${esc(window.location.origin)}</p>
        <details style="margin-top:10px"><summary class="tiny muted">手机打不开？点这里看防火墙设置</summary><p class="tiny muted" style="margin-top:7px">Windows 首次运行可能拦截入站连接。用「管理员」PowerShell 执行：<br /><code class="inline-code">New-NetFirewallRule -DisplayName "知序 StudyDesk LAN" -Direction Inbound -Protocol TCP -LocalPort 4173 -Action Allow -Profile Private,Domain</code></p></details>
        <p class="tiny muted" style="margin-top:10px">可选：启动前设置 <code class="inline-code">STUDYDESK_PIN=你的密码</code>，浏览器会要求输入访问密码。局域网 HTTP 下 PWA 安装与剪贴板权限可能不可用，属正常现象。</p>
      </section>
      <section class="settings-card">
        <h2>后续迭代</h2><p>当前是 v0.3 可运行 MVP，数据库与 API 已为后续扩展留好接口。</p>
        <div class="roadmap">
          <div class="roadmap-item"><span class="roadmap-tag">v0.1</span><div><strong>本地整理 + 图片 OCR</strong><p>文字 / 文件 / 图片输入，结构化笔记与闪卡。</p></div></div>
          <div class="roadmap-item"><span class="roadmap-tag">v0.2</span><div><strong>家庭局域网访问</strong><p>手机/平板同一 Wi-Fi 使用，可选访问密码与 Windows 防火墙脚本。</p></div></div>
          <div class="roadmap-item"><span class="roadmap-tag">v0.3</span><div><strong>账号、选科与双语界面</strong><p>注册登录、数据隔离、M1/M2 选科、中英文一键切换。</p></div></div>
          <div class="roadmap-item"><span class="roadmap-tag">v0.4</span><div><strong>间隔重复与复习排程</strong><p>闪卡按记忆曲线排程、薄弱课题提示、每周复习清单。</p></div></div>
          <div class="roadmap-item"><span class="roadmap-tag">v0.5</span><div><strong>多设备与共享</strong><p>账号体系、云端同步、教师/同学共享学科包。</p></div></div>
          <div class="roadmap-item"><span class="roadmap-tag">v1.0</span><div><strong>移动 App</strong><p>PWA 已可安装；后续用 Capacitor 打包 iOS / Android，复用同一套 API 与数据库 schema。</p></div></div>
        </div>
      </section>
    </div>
    <div class="section-head"><div><h2>官方资源</h2><p>需要原文与评卷参考时，请以考评局发布为准。</p></div></div>
    <div class="settings-card"><div class="resource-list">${state.bootstrap.officialResources.map((r) => `<a class="resource-item" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer"><span class="resource-main"><strong>${esc(r.label)}</strong><span>${esc(r.note)}</span></span>${icon('external', 16)}</a>`).join('')}</div>
    <p class="disclaimer" style="margin-top:16px">知序 StudyDesk v${esc(state.bootstrap.version)} · 本地优先 · 专注知识整理与复习。DSE 为香港考试及评核局举办之考试。</p></div>`;
  hydrateIcons(view);

  $('#profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    try {
      await api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          profile: {
            name: fd.get('name'),
            form: fd.get('form'),
            goal: fd.get('goal'),
            language: fd.get('language') === 'en' ? 'en' : 'zh',
          },
        }),
      });
      await loadBootstrap();
      toast('档案已保存。', 'success');
      await renderSettings(seq);
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  $('#settings-subjects-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const core = authSubjectGroups(profile.form).core.map((subject) => subject.code);
    const selected = [...form.querySelectorAll('input[name="subjects"]:checked')].map((input) => input.value);
    try {
      await api('/api/settings', { method: 'PUT', body: JSON.stringify({ subjects: [...core, ...selected] }) });
      await loadBootstrap();
      toast('选科已保存。', 'success');
      await renderSettings(seq);
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  const aiSwitch = $('#ai-switch');
  aiSwitch.addEventListener('click', () => aiSwitch.classList.toggle('is-on'));
  $('#ai-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    try {
      await api('/api/settings', { method: 'PUT', body: JSON.stringify({ ai: { enabled: aiSwitch.classList.contains('is-on'), baseUrl: fd.get('baseUrl'), model: fd.get('model'), apiKey: fd.get('apiKey'), clearKey: fd.get('clearKey') === 'on' } }) });
      await loadBootstrap();
      toast('AI 配置已保存。', 'success');
      await renderSettings(seq);
    } catch (error) {
      toast(error.message, 'error');
    }
  });
  $('#test-ai').addEventListener('click', async () => {
    const form = $('#ai-form');
    const fd = new FormData(form);
    const result = $('#ai-test-result');
    result.textContent = '正在连接…';
    try {
      const response = await api('/api/settings/ai-test', { method: 'POST', body: JSON.stringify({ baseUrl: fd.get('baseUrl'), model: fd.get('model'), apiKey: fd.get('apiKey') }) });
      result.textContent = response.ok ? `连接成功 · ${response.latency} ms · ${response.model}` : `连接失败：${response.error}`;
    } catch (error) {
      result.textContent = `连接失败：${error.message}`;
    }
  });
}

/* ---------------- modal / actions ---------------- */

function closeModal() {
  modalRoot.innerHTML = '';
  state.practice = null;
}

async function copyText(text, message = '地址已复制，发到手机浏览器打开即可。') {
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    toast(message, 'success');
  } catch {
    window.prompt('复制这个地址：', text);
  }
}

function editNoteTitle(id, current) {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal-card" id="title-form">
    <button type="button" class="icon-btn modal-close" data-action="close-modal">${icon('x', 15)}</button>
    <h2>修改标题</h2><p>只改标题，不会重新整理内容。</p>
    <div class="field"><label>标题</label><input name="title" value="${esc(current)}" maxlength="140" required /></div>
    <div style="display:flex;gap:8px;margin-top:16px"><button class="btn btn-primary" type="submit">保存</button><button class="btn btn-ghost" type="button" data-action="close-modal">取消</button></div>
  </form></div>`;
  hydrateIcons(modalRoot);
  $('#title-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = new FormData(event.currentTarget).get('title').trim();
    try {
      await api(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) });
      closeModal();
      toast('标题已更新。', 'success');
      renderRoute();
    } catch (error) {
      toast(error.message, 'error');
    }
  });
}

async function regenerateNote(id) {
  const confirmed = window.confirm('重新归纳会用原始材料覆盖当前笔记结构（标题保留）。继续吗？');
  if (!confirmed) return;
  toast('正在重新归纳…');
  try {
    const result = await api(`/api/notes/${id}/regenerate`, { method: 'POST', body: JSON.stringify({}) });
    toast(result.usedAi ? '已用 AI 重新整理。' : '已用本地引擎重新整理。', 'success');
    renderRoute();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function deleteNote(id, title) {
  const confirmed = window.confirm(`删除「${title}」？原始附件也会一并删除，此操作不可撤销。`);
  if (!confirmed) return;
  try {
    await api(`/api/notes/${id}`, { method: 'DELETE' });
    await loadBootstrap();
    toast('笔记已删除。', 'success');
    navigate('/notes');
  } catch (error) {
    toast(error.message, 'error');
  }
}

/* ---------------- global events ---------------- */

function bindGlobalEvents() {
  window.addEventListener('hashchange', renderRoute);

  document.addEventListener('click', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) {
      if (event.target.classList?.contains('flashcard')) event.target.classList.toggle('is-flipped');
      return;
    }
    const action = actionEl.dataset.action;
    if (action === 'close-modal') {
      if (actionEl.classList.contains('modal-backdrop') && event.target !== actionEl) return;
      closeModal();
      return;
    }
    if (action === 'toggle-sidebar') {
      document.body.classList.toggle('sidebar-open');
      return;
    }
    if (action === 'close-sidebar') {
      document.body.classList.remove('sidebar-open');
      return;
    }
    if (action === 'reload-page') {
      location.reload();
      return;
    }
    if (action === 'print-note') {
      window.print();
      return;
    }
    if (action === 'scroll-section') {
      event.preventDefault();
      const target = document.getElementById(actionEl.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (action === 'flip-card') {
      event.preventDefault();
      actionEl.classList.toggle('is-flipped');
      return;
    }
    if (action === 'delete-note') {
      deleteNote(Number(actionEl.dataset.id), actionEl.dataset.title || '这条笔记');
      return;
    }
    if (action === 'regenerate-note') {
      regenerateNote(Number(actionEl.dataset.id));
      return;
    }
    if (action === 'edit-note-title') {
      editNoteTitle(Number(actionEl.dataset.id), actionEl.closest('.note-paper')?.querySelector('h1')?.textContent || '');
      return;
    }
    if (action === 'practice') {
      openPractice(Number(actionEl.dataset.id));
      return;
    }
    if (action === 'practice-option') {
      if (!state.practice || state.practice.revealed) return;
      state.practice.selected = Number(actionEl.dataset.index);
      renderPractice();
      return;
    }
    if (action === 'practice-check') {
      checkPractice();
      return;
    }
    if (action === 'practice-grade') {
      gradePractice(actionEl.dataset.grade);
      return;
    }
    if (action === 'practice-again') {
      closeModal();
      navigate('/notes');
      return;
    }
    if (action === 'fill-sample') {
      const textarea = $('#cap-text');
      if (textarea) {
        textarea.value = SAMPLE_TEXT;
        textarea.dispatchEvent(new Event('input'));
        toast('已填入示例，可直接开始归纳。', 'success');
      }
      return;
    }
    if (action === 'remove-capture-file') {
      state.capture.file = null;
      $('#file-preview').innerHTML = '';
      $('#image-preview').innerHTML = '';
      return;
    }
    if (action === 'copy-lan') {
      copyText(actionEl.dataset.url || '');
      return;
    }
    if (action === 'toggle-lang') {
      toggleLanguage();
      return;
    }
    if (action === 'logout') {
      logout();
      return;
    }
    if (action === 'generate-recovery') {
      openAccountSecurityModal('recovery');
      return;
    }
    if (action === 'delete-account') {
      openAccountSecurityModal('delete');
      return;
    }
    if (action === 'install-app') {
      if (state.installPrompt) {
        state.installPrompt.prompt();
        state.installPrompt.userChoice.finally(() => {
          state.installPrompt = null;
          $('#install-btn').hidden = true;
        });
      } else {
        toast('浏览器暂未提供安装提示；可用菜单中的「安装应用 / 添加到主屏幕」。');
      }
    }
  });

  modalRoot.addEventListener('click', (event) => {
    if (event.target === modalRoot.querySelector('.modal-backdrop')) closeModal();
  });

  modalRoot.addEventListener('input', (event) => {
    if (event.target.id === 'practice-response' && state.practice) {
      state.practice.response = event.target.value;
    }
  });

  document.addEventListener('keydown', (event) => {
    const tag = document.activeElement?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable;
    if (event.key === 'Escape') {
      if (modalRoot.innerHTML) closeModal();
      document.body.classList.remove('sidebar-open');
    }
    if (event.key === '/' && !typing) {
      event.preventDefault();
      $('#global-search-input')?.focus();
    }
    if (event.key.toLowerCase() === 'n' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
      navigate('/capture');
    }
  });

  $('#global-search').addEventListener('submit', (event) => {
    event.preventDefault();
    const value = $('#global-search-input').value.trim();
    if (value) navigate(`/search?q=${encodeURIComponent(value)}`);
  });

  $('#sidebar-scrim').addEventListener('click', () => document.body.classList.remove('sidebar-open'));
}

const SAMPLE_TEXT = `第一章 光合作用

光合作用是绿色植物利用光能，把二氧化碳和水合成有机物并释放氧气的过程。
光反应发生在类囊体膜上，叶绿素吸收光能，光解水产生氧气、ATP 和 NADPH。
卡尔文循环在叶绿体基质中进行，利用 ATP 和 NADPH 固定二氧化碳。
注意：氧气来自水，不是二氧化碳，这是常见错误。
例如：伊乐藻实验可以通过气泡速率测量光合速率。
影响光合速率的因素包括光照强度、二氧化碳浓度和温度。
当光照强度增加时，光合速率上升，但达到饱和点后不再上升，此时二氧化碳浓度成为限制因子。
公式：6CO2 + 12H2O -> C6H12O6 + 6O2 + 6H2O

第2节 实验设计
设计实验时，自变量是光照强度，因变量是气泡产生速率。
控制变量包括温度、二氧化碳浓度和植物种类。
每组实验应重复三次，以减少随机误差。`;

init();
