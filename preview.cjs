'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { readParticipants, getDefaultSource } = require('./prepare.cjs');
const defaultSource = getDefaultSource();
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/assets/elecsoc-logo.png', ['assets/elecsoc-logo.png', 'image/png']],
  ['/assets/printer.png', ['assets/printer.png', 'image/png']],
  ['/assets/tiki-tiki.mp3', ['assets/tiki-tiki.mp3', 'audio/mpeg']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/raffle.js', ['raffle.js', 'text/javascript; charset=utf-8']]
]);
function createPreviewServer(source = defaultSource) {
  return http.createServer((req, res) => {
    const routePath = (req.url || '/').split('?')[0];
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    if (routePath === '/.local/participants.js') {
      try {
        // Refresh reads the saved file again. Only names leave this local handler.
        const { participants } = readParticipants(source);
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.end(req.method === 'HEAD' ? undefined : `window.RAFFLE_DATA = ${JSON.stringify({ participants })};`);
      } catch {
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.end(req.method === 'HEAD' ? undefined : 'window.RAFFLE_DATA = null;');
      }
      return;
    }
    const route = routes.get(routePath);
    if (!route) { res.writeHead(404); res.end('Not found'); return; }
    fs.readFile(path.join(__dirname, route[0]), (error, data) => {
      if (error) { res.writeHead(500); res.end('Preview unavailable'); return; }
      res.setHeader('Content-Type', route[1]);
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
}
if (require.main === module) {
  const source = process.argv[2] ? path.resolve(process.argv[2]) : defaultSource;
  createPreviewServer(source).listen(4173, '127.0.0.1', () => console.log('Preview ready: http://127.0.0.1:4173'));
}
module.exports = { createPreviewServer };
