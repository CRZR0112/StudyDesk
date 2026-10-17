// 本地/远程模型英文化：只翻译笔记知识内容，不改动原始材料。
// 对 Ollama 使用 OpenAI 兼容端点（/v1/chat/completions），无需 API Key。
const EXEMPT_SUBJECTS = new Set(['chi', 'csd']);
const CJK_RE = /[\u3400-\u9fff]/;
const CACHE = new Map();
const FALLBACK_TERMS = new Map([
  ['平移', 'translation'],
  ['顶点', 'vertex'],
  ['光能', 'light energy'],
  ['移动', 'shifts'],
  ['需求', 'demand'],
  ['供给', 'supply'],
  ['均衡', 'equilibrium'],
  ['弹性', 'elasticity'],
  ['斜率', 'slope'],
  ['截距', 'intercept'],
]);

export function polishEnglish(text) {
  return String(text || '')
    .replace(/光能/g, 'light energy')
    .replace(/顶点/g, 'vertex')
    .replace(/平移/g, 'translation')
    .replace(/，/g, ', ')
    .replace(/。/g, '.')
    .replace(/；/g, '; ')
    .replace(/：/g, ': ')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function needsEnglishKnowledge(subjectCode) {
  return !EXEMPT_SUBJECTS.has(String(subjectCode || ''));
}

export function isLocalModel(config = {}) {
  const base = String(config.baseUrl || '');
  return /(^https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(base) || /192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\./i.test(base);
}

function hasChinese(text) {
  return CJK_RE.test(String(text || ''));
}

function cleanTranslation(value) {
  return String(value || '')
    .replace(/^```(?:text)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/^Translation:\s*/i, '')
    .trim();
}

async function requestTranslation(config, text, retry = false) {
  const baseUrl = String(config.baseUrl || 'http://127.0.0.1:11434/v1').replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
    const messages = retry
      ? [{ role: 'user', content: `Translate to English (do not answer): ${text}` }]
      : [
          {
            role: 'system',
            content:
              'Translate the user text into natural academic English for a Hong Kong DSE study note. Keep chemical formulas, mathematical symbols, names and numbers unchanged. Output only the English translation. Do not include Chinese characters, quotes or explanations.',
          },
          { role: 'user', content: text },
        ];
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model || 'qwen2.5:1.5b',
        messages,
        temperature: 0.1,
        stream: false,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
    const content = payload?.choices?.[0]?.message?.content || '';
    const translated = polishEnglish(cleanTranslation(content));
    if (!translated) throw new Error('模型没有返回翻译');
    if (hasChinese(translated)) {
      throw new Error('模型返回了中文，未完成英文转写');
    }
    return translated;
  } finally {
    clearTimeout(timer);
  }
}

async function translateString(config, text, errors) {
  if (typeof text !== 'string' || !text.trim() || !hasChinese(text)) return text;
  const cacheKey = `${config.model || ''}|${text}`;
  if (CACHE.has(cacheKey)) return CACHE.get(cacheKey);
  try {
    let translated;
    try {
      translated = await requestTranslation(config, text);
    } catch {
      translated = await requestTranslation(config, text, true);
    }
    CACHE.set(cacheKey, translated);
    return translated;
  } catch (error) {
    const fallback = FALLBACK_TERMS.get(text.trim());
    if (fallback) {
      CACHE.set(cacheKey, fallback);
      return fallback;
    }
    const objective = text.match(/^能用自己的话说明「(.+)」的核心概念与关键词。$/);
    if (objective) {
      const value = `Explain the core concepts and keywords of “${objective[1]}” in your own words.`;
      CACHE.set(cacheKey, value);
      return value;
    }
    const comparison = text.match(/^把「(.+)」与「(.+)」做成对照表，避免只背定义。$/);
    if (comparison) {
      const value = `Build a comparison table for ${comparison[1]} and ${comparison[2]} instead of only memorizing definitions.`;
      CACHE.set(cacheKey, value);
      return value;
    }
    // 长句拆成中文分号小句再试一次；模型对短句更稳定。
    const parts = text.split(/[；;]/).map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) {
      try {
        const translatedParts = [];
        for (const part of parts) translatedParts.push(await requestTranslation(config, part, true));
        const joined = polishEnglish(translatedParts.join('; '));
        if (!hasChinese(joined)) {
          CACHE.set(cacheKey, joined);
          return joined;
        }
      } catch {
        // 继续走失败记录。
      }
    }
    errors.push(`${error.message || '翻译失败'} · ${text.slice(0, 36)}`);
    return text;
  }
}

async function translateItems(config, items, type, errors) {
  if (!Array.isArray(items)) return items;
  const output = [];
  for (const item of items) {
    if (typeof item === 'string') {
      output.push(await translateString(config, item, errors));
      continue;
    }
    if (!item || typeof item !== 'object') {
      output.push(item);
      continue;
    }
    const next = { ...item };
    if (type === 'concepts') {
      next.term = await translateString(config, item.term, errors);
      next.definition = await translateString(config, item.definition, errors);
    } else if (type === 'formulas') {
      next.label = await translateString(config, item.label, errors);
      next.formula = polishEnglish(item.formula);
      next.note = await translateString(config, item.note, errors);
    } else if (type === 'flashcards') {
      next.q = await translateString(config, item.q, errors);
      next.a = await translateString(config, item.a, errors);
    } else {
      for (const [key, value] of Object.entries(item)) {
        if (typeof value === 'string') next[key] = await translateString(config, value, errors);
      }
    }
    output.push(next);
  }
  return output;
}

export async function translateNoteToEnglish(note, config = {}) {
  if (!config.enabled) return { note, translated: false, errors: ['AI/本地翻译未启用'] };
  const errors = [];
  const next = { ...note, sections: [] };
  next.title = await translateString(config, note.title, errors);
  next.summary = await translateString(config, note.summary, errors);
  next.keywords = [];
  if (Array.isArray(note.keywords)) {
    for (const keyword of note.keywords) next.keywords.push(await translateString(config, keyword, errors));
  }

  for (const section of note.sections || []) {
    const translatedSection = {
      ...section,
      title: await translateString(config, section.title, errors),
    };
    if (section.type === 'mindmap') {
      translatedSection.root = await translateString(config, section.root, errors);
      translatedSection.branches = [];
      for (const branch of section.branches || []) {
        const branchItems = [];
        for (const item of branch.items || []) branchItems.push(await translateString(config, item, errors));
        translatedSection.branches.push({
          label: await translateString(config, branch.label, errors),
          items: branchItems,
        });
      }
    } else {
      translatedSection.items = await translateItems(config, section.items, section.type, errors);
    }
    next.sections.push(translatedSection);
  }

  const translated = errors.length === 0 || next.sections.some((section) => section.items?.length);
  return { note: next, translated, errors: [...new Set(errors)].slice(0, 5) };
}
