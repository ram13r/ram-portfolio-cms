const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 4175;
const DATA = path.join(ROOT, 'data.json');
const MEDIA = path.join(ROOT, 'media_uploads');
const BACKUPS = path.join(ROOT, 'backups');

fs.mkdirSync(MEDIA, { recursive: true });
fs.mkdirSync(BACKUPS, { recursive: true });

// Active session tokens
const activeTokens = new Set();
const ADMIN_EMAIL = 'rambhardwaj3@gmail.com';
const ADMIN_PASS = 'Ram@Portfolio2026';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.m4v': 'video/x-m4v',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.ttf': 'font/ttf'
};

function send(res, code, body, type = 'text/plain') {
  if (res.headersSent) return;
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function safeName(name) {
  const ext = path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, '');
  return Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext;
}

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA, 'utf8'));
  } catch {
    return { projects: [], reels: [], brochures: [], logos: [], services: [], stats: [], settings: {}, profile: {} };
  }
}

function writeData(obj, backup = true) {
  if (backup && fs.existsSync(DATA)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(DATA, path.join(BACKUPS, `data-${stamp}.json`));
    const all = fs.readdirSync(BACKUPS).sort();
    while (all.length > 30) fs.rmSync(path.join(BACKUPS, all.shift()), { force: true });
  }
  const tmp = DATA + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, DATA);
}

function upsertUploaded(kind, id, title, url, original) {
  if (!kind || !id) return;
  const d = readData();
  const map = { video: ['reels', 'video'], brochure: ['brochures', 'pdf'], logo: ['logos', 'image'] };
  const cfg = map[kind];
  if (!cfg) return;
  const [arr, field] = cfg;
  d[arr] = d[arr] || [];
  let item = d[arr].find(x => x.id === id);
  if (!item) {
    item = {
      id,
      title: title || original.replace(/\.[^.]+$/, ''),
      category: kind === 'video' ? 'Video' : kind === 'brochure' ? 'PDF Brochure' : 'Logo',
      year: String(new Date().getFullYear()),
      order: d[arr].length + 1,
      description: ''
    };
    if (kind === 'video') Object.assign(item, { poster: '' });
    if (kind === 'brochure') Object.assign(item, { cover: '' });
    if (kind === 'logo') Object.assign(item, { subtitle: 'Brand mark', color: '#e91f2a', mark: 'letter', watermark: false });
    d[arr].push(item);
  }
  item[field] = url;
  if (title) item.title = title;
  if (kind === 'logo') item.name = title || item.name || 'Custom Logo';
  writeData(d);
}

function reconcileMedia() {
  const d = readData();
  const refs = new Set();
  for (const x of d.reels || []) if (x.video) refs.add(path.basename(x.video));
  for (const x of d.brochures || []) if (x.pdf) refs.add(path.basename(x.pdf));
  
  let changed = false;
  if (!fs.existsSync(MEDIA)) return;
  
  for (const fn of fs.readdirSync(MEDIA)) {
    if (fn.endsWith('.meta.json') || fn.includes('-poster.')) continue;
    const ext = path.extname(fn).toLowerCase();
    if (refs.has(fn)) continue;
    
    let meta = {};
    try {
      meta = JSON.parse(fs.readFileSync(path.join(MEDIA, fn + '.meta.json')));
    } catch {}
    
    const url = '/media_uploads/' + fn;
    const title = (meta.original || fn).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    
    if (['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi'].includes(ext)) {
      d.reels = d.reels || [];
      d.reels.push({
        id: 'recovered-video-' + Date.now() + '-' + Math.random().toString(36).slice(2),
        title,
        category: 'Recovered Video',
        year: String(new Date().getFullYear()),
        order: d.reels.length + 1,
        video: url,
        poster: '',
        description: 'Automatically recovered uploaded video.'
      });
      changed = true;
    } else if (ext === '.pdf') {
      d.brochures = d.brochures || [];
      d.brochures.push({
        id: 'recovered-pdf-' + Date.now() + '-' + Math.random().toString(36).slice(2),
        title,
        category: 'Recovered PDF',
        year: String(new Date().getFullYear()),
        order: d.brochures.length + 1,
        pdf: url,
        cover: '',
        description: 'Automatically recovered uploaded brochure.'
      });
      changed = true;
    }
  }
  if (changed) writeData(d);
}

function serveFile(req, res, file) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Not found');
  const stat = fs.statSync(file);
  const type = mime[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range;
  
  if (range && (type.startsWith('video/') || type === 'application/pdf')) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? Number(m[1]) : 0;
    let end = m && m[2] ? Number(m[2]) : stat.size - 1;
    end = Math.min(end, stat.size - 1);
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(file).pipe(res);
  }
}

// Ensure media is reconciled on startup
reconcileMedia();

// Active session tokens & HMAC stateless auth
const activeTokens = new Set();
const ADMIN_EMAIL = 'rambhardwaj3@gmail.com';
const ADMIN_PASS = 'Ram@Portfolio2026';
const ADMIN_SECRET = 'ram-portfolio-secret-key-2026';

function generateAuthToken(email) {
  return crypto.createHmac('sha256', ADMIN_SECRET).update(email.toLowerCase().trim() + ':' + ADMIN_PASS).digest('hex');
}

// Helper to authenticate request
function isAuthenticated(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7);
  return token === generateAuthToken(ADMIN_EMAIL) || activeTokens.has(token);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // Handle Login
  if (url.pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        if (email.toLowerCase().trim() === ADMIN_EMAIL && password === ADMIN_PASS) {
          const token = generateAuthToken(ADMIN_EMAIL);
          activeTokens.add(token);
          return send(res, 200, JSON.stringify({ ok: true, token }), 'application/json');
        }
        send(res, 401, JSON.stringify({ ok: false, error: 'Invalid credentials' }), 'application/json');
      } catch (e) {
        send(res, 400, JSON.stringify({ ok: false, error: 'Bad request' }), 'application/json');
      }
    });
    return;
  }

  // Handle Logout
  if (url.pathname === '/api/logout' && req.method === 'POST') {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      activeTokens.delete(authHeader.substring(7));
    }
    return send(res, 200, JSON.stringify({ ok: true }), 'application/json');
  }

  // Handle Data Read
  if (url.pathname === '/api/data' && req.method === 'GET') {
    return serveFile(req, res, DATA);
  }

  // Auth check for POST /api/data and POST /api/upload
  if ((url.pathname === '/api/data' || url.pathname === '/api/upload') && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      return send(res, 401, JSON.stringify({ ok: false, error: 'Unauthorized' }), 'application/json');
    }
  }

  // Handle Data Write
  if (url.pathname === '/api/data' && req.method === 'POST') {
    let chunks = [], size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > 15 * 1024 * 1024) req.destroy();
      else chunks.push(c);
    });
    req.on('end', () => {
      try {
        const obj = JSON.parse(Buffer.concat(chunks));
        writeData(obj);
        send(res, 200, JSON.stringify({ ok: true }), 'application/json');
      } catch (e) {
        send(res, 400, JSON.stringify({ ok: false, error: e.message }), 'application/json');
      }
    });
    return;
  }

  // Handle File Upload
  if (url.pathname === '/api/upload' && req.method === 'POST') {
    const raw = decodeURIComponent(req.headers['x-file-name'] || 'file.bin');
    
    // Security check for file extensions
    const forbiddenExts = ['.html', '.htm', '.js', '.php'];
    const ext = path.extname(raw).toLowerCase();
    if (forbiddenExts.includes(ext)) {
      return send(res, 400, JSON.stringify({ ok: false, error: 'File type not allowed' }), 'application/json');
    }

    const name = safeName(raw);
    const dest = path.join(MEDIA, name);
    const max = 300 * 1024 * 1024;
    const kind = req.headers['x-media-kind'] || '';
    const id = decodeURIComponent(req.headers['x-item-id'] || '');
    const title = decodeURIComponent(req.headers['x-item-title'] || '');
    
    let size = 0;
    const out = fs.createWriteStream(dest);
    let ended = false, failed = false;
    
    req.on('data', c => {
      size += c.length;
      if (size > max) {
        failed = true;
        out.destroy();
        fs.rmSync(dest, { force: true });
        req.destroy();
      } else {
        out.write(c);
      }
    });
    
    req.on('end', () => {
      ended = true;
      out.end();
    });
    
    out.on('finish', () => {
      if (!ended || failed) return;
      const url = '/media_uploads/' + name;
      
      fs.writeFileSync(dest + '.meta.json', JSON.stringify({
        original: raw,
        type: req.headers['content-type'],
        size,
        kind,
        id,
        title,
        uploadedAt: new Date().toISOString()
      }, null, 2));
      
      try {
        upsertUploaded(kind, id, title, url, raw);
      } catch (e) {
        console.error('upsert failed', e);
      }
      
      send(res, 200, JSON.stringify({ ok: true, url, name: raw, size }), 'application/json');
    });
    return;
  }

  // Serve Static Files
  let rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^\/+/, '');
  let file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden');
  serveFile(req, res, file);
});

server.listen(PORT, '0.0.0.0', () => console.log(`RAM Portfolio CMS http://0.0.0.0:${PORT}`));