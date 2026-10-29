const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.env.PORT) || 4173;

http.createServer((req, res) => {
  const name = req.url === '/escala.html' ? 'escala.html' : 'index.html';
  if (req.url !== '/' && req.url !== '/index.html' && req.url !== '/escala.html') {
    res.writeHead(404).end('No encontrado');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(path.join(__dirname, name)).pipe(res);
}).listen(port, '127.0.0.1', () => {
  console.log(`Web local: http://127.0.0.1:${port}`);
});
