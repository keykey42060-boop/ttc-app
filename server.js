import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3003);
const logDirectory = path.join(__dirname, 'logs');
const logFile = path.join(logDirectory, 'app.log');

fs.mkdirSync(logDirectory, { recursive: true });
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, 'ClearRide app log initialized\n');
}

function appendLogLine(line) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${line}\n`);
}

app.use(express.json({ limit: '1mb' }));

app.post('/api/log', (req, res) => {
  const payload = req.body || {};
  const message = payload.message || 'Unknown error';
  const type = payload.type || 'error';
  const url = payload.url || 'unknown';
  const line = payload.line ? ` line ${payload.line}` : '';
  const column = payload.column ? ` col ${payload.column}` : '';
  const stack = payload.stack ? `\n${payload.stack}` : '';

  appendLogLine(`${type.toUpperCase()} ${message} | ${url}${line}${column}${stack}`);
  res.json({ ok: true });
});

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('App build not found yet. Please run npm run build first.');
  });
}

app.listen(port, () => {
  console.log(`ClearRide log server running on http://localhost:${port}`);
  console.log(`Log file: ${logFile}`);
  appendLogLine('SERVER STARTED');
});
