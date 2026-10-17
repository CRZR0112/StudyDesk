// 文件内容提取：纯文本、Markdown、DOCX、PPTX、XLSX、PDF 与图片 OCR。
// 不引入原生依赖，保证在 Node 内置运行时即可启动。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { ocrImage } from './ocr.mjs';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tif', '.tiff']);
const TEXT_EXT = new Set(['.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.html', '.htm', '.xml', '.yaml', '.yml', '.log', '.rtf']);
const DOC_EXT = new Set(['.docx', '.pptx', '.xlsx', '.pdf']);

function extensionOf(filename = '') {
  return path.extname(filename).toLowerCase();
}

export function detectKind(filename, mime = '') {
  const ext = extensionOf(filename);
  if (IMAGE_EXT.has(ext) || /^image\//.test(mime)) return 'image';
  if (ext === '.docx') return 'docx';
  if (ext === '.pptx') return 'pptx';
  if (ext === '.xlsx') return 'xlsx';
  if (ext === '.pdf' || mime === 'application/pdf') return 'pdf';
  if (TEXT_EXT.has(ext) || /^text\//.test(mime) || mime === 'application/json') return 'text';
  if (ext === '.doc') return 'unsupported';
  return 'unknown';
}

export function decodeTextBuffer(buffer) {
  if (!buffer || buffer.length === 0) return '';
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buffer.subarray(2));
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(buffer.subarray(2));
  }
  let text = new TextDecoder('utf-8').decode(buffer);
  const bad = (text.match(/\ufffd/g) || []).length;
  if (bad > 3 && bad / Math.max(1, text.length) > 0.002) {
    try {
      const gb = new TextDecoder('gb18030').decode(buffer);
      const gbBad = (gb.match(/\ufffd/g) || []).length;
      if (gbBad < bad) text = gb;
    } catch {
      // 忽略：部分精简 ICU 构建不支持 gb18030。
    }
  }
  return text.replace(/^\ufeff/, '');
}

export function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>|<\/tr>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeXmlEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

// ---------- 极简 ZIP 读取器（DOCX/PPTX/XLSX 共用） ----------
function readZipEntries(buffer) {
  const entries = new Map();
  const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('不是有效的 ZIP / Office 文件');
  const count = buffer.readUInt16LE(eocd + 10);
  const cdOffset = buffer.readUInt32LE(eocd + 16);
  let pointer = cdOffset;
  for (let i = 0; i < count; i += 1) {
    if (pointer + 46 > buffer.length) break;
    if (buffer.readUInt32LE(pointer) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(pointer + 10);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const uncompressedSize = buffer.readUInt32LE(pointer + 24);
    const nameLen = buffer.readUInt16LE(pointer + 28);
    const extraLen = buffer.readUInt16LE(pointer + 30);
    const commentLen = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.subarray(pointer + 46, pointer + 46 + nameLen).toString('utf8');
    if (compressedSize > 60 * 1024 * 1024 || uncompressedSize > 120 * 1024 * 1024) {
      pointer += 46 + nameLen + extraLen + commentLen;
      continue;
    }
    if (localOffset + 30 <= buffer.length && buffer.readUInt32LE(localOffset) === 0x04034b50) {
      const localNameLen = buffer.readUInt16LE(localOffset + 26);
      const localExtraLen = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLen + localExtraLen;
      const data = buffer.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) {
        entries.set(name, Buffer.from(data));
      } else if (method === 8) {
        try {
          entries.set(name, zlib.inflateRawSync(data));
        } catch {
          // 跳过损坏条目。
        }
      }
    }
    pointer += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function docxToText(buffer) {
  const entries = readZipEntries(buffer);
  const xml = entries.get('word/document.xml');
  if (!xml) throw new Error('DOCX 中找不到 word/document.xml');
  let text = xml.toString('utf8');
  text = text
    .replace(/<w:tab[^>]*\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<\/w:tc>/g, '\t');
  text = text.replace(/<w:t[^>]*>/g, '').replace(/<\/w:t>/g, '');
  text = text.replace(/<[^>]+>/g, '');
  return decodeXmlEntities(text).replace(/\n{3,}/g, '\n\n').trim();
}

function pptxToText(buffer) {
  const entries = readZipEntries(buffer);
  const slides = [...entries.keys()]
    .map((name) => ({ name, match: name.match(/^ppt\/slides\/slide(\d+)\.xml$/) }))
    .filter((item) => item.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));
  const chunks = [];
  for (const slide of slides) {
    const xml = entries.get(slide.name).toString('utf8');
    const texts = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXmlEntities(m[1]));
    if (texts.length) chunks.push(`第 ${slide.match[1]} 页\n${texts.join('\n')}`);
  }
  if (!chunks.length) throw new Error('PPTX 中没有可提取的文字');
  return chunks.join('\n\n');
}

function xlsxToText(buffer) {
  const entries = readZipEntries(buffer);
  const sharedXml = entries.get('xl/sharedStrings.xml')?.toString('utf8') || '';
  const shared = [];
  for (const match of sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const texts = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXmlEntities(m[1]));
    shared.push(texts.join(''));
  }
  const sheets = [...entries.keys()]
    .map((name) => ({ name, match: name.match(/^xl\/worksheets\/sheet(\d+)\.xml$/) }))
    .filter((item) => item.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));
  const output = [];
  for (const sheet of sheets) {
    const xml = entries.get(sheet.name).toString('utf8');
    const rows = [];
    for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = [];
      for (const cellMatch of rowMatch[1].matchAll(/<c[^>]*r="([A-Z]+\d+)"[^>]*?(?:t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g)) {
        const ref = cellMatch[1];
        const type = cellMatch[2];
        const inner = cellMatch[3];
        let value = '';
        if (type === 's') {
          const idx = Number((inner.match(/<v>(\d+)<\/v>/) || [])[1]);
          value = shared[idx] ?? '';
        } else if (type === 'inlineStr') {
          value = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXmlEntities(m[1])).join('');
        } else {
          value = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || '';
          value = decodeXmlEntities(value);
        }
        if (value) cells.push(`${ref}: ${value}`);
      }
      if (cells.length) rows.push(cells.join(' | '));
    }
    if (rows.length) output.push(`[工作表 ${sheet.match[1]}]\n${rows.join('\n')}`);
  }
  if (!output.length) throw new Error('XLSX 中没有可提取的文字');
  return output.join('\n\n');
}

// ---------- PDF 文本层提取 ----------
function decodePdfLiteral(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (char !== '\\') {
      out += char;
      continue;
    }
    i += 1;
    const next = raw[i];
    if (next === undefined) break;
    if (next === 'n') out += '\n';
    else if (next === 'r') out += '\r';
    else if (next === 't') out += '\t';
    else if (next === 'b') out += '\b';
    else if (next === 'f') out += '\f';
    else if (next === '(' || next === ')' || next === '\\') out += next;
    else if (/[0-7]/.test(next)) {
      let oct = next;
      for (let j = 0; j < 2 && /[0-7]/.test(raw[i + 1]); j += 1) oct += raw[++i];
      out += String.fromCharCode(parseInt(oct, 8));
    } else if (next === '\n') {
      // 续行
    } else {
      out += next;
    }
  }
  return out;
}

function pdfContentToText(content) {
  let out = '';
  let pending = '';
  const tokenRe = /\((?:\\[\s\S]|[^\\()])*\)|<[0-9A-Fa-f\s]+>|\bBT\b|\bET\b|\bT[Jj]\b|\bTD\b|\bTd\b|\bT\*\b|\bTJ\b|\bTj\b/g;
  for (const match of content.matchAll(tokenRe)) {
    const token = match[0];
    if (token.startsWith('(')) {
      pending += decodePdfLiteral(token.slice(1, -1));
    } else if (token.startsWith('<')) {
      const hex = token.slice(1, -1).replace(/\s+/g, '');
      if (hex.length % 2 === 0 && /^[0-9A-Fa-f]+$/.test(hex)) {
        const bytes = Buffer.from(hex, 'hex');
        // 优先按 UTF-16BE（含 BOM 或双字节文本）解释，否则按 Latin-1。
        let decoded = '';
        if (bytes.length >= 2 && bytes.length % 2 === 0) {
          try {
            decoded = new TextDecoder('utf-16be').decode(bytes);
          } catch {
            decoded = '';
          }
        }
        const printable = decoded.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/g, '');
        if (decoded && printable.length / decoded.length > 0.7) pending += decoded;
        else pending += bytes.toString('latin1');
      }
    } else if (token === 'Tj' || token === 'TJ') {
      out += pending;
      pending = '';
    } else if (token === 'Td' || token === 'TD' || token === 'T*' || token === 'ET') {
      out += pending ? `${pending}\n` : '\n';
      pending = '';
    }
  }
  return out;
}

function pdfToText(buffer) {
  const chunks = [];
  const haystack = buffer.toString('latin1');
  let index = 0;
  while (index < buffer.length) {
    const streamAt = haystack.indexOf('stream', index);
    if (streamAt < 0) break;
    const dictStart = haystack.lastIndexOf('<<', streamAt);
    const dict = haystack.slice(Math.max(0, dictStart), streamAt);
    let dataStart = streamAt + 6;
    if (buffer[dataStart] === 0x0d) dataStart += 1;
    if (buffer[dataStart] === 0x0a) dataStart += 1;
    const endAt = haystack.indexOf('endstream', dataStart);
    if (endAt < 0) break;
    let data = buffer.subarray(dataStart, endAt);
    if (/FlateDecode/i.test(dict)) {
      try {
        data = zlib.inflateSync(data);
      } catch {
        index = endAt + 9;
        continue;
      }
    }
    if (/\/Subtype\s*\/Image/i.test(dict) || /\/Type\s*\/XObject/i.test(dict)) {
      index = endAt + 9;
      continue;
    }
    const content = data.toString('latin1');
    if (/(BT|Tj|TJ)/.test(content)) {
      const text = pdfContentToText(content);
      if (text.trim()) chunks.push(text.trim());
    }
    index = endAt + 9;
  }
  let text = chunks.join('\n');
  text = text
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const printable = text.replace(/\s/g, '');
  if (!printable || /[\ufffd]{2,}/.test(text)) {
    throw new Error('这个 PDF 可能是扫描件，或使用了未能识别的字体编码。请把页面截图后用「图片」上传，我们会用 OCR 识别。');
  }
  return text;
}

function tempPath(prefix, ext) {
  return path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
}

export async function extractFromUpload({ buffer, filename = '未命名', mime = '', filePath = '' }) {
  const kind = detectKind(filename, mime);
  const warnings = [];
  let text = '';
  let ocr = false;
  let extractedKind = kind;

  if (!buffer || buffer.length === 0) {
    throw new Error('文件是空的。');
  }

  if (kind === 'image') {
    ocr = true;
    const temporary = filePath || tempPath('studydesk-ocr', extensionOf(filename) || '.png');
    try {
      if (!filePath) fs.writeFileSync(temporary, buffer);
      const result = await ocrImage(temporary);
      text = result.text;
      warnings.push('图片文字由 Windows OCR 识别，专有名词、公式与标点可能有误，请对照原图校对。');
    } catch (error) {
      warnings.push(`图片已保存，但自动 OCR 未能完成：${error.message}`);
      text = '';
    } finally {
      if (!filePath) {
        try {
          fs.unlinkSync(temporary);
        } catch {
          // 忽略临时文件清理失败。
        }
      }
    }
    if (!text.trim()) {
      throw new Error(
        '未能从图片中识别文字。请确认图片清晰、文字方向正确；也可以把图片中的文字粘贴到「文字」输入框，图片会保留为附件。',
      );
    }
  } else if (kind === 'docx') {
    text = docxToText(buffer);
  } else if (kind === 'pptx') {
    text = pptxToText(buffer);
  } else if (kind === 'xlsx') {
    text = xlsxToText(buffer);
  } else if (kind === 'pdf') {
    text = pdfToText(buffer);
    warnings.push('PDF 仅提取文字层；图表、公式排版可能丢失，建议对照原文件。');
  } else if (kind === 'text') {
    const ext = extensionOf(filename);
    const raw = decodeTextBuffer(buffer);
    text = ext === '.html' || ext === '.htm' ? stripHtml(raw) : raw;
    if (ext === '.rtf') {
      text = raw
        .replace(/\\par[d]?/g, '\n')
        .replace(/\{\\[^{}]+\}/g, '')
        .replace(/\\[a-z]+\d* ?/gi, '')
        .replace(/[{}]/g, '');
    }
  } else if (kind === 'unsupported') {
    throw new Error('暂不支持旧版 .doc 文件。请另存为 .docx 或 PDF 后上传。');
  } else {
    // 未知类型：尝试当作文本读，失败再报错。
    const raw = decodeTextBuffer(buffer);
    const control = (raw.match(/[\u0000-\u0008\u000e-\u001f]/g) || []).length;
    const printable = raw.length - control;
    if (raw.length > 0 && printable / raw.length > 0.9) {
      text = raw;
      warnings.push('未能识别文件类型，已按纯文本尝试读取。');
    } else {
      throw new Error('暂不支持这种文件类型。可上传 .txt / .md / .docx / .pptx / .xlsx / .pdf 或图片。');
    }
  }

  text = text.trim();
  if (!text) throw new Error('文件中没有可提取的文字。');
  if (text.length > 200000) {
    text = text.slice(0, 200000);
    warnings.push('文件较长，本次只归纳前 200,000 个字符。');
  }
  return { text, kind: extractedKind, ocr, warnings };
}
