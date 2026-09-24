const LOG_KEY = 'clearride_error_log';
const MAX_LOG_ENTRIES = 200;

type LogEntry = {
  timestamp: string;
  type: 'error' | 'unhandledrejection' | 'console.error';
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
};

function safeSerialize(value: unknown): string {
  try {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.stack || value.message || 'Unknown error';
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function readLogEntries(): LogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function sendLogToServer(entry: LogEntry): Promise<void> {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    // ignore server logging failures; the browser fallback still keeps the log locally.
  }
}

export function getErrorLogText(): string {
  const entries = readLogEntries();
  if (entries.length === 0) {
    return 'No app errors captured yet.\n';
  }

  return entries
    .map((entry) => {
      const meta = [
        `time: ${entry.timestamp}`,
        `type: ${entry.type}`,
        entry.url ? `url: ${entry.url}` : null,
        typeof entry.line === 'number' ? `line: ${entry.line}` : null,
        typeof entry.column === 'number' ? `column: ${entry.column}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      return `[${meta}]\n${entry.message}${entry.stack ? `\n${entry.stack}` : ''}\n`;
    })
    .join('\n---\n');
}

export function clearErrorLog(): void {
  try {
    localStorage.removeItem(LOG_KEY);
  } catch {
    // ignore storage errors
  }
}

export function appendErrorLog(
  type: LogEntry['type'],
  message: string,
  details?: { stack?: string; url?: string; line?: number; column?: number }
): void {
  try {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      stack: details?.stack,
      url: details?.url,
      line: details?.line,
      column: details?.column,
    };

    const entries = readLogEntries();
    entries.push(entry);

    while (entries.length > MAX_LOG_ENTRIES) {
      entries.shift();
    }

    localStorage.setItem(LOG_KEY, JSON.stringify(entries));
    void sendLogToServer(entry);
  } catch {
    // ignore storage failures
  }
}

export function downloadErrorLog(filename = `clearride-error-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`): void {
  const text = getErrorLogText();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function initErrorLogger(): void {
  if ((window as Window & { __clearrideErrorLogger?: boolean }).__clearrideErrorLogger) {
    return;
  }

  (window as Window & { __clearrideErrorLogger?: boolean }).__clearrideErrorLogger = true;

  const capture = (type: LogEntry['type'], message: string, details?: { stack?: string; url?: string; line?: number; column?: number }) => {
    appendErrorLog(type, message, details);
  };

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const message = args.map(safeSerialize).join(' ');
    capture('console.error', message, {
      stack: args.find((value) => value instanceof Error)?.stack || undefined,
    });
    originalConsoleError(...args);
  };

  window.addEventListener('error', (event) => {
    capture('error', event.message || 'Uncaught error', {
      stack: event.error?.stack || undefined,
      url: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    capture('unhandledrejection', safeSerialize(event.reason), {
      stack: event.reason instanceof Error ? event.reason.stack : undefined,
    });
  });
}
