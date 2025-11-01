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
    const fileBuffer = await fs.promises.readFile(resolvedPath);
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
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': fileBuffer.length
    });

    if (method === 'HEAD') {
      res.end();
    } else {
      res.end(fileBuffer);
    }
  } catch (error) {
    console.error('Unable to load fallback index.html:', error);
    sendText(res, 500, 'Internal Server Error');
  }
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
