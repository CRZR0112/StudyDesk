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
export const MAX_UPLOAD_BYTES = 24 * 1024 * 1024;
export const APP_VERSION = '0.3.3';
