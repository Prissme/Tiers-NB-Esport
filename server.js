const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');
const { handleApiRequest, sendText } = require('./api');

loadEnv();

const PUBLIC_DIR = path.join(__dirname, 'public');
const DEFAULT_PORT = process.env.PORT || 3000;

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  try {
    const buffer = fs.readFileSync(envPath, 'utf8');
    buffer
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .forEach((line) => {
        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1) {
          return;
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
          process.env[key] = value;
        }
      });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Unable to read .env file:', error.message);
    }
  }
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

async function serveStatic(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    sendText(res, 405, 'Method Not Allowed');
    return;
  }

  const requestUrl = new URL(req.url, 'http://localhost');
  let relativePath = decodeURIComponent(requestUrl.pathname);

  if (relativePath === '/' || relativePath === '') {
    relativePath = '/index.html';
  }

  const resolvedPath = path.join(PUBLIC_DIR, relativePath);

  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    sendText(res, 404, 'Not Found');
    return;
  }

  try {
    let fileBuffer = await fs.promises.readFile(resolvedPath);

    if (path.basename(resolvedPath) === 'index.html') {
      fileBuffer = await injectAppConfig(fileBuffer);
    }

    const contentType = getContentType(resolvedPath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length
    });

    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(fileBuffer);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      await serveFallbackIndex(res, req.method);
    } else {
      console.error('Failed to serve static asset:', error);
      sendText(res, 500, 'Internal Server Error');
    }
  }
}

async function serveFallbackIndex(res, method = 'GET') {
  try {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const fileBuffer = await fs.promises.readFile(indexPath);
    const transformedBuffer = await injectAppConfig(fileBuffer);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': transformedBuffer.length
    });

    if (method === 'HEAD') {
      res.end();
    } else {
      res.end(transformedBuffer);
    }
  } catch (error) {
    console.error('Unable to load fallback index.html:', error);
    sendText(res, 500, 'Internal Server Error');
  }
}

async function injectAppConfig(fileBuffer) {
  const html = fileBuffer.toString('utf8');
  const script = buildAppConfigScript();

  if (!script) {
    return fileBuffer;
  }

  const closingHeadTag = '</head>';
  if (html.includes(closingHeadTag)) {
    const injectedHtml = html.replace(closingHeadTag, `${script}\n${closingHeadTag}`);
    return Buffer.from(injectedHtml, 'utf8');
  }

  const closingBodyTag = '</body>';
  if (html.includes(closingBodyTag)) {
    const injectedHtml = html.replace(closingBodyTag, `${script}\n${closingBodyTag}`);
    return Buffer.from(injectedHtml, 'utf8');
  }

  return Buffer.from(`${html}\n${script}`, 'utf8');
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const API_BASE = process.env.API_BASE || '';

const {
  SUPABASE_ANON_KEY: PRIMARY_SUPABASE_ANON_KEY,
  SUPABASE_PUBLIC_ANON_KEY,
  SUPABASE_PUBLIC_KEY,
  SUPABASE_KEY
} = process.env;

const PUBLIC_SUPABASE_KEYS = [
  { value: PRIMARY_SUPABASE_ANON_KEY, source: 'SUPABASE_ANON_KEY' },
  { value: SUPABASE_PUBLIC_ANON_KEY, source: 'SUPABASE_PUBLIC_ANON_KEY' },
  { value: SUPABASE_PUBLIC_KEY, source: 'SUPABASE_PUBLIC_KEY' }
];

const publicKeyEntry = PUBLIC_SUPABASE_KEYS.find((entry) => entry.value);
const resolvedAnonKey = publicKeyEntry ? publicKeyEntry.value : '';

if (!publicKeyEntry && SUPABASE_KEY) {
  console.warn(
    'Supabase service key detected but no anon/public key configured. '
      + 'Configure SUPABASE_ANON_KEY to allow Discord login.'
  );
}

if (!publicKeyEntry) {
  console.warn(
    'No public Supabase anon key detected. Set SUPABASE_ANON_KEY (or SUPABASE_PUBLIC_ANON_KEY/SUPABASE_PUBLIC_KEY) to enable client-side auth.'
  );
}

function buildAppConfigScript() {
  const config = {
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: resolvedAnonKey,
    apiBase: API_BASE
  };

  const serializedConfig = JSON.stringify(config)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  if (serializedConfig === undefined) {
    return '';
  }

  return `<script>window.APP_CONFIG = Object.assign({}, window.APP_CONFIG, ${serializedConfig});</script>`;
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const handled = await handleApiRequest(req, res);
      if (handled) {
        return;
      }

      await serveStatic(req, res);
    } catch (error) {
      console.error('Unexpected server error:', error);
      if (!res.headersSent) {
        sendText(res, 500, 'Internal Server Error');
      } else {
        res.end();
      }
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(DEFAULT_PORT, () => {
    console.log(`Server listening on port ${DEFAULT_PORT}`);
  });
}

module.exports = { createServer };
