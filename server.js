import http from 'http';
import fs from 'fs';
import { WebSocketServer } from 'ws';

const PORT = 3001;
const htmlFilePath = new URL('./public/index.html', import.meta.url);

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    fs.readFile(htmlFilePath, 'utf8', (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('500 Internal Server Error');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

const wss = new WebSocketServer({ server });
const clients = new Map();

wss.on('connection', (socket, req) => {
  const username = new URL(req.url, `http://localhost:${PORT}`).searchParams.get("username") || "Anonymous";
  clients.set(socket, username);

  broadcast({ type: 'system', text: `${username} joined the chat.` });

  socket.on('message', (rawData) => {
    try {
      const parsedData = JSON.parse(rawData.toString());
      
      const textContent = parsedData.text || '';

      broadcast({ 
        type: 'chat', 
        username: username, 
        text: textContent 
      });
    } catch (err) {
      broadcast({ 
        type: 'chat', 
        username: username, 
        text: rawData.toString() 
      });
    }
  });

  socket.on('close', () => {
    clients.delete(socket);
    broadcast({ type: 'system', text: `${username} left the chat.` });
  });
});

function broadcast(payload) {
  const dataString = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(dataString);
    }
  });
}

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
