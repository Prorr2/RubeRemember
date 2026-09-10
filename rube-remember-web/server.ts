import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let currentPort = 3005;

interface SyncPayload {
  data: any;
  at: string;
}

let receivedData: SyncPayload | null = null;
let outgoingData: SyncPayload | null = null;
let lastSeenMobile = 0;
let pendingRequest = false;
let lastMergeStatus: any = null;

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
    (url === '/api/outgoing' && method === 'GET') ||
    (url === '/api/merge' && method === 'POST') ||
    (url === '/api/merge/status' && method === 'GET') ||
    (url === '/api/health' && method === 'GET')
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
    const hostHeader = req.headers.host || '';
    const portFromHeader = hostHeader.includes(':') ? parseInt(hostHeader.split(':')[1], 10) : currentPort;
    const port = portFromHeader || currentPort || 3005;

    const detectedIps = getNetworkIps();
    const networkIps = detectedIps.length > 0 ? detectedIps : ['127.0.0.1'];
    const qrCodes = networkIps.map((ip) => {
      const qrUrl = `http://${ip}:${port}`;
      return {
        ip,
        url: qrUrl,
        svg: generateQrSvg(qrUrl),
      };
    });

    return Promise.resolve(
      sendJson(res, 200, {
        ok: true,
        received: !!receivedData,
        outgoing: !!outgoingData,
        mobileConnected,
        qrCodes,
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

  // Mobile or Web submits data for intelligent merge
  if (url === '/api/merge' && method === 'POST') {
    touchMobile();
    return readBody(req)
      .then((body) => {
        try {
          const remoteData = JSON.parse(body);
          receivedData = { data: remoteData, at: new Date().toISOString() };
          lastMergeStatus = {
            at: new Date().toISOString(),
            status: 'received_for_merge',
            itemCount: remoteData.items ? remoteData.items.length : 0
          };
          return sendJson(res, 200, { ok: true, message: 'Datos recibidos para fusión inteligente (merge)', timestamp: Date.now() });
        } catch (e: any) {
          return sendJson(res, 400, { ok: false, error: 'JSON no válido: ' + e.message });
        }
      })
      .catch(() => sendJson(res, 500, { ok: false, error: 'Error al leer el cuerpo' }));
  }

  // Query status of last merge operation
  if (url === '/api/merge/status' && method === 'GET') {
    return Promise.resolve(sendJson(res, 200, { ok: true, status: lastMergeStatus }));
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
          const parsed = JSON.parse(body);
          // Zero-task safety protection: prevent sending an empty database to mobile
          const tasks = (parsed.items || []).filter((i: any) => i.type === 'TASK' && !i.trash);
          if (tasks.length === 0 && (!parsed.items || parsed.items.length === 0)) {
            console.warn('⚠️ [Sincronización - ZERO-TASK SAFETY]: Se bloqueó el envío de una base de datos vacía o con 0 tareas hacia el móvil para evitar pérdidas de datos.');
            return sendJson(res, 400, {
              ok: false,
              error: 'Zero-task safety: No se permite enviar una base de datos vacía o sin tareas activas al móvil para protegerlo contra pérdidas accidentales.'
            });
          }
          outgoingData = { data: parsed, at: new Date().toISOString() };
        } catch (e: any) {
          return sendJson(res, 400, { ok: false, error: 'JSON no válido: ' + e.message });
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

function getNetworkIps(): string[] {
  const interfaces = os.networkInterfaces();
  const networkIps: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        networkIps.push(iface.address);
      }
    }
  }
  return networkIps;
}

function generateQrSvg(text: string): string {
  try {
    const QRCode = require('qrcode-terminal/vendor/QRCode');
    const QRErrorCorrectLevel = require('qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel');
    const qr = new QRCode(-1, QRErrorCorrectLevel.L);
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    let rects = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="#000000" />`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${count + 4} ${count + 4}" width="160" height="160" style="background: #ffffff; border-radius: 8px; padding: 6px; display: block;">${rects}</svg>`;
  } catch (e) {
    return '';
  }
}

function printQrCodes(server: any) {
  const address = server.httpServer?.address();
  let port = currentPort;
  if (address && typeof address === 'object' && address.port) {
    port = address.port;
    currentPort = port;
  }

  const detectedIps = getNetworkIps();
  const networkIps = detectedIps.length > 0 ? detectedIps : ['127.0.0.1'];

  let qrcode: any = null;
  try {
    qrcode = require('qrcode-terminal');
  } catch (e) {
    console.error('⚠️ [Sync QR] Error al cargar qrcode-terminal:', e);
  }

  console.log('\n  ➜  Escanea el código QR para conectar el móvil (Sincronización Local):');
  for (const ip of networkIps) {
    const url = `http://${ip}:${port}`;
    console.log(`\n     Red: ${url}`);
    if (qrcode && typeof qrcode.generate === 'function') {
      qrcode.generate(url, { small: true });
    }
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
