export interface DropboxAccountInfo {
  name: string;
  email: string;
}

export interface SyncResult {
  success: boolean;
  uploaded: boolean;
  reason?: string;
  error?: string;
  deletedFiles?: string[];
}

export interface PairedBackupFiles {
  timestamp: number;
  textFile: { name: string; size: number };
  imagesFile?: { name: string; size: number };
  isLegacy?: boolean;
}

/**
 * Base64URL encoding without padding
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const DropboxService = {
  cleanToken(token?: string): string {
    if (!token) return '';
    return token.trim().replace(/^["']|["']$/g, '');
  },

  // ─── PKCE OAuth 2.0 Flow ───────────────────────────────────────────────────

  generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < array.length; i++) array[i] = Math.floor(Math.random() * 256);
    }
    return base64UrlEncode(array.buffer);
  },

  async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(hash);
  },

  getAuthUrl(appKey: string, redirectUri: string, codeChallenge: string): string {
    const cleanKey = this.cleanToken(appKey);
    const params = new URLSearchParams({
      client_id: cleanKey,
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: redirectUri,
      token_access_type: 'offline'
    });
    return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
  },

  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    appKey: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code.trim(),
      code_verifier: codeVerifier,
      client_id: this.cleanToken(appKey),
      redirect_uri: redirectUri
    });

    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error canjeando código de autorización (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      expiresIn: data.expires_in || 14400
    };
  },

  async refreshAccessToken(refreshToken: string, appKey: string): Promise<{ accessToken: string; expiresIn: number }> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.cleanToken(refreshToken),
      client_id: this.cleanToken(appKey)
    });

    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error refrescando token (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 14400
    };
  },

  // ─── File & Backup Management ──────────────────────────────────────────────

  getTimestampFileNames(timestamp: number = Date.now(), baseName: string = 'rube_remember_backup.json'): {
    text: string;
    images: string;
    timestamp: number;
  } {
    const cleanBase = baseName.replace(/(_\d+)?\.json$/i, '').replace(/_images$/i, '');
    const ts = timestamp;
    return {
      text: `${cleanBase}_${ts}.json`,
      images: `${cleanBase}_images_${ts}.json`,
      timestamp: ts
    };
  },

  getTimestampFromFileName(fileName: string): number {
    const match = fileName.match(/(\d{10,})\.json$/);
    return match ? parseInt(match[1], 10) : 0;
  },

  isBackupFileName(fileName: string, baseName: string = 'rube_remember_backup.json'): boolean {
    const cleanBase = baseName.replace(/(_\d+)?\.json$/i, '').replace(/_images$/i, '');
    return fileName.startsWith(cleanBase) && fileName.endsWith('.json');
  },

  async listBackupFiles(accessToken: string, baseName: string = 'rube_remember_backup.json'): Promise<Array<{ name: string; size: number }>> {
    const cleanToken = this.cleanToken(accessToken);
    if (!cleanToken) throw new Error('Token de Dropbox vacío');

    const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: '', recursive: false })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error listando archivos de Dropbox: ${err}`);
    }

    const data = await res.json();
    return (data.entries || [])
      .filter((e: any) => e['.tag'] === 'file' && this.isBackupFileName(e.name, baseName))
      .map((e: any) => ({ name: e.name, size: e.size || 0 }));
  },

  groupPairedBackups(files: Array<{ name: string; size: number }>): PairedBackupFiles[] {
    const pairedMap = new Map<number, PairedBackupFiles>();
    const legacy: PairedBackupFiles[] = [];

    for (const f of files) {
      const ts = this.getTimestampFromFileName(f.name);
      if (!ts) {
        legacy.push({ timestamp: 0, textFile: f, isLegacy: true });
        continue;
      }

      const isImages = f.name.includes('_images_');
      if (!pairedMap.has(ts)) {
        pairedMap.set(ts, {
          timestamp: ts,
          textFile: isImages ? { name: '', size: 0 } : f,
          imagesFile: isImages ? f : undefined
        });
      } else {
        const item = pairedMap.get(ts)!;
        if (isImages) {
          item.imagesFile = f;
        } else {
          item.textFile = f;
        }
      }
    }

    const result = Array.from(pairedMap.values()).filter(p => p.textFile.name !== '');
    return [...result, ...legacy].sort((a, b) => b.timestamp - a.timestamp);
  },

  async uploadFile(accessToken: string, fileName: string, content: string): Promise<void> {
    const cleanToken = this.cleanToken(accessToken);
    const path = fileName.startsWith('/') ? fileName : `/${fileName}`;

    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path,
          mode: 'overwrite',
          autorename: false,
          mute: true
        }),
        'Content-Type': 'application/octet-stream'
      },
      body: content
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error subiendo ${fileName} a Dropbox: ${err}`);
    }
  },

  async downloadFile(accessToken: string, fileName: string): Promise<string> {
    const cleanToken = this.cleanToken(accessToken);
    const path = fileName.startsWith('/') ? fileName : `/${fileName}`;

    const res = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path })
      }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error descargando ${fileName} de Dropbox: ${err}`);
    }

    return await res.text();
  },

  async downloadPairedBackup(
    accessToken: string,
    textFileName: string
  ): Promise<{ text: string; images?: Record<string, string> }> {
    const textContent = await this.downloadFile(accessToken, textFileName);
    const ts = this.getTimestampFromFileName(textFileName);
    let images: Record<string, string> | undefined;

    if (ts > 0) {
      const pairNames = this.getTimestampFileNames(ts, textFileName);
      try {
        const imagesContent = await this.downloadFile(accessToken, pairNames.images);
        images = JSON.parse(imagesContent);
      } catch (e) {
        console.info('[DropboxService] No se encontró o falló el bundle de imágenes pareado:', e);
      }
    }

    return { text: textContent, images };
  },

  async uploadPairedBackup(
    accessToken: string,
    textContent: string,
    imagesBundle?: Record<string, string>,
    baseName: string = 'rube_remember_backup.json'
  ): Promise<{ textFileName: string; imagesFileName?: string; timestamp: number }> {
    const ts = Date.now();
    const names = this.getTimestampFileNames(ts, baseName);

    // 1. Upload text DB
    await this.uploadFile(accessToken, names.text, textContent);

    // 2. Upload images bundle if provided
    let imagesFileName: string | undefined;
    if (imagesBundle && Object.keys(imagesBundle).length > 0) {
      await this.uploadFile(accessToken, names.images, JSON.stringify(imagesBundle));
      imagesFileName = names.images;
    }

    return {
      textFileName: names.text,
      imagesFileName,
      timestamp: ts
    };
  },

  async deleteFile(accessToken: string, fileName: string): Promise<void> {
    const cleanToken = this.cleanToken(accessToken);
    const path = fileName.startsWith('/') ? fileName : `/${fileName}`;

    const res = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error eliminando ${fileName} de Dropbox: ${err}`);
    }
  },

  async cleanupOldSnapshots(
    accessToken: string,
    budgetMB: number = 1500,
    baseName: string = 'rube_remember_backup.json'
  ): Promise<{ deleted: string[] }> {
    const maxBytes = Math.max(50, budgetMB) * 1024 * 1024;
    const files = await this.listBackupFiles(accessToken, baseName);
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

    const deleted: string[] = [];
    if (totalBytes <= maxBytes) {
      return { deleted };
    }

    // Sort oldest first
    const pairs = this.groupPairedBackups(files).sort((a, b) => a.timestamp - b.timestamp);
    let currentBytes = totalBytes;

    for (const pair of pairs) {
      if (currentBytes <= maxBytes) break;

      if (pair.textFile?.name) {
        try {
          await this.deleteFile(accessToken, pair.textFile.name);
          deleted.push(pair.textFile.name);
          currentBytes -= pair.textFile.size;
        } catch (e) {
          console.warn('[DropboxService] Error borrando snapshot antiguo:', e);
        }
      }

      if (pair.imagesFile?.name) {
        try {
          await this.deleteFile(accessToken, pair.imagesFile.name);
          deleted.push(pair.imagesFile.name);
          currentBytes -= pair.imagesFile.size;
        } catch (e) {
          console.warn('[DropboxService] Error borrando snapshot de imagen antiguo:', e);
        }
      }
    }

    return { deleted };
  },

  hasSuspiciousCommentLoss(localCommentsCount: number, lastUploadedCommentCount: number): boolean {
    if (!lastUploadedCommentCount || lastUploadedCommentCount <= 0) return false;
    if (localCommentsCount === 0 && lastUploadedCommentCount > 0) return true;
    if (lastUploadedCommentCount >= 10 && localCommentsCount < lastUploadedCommentCount / 2) return true;
    return false;
  },

  async getCurrentAccount(accessToken: string): Promise<DropboxAccountInfo> {
    const cleanToken = this.cleanToken(accessToken);
    const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cleanToken}` }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error obteniendo cuenta de Dropbox: ${err}`);
    }

    const data = await res.json();
    return {
      name: data.name?.display_name || 'Usuario Dropbox',
      email: data.email || ''
    };
  }
};
