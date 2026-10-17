import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { DATA_DIR } from './config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(here, 'scripts', 'ocr.ps1');
const TMP_DIR = path.join(DATA_DIR, 'tmp');

function normalizeOcrLine(line) {
  return String(line || '')
    .replace(/\bthetr\b/gi, 'their')
    .replace(/\bSoIution\b/g, 'Solution')
    .replace(/\bExampIe\b/g, 'Example')
    .replace(/\bFoIIowing\b/g, 'Following')
    .replace(/\bt0\b/g, 'to')
    .replace(/\b0f\b/g, 'of')
    .replace(/([A-Za-z])0([A-Za-z])/g, '$1o$2')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isGarbageOcrLine(line) {
  const compact = String(line || '').replace(/\s+/g, '');
  if (compact.length < 2) return true;
  const letters = (compact.match(/[A-Za-z]/g) || []).length;
  const cjk = (compact.match(/[\u3400-\u9fff]/g) || []).length;
  const digits = (compact.match(/\d/g) || []).length;
  if (cjk === 0 && letters === 0) return true;
  if (cjk === 0 && letters >= 4 && !/[aeiouyAEIOUY]/.test(compact)) return true;
  if (cjk === 0 && letters > 0 && letters / compact.length < 0.35) return true;
  if (/^[（(【[\]】)）:：;；,，.。·_\-—=+]+$/.test(compact)) return true;
  return false;
}


export function ocrAvailable() {
  return process.platform === 'win32' && fs.existsSync(SCRIPT);
}

export async function ocrImage(imagePath) {
  if (!ocrAvailable()) {
    throw new Error('当前系统没有可用的 Windows OCR。');
  }
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const outputPath = path.join(TMP_DIR, `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      SCRIPT,
      '-ImagePath',
      imagePath,
      '-OutputPath',
      outputPath,
    ],
    { windowsHide: true, stdio: 'ignore', timeout: 90000 },
  );
  try {
    if (result.error) {
      throw new Error(`无法启动 OCR 程序：${result.error.message}`);
    }
    if (!fs.existsSync(outputPath)) {
      throw new Error('OCR 程序没有返回结果。');
    }
    const raw = fs.readFileSync(outputPath, 'utf8').replace(/^\ufeff/, '');
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('OCR 返回了无法解析的结果。');
    }
    if (!data.ok) {
      throw new Error(data.error || 'OCR 识别失败。');
    }
    const rawLines = (data.lines || []).map(normalizeOcrLine).filter((line) => line && !isGarbageOcrLine(line));
    let text = rawLines.join('\n').trim();
    if (!text) throw new Error('图片中没有识别到可用文字。');
    // 清理 OCR 常见的逐字空格与错误标点。
    text = text
      .replace(/([\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g, '$1')
      .replace(/[ \t]+([，。；：、！？])/g, '$1')
      .replace(/(\d)[ \t]*[·•][ \t]*/g, '$1. ')
      .replace(/[•·][ \t]*/g, '')
      .replace(/，{2,}/g, '，')
      .replace(/。{2,}/g, '。');
    return { text, lines: rawLines, language: data.language || 'zh-Hans-CN' };
  } finally {
    try {
      fs.unlinkSync(outputPath);
    } catch {
      // 忽略清理失败。
    }
  }
}
