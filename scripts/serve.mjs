import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '../dist'));
const projectPrefix = '/wing-nuts-6410-donation-guide';
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  try {
    let path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path.includes('\0') || path.includes('\\')) {
      response.writeHead(400);
      response.end('Invalid path');
      return;
    }
    if (path === projectPrefix) {
      response.writeHead(301, { Location: `${projectPrefix}/` });
      response.end();
      return;
    }
    if (path.startsWith(`${projectPrefix}/`)) {
      path = path.slice(projectPrefix.length);
    }

    const segments = path.split('/');
    if (segments.some((segment) => segment === '..' || segment.startsWith('.'))) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const relativePath = path.endsWith('/') ? `${path}index.html` : path;
    const candidate = resolve(root, `.${relativePath}`);
    if (!candidate.startsWith(`${root}${sep}`)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const file = await realpath(candidate);
    if (!file.startsWith(`${root}${sep}`) || !(await stat(file)).isFile()) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const data = await readFile(file);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(file)] || 'application/octet-stream',
      'Content-Length': data.length,
    });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch (error) {
    const badRequest = error instanceof URIError || error instanceof TypeError;
    response.writeHead(badRequest ? 400 : 404);
    response.end(badRequest ? 'Invalid request' : 'Not found');
  }
});

server.listen(port, host, () => {
  console.log(`Preview: http://${host}:${port}${projectPrefix}/`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
