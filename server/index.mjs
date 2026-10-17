import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { HOST, PORT, PUBLIC_DIR, APP_VERSION, DATA_DIR, ACCESS_PIN, PUBLIC_URL, TRUST_PROXY } from './config.mjs';
import { openDatabase } from './db.mjs';
import { handleApi, MIME } from './api.mjs';
import { getLanUrls } from './network.mjs';

const AUTH_HASH = ACCESS_PIN ? crypto.createHash('sha256').update(ACCESS_PIN).digest() : null;
const PUBLIC_ORIGIN = (() => {
  try {
    return PUBLIC_URL ? new URL(PUBLIC_URL).origin : '';
  } catch {
    return '';
  }
})();

function authorized(req) {
  if (!AUTH_HASH) return true;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    const password = separator >= 0 ? decoded.slice(separator + 1) : decoded;
    const digest = crypto.createHash('sha256').update(password).digest();
    return crypto.timingSafeEqual(digest, AUTH_HASH);
  } catch {
    return false;
  }
}


function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy':
      "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
  };
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const host = req.headers.host || '';
    if (parsed.host === host) return true;
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') return true;
    if (PUBLIC_ORIGIN && parsed.origin === PUBLIC_ORIGIN) return true;
    if (TRUST_PROXY) {
      const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
      if (forwardedHost && parsed.host === forwardedHost) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function serveStatic(req, res, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }
  if (decoded === '/') decoded = '/index.html';
  let target = path.resolve(PUBLIC_DIR, `.${decoded}`);
  const relative = path.relative(PUBLIC_DIR, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, 'index.html');
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    // 前端使用 hash 路由，未知的无扩展路径回到 index。
    if (!path.extname(decoded)) {
      target = path.join(PUBLIC_DIR, 'index.html');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
  }
  const ext = path.extname(target).toLowerCase();
  const stat = fs.statSync(target);
  const isHtml = ext === '.html';
  res.writeHead(200, {
    ...securityHeaders(),
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': isHtml ? 'no-cache' : ext === '.png' || ext === '.svg' ? 'public, max-age=86400' : 'no-cache',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(target).pipe(res);
}

export function createAppServer(db = openDatabase()) {
  const server = http.createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);
    } catch {
      res.writeHead(400);
      return res.end('Bad request');
    }

    if (!authorized(req)) {
      res.writeHead(401, {
        'Content-Type': 'text/plain; charset=utf-8',
        'WWW-Authenticate': 'Basic realm="Zhixu StudyDesk", charset="UTF-8"',
        'Cache-Control': 'no-store',
      });
      return res.end('需要访问密码。请输入启动服务器时设置的 STUDYDESK_PIN。');
    }

    if (url.pathname.startsWith('/api/')) {
      const method = req.method || 'GET';
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !originAllowed(req)) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: false, error: '跨站请求被拒绝。' }));
      }
      try {
        await handleApi(req, res, url, db);
      } catch (error) {
        const status = Number(error?.status) || 500;
        if (status >= 500) console.error('[api]', req.method, url.pathname, error);
        if (!res.headersSent) {
          res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(JSON.stringify({ ok: false, error: error?.message || '服务器内部错误。' }));
        } else {
          res.end();
        }
      }
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res, url.pathname);
    } else {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end('Method not allowed');
    }
  });

  server.on('clientError', (error, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });
  return server;
}

export function startServer({ port = PORT, host = HOST } = {}) {
  const db = openDatabase();
  const server = createAppServer(db);
  server.listen(port, host, () => {
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    console.log(`\n  知序 StudyDesk v${APP_VERSION}`);
    console.log(`  ➜  本机: http://127.0.0.1:${actualPort}`);
    if (host === '0.0.0.0' || host === '::' || host === '') {
      const lanUrls = getLanUrls(actualPort);
      if (lanUrls.length) {
        for (const item of lanUrls) {
          console.log(`  ➜  局域网: ${item.url}  (${item.name})`);
        }
        console.log('     手机/平板连同一个 Wi-Fi，用上面的局域网地址打开。');
        console.log('     若手机打不开：双击「打开局域网访问.cmd」并允许 UAC（只需一次）。');
      } else {
        console.log('  ! 未检测到局域网 IPv4 地址；请检查网络连接。');
      }
    } else {
      console.log(`  ➜  监听: http://${host}:${actualPort}`);
    }
      if (ACCESS_PIN) console.log('  🔒 已启用访问密码（STUDYDESK_PIN）');
      if (PUBLIC_URL) console.log(`  ➜  远程: ${PUBLIC_URL}`);
      console.log(`  ➜  data: ${DATA_DIR}\n`);
  });
  const shutdown = () => {
    console.log('\n[server] shutting down...');
    server.close(() => {
      try {
        db.close();
      } catch {
        // 忽略。
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  return { server, db };
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  startServer();
}
