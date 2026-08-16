import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import os from 'os';
// @ts-ignore
import qrcode from 'qrcode-terminal';


interface SyncPayload {
  data: any;
  at: string;
}

let receivedData: SyncPayload | null = null;
let outgoingData: SyncPayload | null = null;
let lastSeenMobile = 0;
let pendingRequest = false;

const MOBILE_TTL_MS = 15 * 1000; // 15 seconds visibility window

function isLocalhostRequest(req: IncomingMessage): boolean {
  const ip = req.socket.remoteAddress || '';
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.endsWith('127.0.0.1')
  );
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100 * 1024 * 1024) {
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, code: number, obj: any) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function isMobileApiRequest(url: string, method: string): boolean {
  return (
    (url === '/api/connect' && method === 'POST') ||
    (url === '/api/disconnect' && method === 'POST') ||
    (url === '/api/request' && method === 'GET') ||
    (url === '/api/backup' && method === 'POST') ||
    (url === '/api/outgoing' && method === 'GET')
  );
}

function apiMiddleware(req: IncomingMessage, res: ServerResponse): Promise<void> | undefined {
  const url = (req.url || '').split('?')[0];
  const method = req.method || 'GET';

  // Block any remote client trying to load web resources, assets, page, or web-only endpoints
  if (!isLocalhostRequest(req) && !isMobileApiRequest(url, method)) {
    const clientIp = req.socket.remoteAddress || 'desconocida';
    console.warn(`⚠️ [Sincronización - ACCESO BLOQUEADO]: Intento de cargar la web o recurso en '${url}' [${method}] desde la IP externa: ${clientIp}. Retornando HTTP 418.`);
    res.statusCode = 418;
    res.end();
    return Promise.resolve();
  }

  const touchMobile = () => {
    lastSeenMobile = Date.now();
  };

  // Health check: returns if mobile is active, if data is pending, etc.
  if (url === '/api/health' && method === 'GET') {
    const mobileConnected = Date.now() - lastSeenMobile < MOBILE_TTL_MS;
    return Promise.resolve(
      sendJson(res, 200, {
        ok: true,
        received: !!receivedData,
        outgoing: !!outgoingData,
        mobileConnected,
      })
    );
  }

  // Mobile connects (heartbeat / connection start)
  if (url === '/api/connect' && method === 'POST') {
    touchMobile();
    return Promise.resolve(sendJson(res, 200, { ok: true }));
  }

  // Mobile disconnects
  if (url === '/api/disconnect' && method === 'POST') {
    lastSeenMobile = 0;
    pendingRequest = false;
    return Promise.resolve(sendJson(res, 200, { ok: true }));
  }

  // --- WEB-ONLY ENDPOINTS (restricted to localhost for security) ---
  if (
    (url === '/api/request' && method === 'POST') ||
    (url === '/api/backup/latest' && method === 'GET') ||
    (url === '/api/outgoing' && method === 'POST')
  ) {
    if (!isLocalhostRequest(req)) {
      const clientIp = req.socket.remoteAddress || 'desconocida';
      console.warn(`⚠️ [Sincronización - ACCESO BLOQUEADO]: Intento de acceso no autorizado a '${url}' [${method}] desde la IP externa: ${clientIp}`);
      return Promise.resolve(
        sendJson(res, 403, { ok: false, error: 'Acceso denegado: solo permitido desde localhost (PC)' })
      );
    }
  }

  // Web requests mobile to send data
  if (url === '/api/request' && method === 'POST') {
    pendingRequest = true;
    return Promise.resolve(sendJson(res, 200, { ok: true }));
  }

  // Mobile polls: is the web asking for data?
  if (url === '/api/request' && method === 'GET') {
    touchMobile();
    const hasRequest = pendingRequest;
    if (hasRequest) {
      pendingRequest = false; // consume it
    }
    return Promise.resolve(sendJson(res, 200, { ok: true, request: hasRequest }));
  }

  // Mobile uploads its database
  if (url === '/api/backup' && method === 'POST') {
    touchMobile();
    return readBody(req)
      .then((body) => {
        try {
          receivedData = { data: JSON.parse(body), at: new Date().toISOString() };
        } catch (e) {
          return sendJson(res, 400, { ok: false, error: 'JSON no válido' });
        }
        return sendJson(res, 200, { ok: true });
      })
      .catch(() => sendJson(res, 500, { ok: false, error: 'Error al leer el cuerpo' }));
  }

  // Web pulls mobile database
  if (url === '/api/backup/latest' && method === 'GET') {
    const payload = receivedData;
    receivedData = null;
    return Promise.resolve(
      sendJson(res, 200, payload ? { data: payload.data, receivedAt: payload.at } : { data: null, receivedAt: null })
    );
  }

  // Web uploads database for mobile
  if (url === '/api/outgoing' && method === 'POST') {
    return readBody(req)
      .then((body) => {
        try {
          outgoingData = { data: JSON.parse(body), at: new Date().toISOString() };
        } catch (e) {
          return sendJson(res, 400, { ok: false, error: 'JSON no válido' });
        }
        return sendJson(res, 200, { ok: true });
      })
      .catch(() => sendJson(res, 500, { ok: false, error: 'Error al leer el cuerpo' }));
  }

  // Mobile pulls database from web
  if (url === '/api/outgoing' && method === 'GET') {
    touchMobile();
    const payload = outgoingData;
    outgoingData = null;
    return Promise.resolve(
      sendJson(res, 200, payload ? { data: payload.data, sentAt: payload.at } : { data: null, sentAt: null })
    );
  }

  return undefined;
}

function printQrCodes(server: any) {
  const address = server.httpServer?.address();
  if (!address || typeof address !== 'object') return;
  const port = address.port;

  const interfaces = os.networkInterfaces();
  const networkIps: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        networkIps.push(iface.address);
      }
    }
  }

  if (networkIps.length === 0) return;

  console.log('\n  ➜  Escanea el código QR para conectar el móvil (Sincronización Local):');
  for (const ip of networkIps) {
    const url = `http://${ip}:${port}`;
    console.log(`\n     Red: ${url}`);
    qrcode.generate(url, { small: true });
  }
  console.log('');
}

export function localSyncPlugin(): Plugin {
  return {
    name: 'local-sync',
    configureServer(server) {
      if (server.httpServer?.listening) {
        printQrCodes(server);
      } else {
        server.httpServer?.once('listening', () => {
          setTimeout(() => {
            printQrCodes(server);
          }, 100);
        });
      }

      server.middlewares.use((req, res, next) => {
        const handled = apiMiddleware(req, res);
        if (!handled) {
          next();
        } else {
          handled.catch(() => sendJson(res, 500, { ok: false, error: 'Error interno' }));
        }
      });
    },
    configurePreviewServer(server) {
      if (server.httpServer?.listening) {
        printQrCodes(server);
      } else {
        server.httpServer?.once('listening', () => {
          setTimeout(() => {
            printQrCodes(server);
          }, 100);
        });
      }

      server.middlewares.use((req, res, next) => {
        const handled = apiMiddleware(req, res);
        if (!handled) {
          next();
        } else {
          handled.catch(() => sendJson(res, 500, { ok: false, error: 'Error interno' }));
        }
      });
    },
  };
}
