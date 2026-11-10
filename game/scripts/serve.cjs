const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
};

function preview(directory) {
  const root = path.resolve(directory);
  return http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end();
      return;
    }
    const file = path.resolve(root, pathname === '/' ? 'index.html' : '.' + pathname);
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    fs.readFile(file, (error, body) => {
      if (error) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
      response.end(body);
    });
  });
}

if (require.main === module) {
  const directory = process.argv[2] ?? path.join(__dirname, '../dist/html5/Runway Rewind');
  const port = Number(process.argv[3] ?? 5174);
  preview(directory).listen(port, '127.0.0.1', () => {
    console.log(`Runway Rewind at http://127.0.0.1:${port}/`);
  });
}

module.exports = { preview };
