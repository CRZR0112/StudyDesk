import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const DATA_DIR = process.env.STUDYDESK_DATA_DIR
  ? path.resolve(process.env.STUDYDESK_DATA_DIR)
  : path.join(ROOT, 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const DB_FILE = path.join(DATA_DIR, 'studydesk.db');
export const PORT = Number(process.env.PORT || process.env.STUDYDESK_PORT || 4173);
// 0.0.0.0 = 允许同一局域网的手机/平板访问；只想本机使用可设 HOST=127.0.0.1。
export const HOST = process.env.HOST || '0.0.0.0';
export const ACCESS_PIN = process.env.STUDYDESK_PIN || '';
// 通过 Tailscale Serve / 反向代理访问时设置，例如 https://my-pc.tailnet.ts.net
export const PUBLIC_URL = String(process.env.STUDYDESK_PUBLIC_URL || process.env.PUBLIC_URL || '')
  .trim()
  .replace(/\/+$/, '');
// 只有在你确认反向代理可信时才开启；用于读取 X-Forwarded-Host。
export const TRUST_PROXY = process.env.STUDYDESK_TRUST_PROXY === '1' || process.env.TRUST_PROXY === '1';
export const MAX_UPLOAD_BYTES = 24 * 1024 * 1024;
export const APP_VERSION = '0.4.0';
