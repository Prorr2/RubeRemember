import { Item, ItemType, UserSettings } from '../models/Item';

export interface DropboxAccountInfo {
  name: string;
  email: string;
}

export interface SyncResult {
  success: boolean;
  uploaded: boolean;
  reason?: string;
  error?: string;
}

export const DropboxService = {
  /**
   * Generates the filename for a specific slot index (1..8)
   */
  getSlotFileName(baseName: string = 'rube_remember_backup.json', slotIndex: number): string {
    const cleanBase = baseName.replace(/(_\d+)?\.json$/i, '');
    const validSlot = Math.max(1, Math.min(8, slotIndex));
    return `${cleanBase}_${validSlot}.json`;
  },

  /**
   * Checks if access token is expired (> 4 hours) or missing, and refreshes it using the Refresh Token if configured.
   * Updates userSettings in store with the new access token and tokenFetchedTimestamp.
   */
  async refreshAccessTokenIfNeeded(
    userSettings: UserSettings,
    updateUserSettings: (updates: Partial<UserSettings>) => Promise<void>,
    force: boolean = false
  ): Promise<string | null> {
    const refreshToken = this.cleanToken(userSettings.dropboxRefreshToken);
    const appKey = this.cleanToken(userSettings.dropboxAppKey);
    const appSecret = this.cleanToken(userSettings.dropboxAppSecret);

    const currentToken = this.cleanToken(userSettings.dropboxAccessToken);

    // If no refresh token configured, return existing access token
    if (!refreshToken) {
      return currentToken || null;
    }

    if (!appKey) {
      throw new Error('Se requiere ingresar el "App Key" (Client ID) de Dropbox para poder renovar el token.');
    }

    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
    const now = Date.now();
    const fetchedAt = userSettings.dropboxTokenFetchedTimestamp || 0;
    const timeSinceFetch = now - fetchedAt;
    const isExpired = timeSinceFetch >= FOUR_HOURS_MS;
    const hasAccessToken = !!currentToken;

    // Skip refresh if not forced, not expired (< 4h), and access token exists
    if (!force && !isExpired && hasAccessToken) {
      return currentToken;
    }

    console.log('[DropboxService] Refrescando Access Token con Refresh Token (Han pasado > 4h o token ausente)...');

    try {
      const bodyParams = new URLSearchParams();
      bodyParams.append('grant_type', 'refresh_token');
      bodyParams.append('refresh_token', refreshToken);
      if (appKey) bodyParams.append('client_id', appKey);
      if (appSecret) bodyParams.append('client_secret', appSecret);

      const response = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[DropboxService] Error en petición de refresh token:', response.status, errText);
        let msg = `Error al renovar token (${response.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error_description) {
            msg = parsed.error_description;
          } else if (parsed.error_summary) {
            msg = parsed.error_summary;
          }
        } catch (e) {}
        throw new Error(msg);
      }

      const data = await response.json();
      const newAccessToken = this.cleanToken(data.access_token);
      if (!newAccessToken) {
        throw new Error('Dropbox no devolvió un access_token válido.');
      }

      const timestamp = Date.now();
      console.log('[DropboxService] Nuevo Access Token guardado a las', new Date(timestamp).toLocaleTimeString('es-ES'));

      await updateUserSettings({
        dropboxAccessToken: newAccessToken,
        dropboxTokenFetchedTimestamp: timestamp,
      });

      return newAccessToken;
    } catch (err: any) {
      console.error('[DropboxService] Fallo al renovar Access Token:', err);
      if (force && !currentToken) {
        throw err;
      }
      return currentToken || null;
    }
  },

  /**
   * Helper to clean surrounding quotes and whitespace from tokens/credentials
   */
  cleanToken(token?: string): string {
    if (!token) return '';
    return token.replace(/^["']|["']$/g, '').trim();
  },

  /**
   * Get Current Account details from Dropbox API v2
   */
  async getAccountInfo(accessToken: string): Promise<DropboxAccountInfo> {
    const cleanAccToken = this.cleanToken(accessToken);
    if (!cleanAccToken) {
      throw new Error('El token de acceso a Dropbox está vacío.');
    }

    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanAccToken}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = `Error Dropbox (${response.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error_summary) {
          msg = parsed.error_summary;
        }
      } catch (e) {}
      throw new Error(msg);
    }

    const data = await response.json();
    return {
      name: data.name?.display_name || 'Usuario Dropbox',
      email: data.email || '',
    };
  },

  /**
   * Download remote backup file from Dropbox by filename
   */
  async downloadBackup(accessToken: string, fileName: string = 'rube_remember_backup_1.json'): Promise<string | null> {
    const cleanAccToken = this.cleanToken(accessToken);
    if (!cleanAccToken) {
      throw new Error('El token de acceso a Dropbox está vacío.');
    }

    const path = fileName.startsWith('/') ? fileName : `/${fileName}`;

    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanAccToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path }),
      },
    });

    if (response.status === 409 || response.status === 404) {
      // File not found on Dropbox
      return null;
    }

    if (!response.ok) {
      const errText = await response.text();
      let msg = `Error descargando de Dropbox (${response.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error_summary) {
          msg = parsed.error_summary;
        }
      } catch (e) {}
      throw new Error(msg);
    }

    return await response.text();
  },

  /**
   * Upload JSON backup string to Dropbox
   */
  async uploadBackup(accessToken: string, contentStr: string, fileName: string = 'rube_remember_backup_1.json'): Promise<void> {
    const cleanAccToken = this.cleanToken(accessToken);
    if (!cleanAccToken) {
      throw new Error('El token de acceso a Dropbox está vacío.');
    }

    const path = fileName.startsWith('/') ? fileName : `/${fileName}`;

    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanAccToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path,
          mode: 'overwrite',
          autorename: false,
          mute: false,
        }),
        'Content-Type': 'application/octet-stream',
      },
      body: contentStr,
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = `Error al subir a Dropbox (${response.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error_summary) {
          msg = parsed.error_summary;
        }
      } catch (e) {}
      throw new Error(msg);
    }
  },

  /**
   * Performs automated check & sync using a rotating 7-file scheme (rube_remember_backup_1..7.json)
   */
  async performAutoSync(params: {
    userSettings: UserSettings;
    items: Item[];
    exportBackupData: () => Promise<string>;
    updateUserSettings: (updates: Partial<UserSettings>) => Promise<void>;
    forceManual?: boolean;
    skipTenMinCheck?: boolean;
  }): Promise<SyncResult> {
    const { userSettings, items, exportBackupData, updateUserSettings, forceManual = false, skipTenMinCheck = false } = params;

    if (!forceManual && userSettings.dropboxAutoUploadEnabled === false) {
      return { success: false, uploaded: false, reason: 'disabled' };
    }

    // 1. Automatically refresh access token if expired (> 4 hours) or missing before proceeding
    let token: string | null = userSettings.dropboxAccessToken?.trim() || null;
    try {
      const refreshed = await this.refreshAccessTokenIfNeeded(userSettings, updateUserSettings);
      if (refreshed) {
        token = refreshed;
      }
    } catch (err: any) {
      console.warn('[DropboxSync] No se pudo renovar el token previo a la subida:', err);
    }

    if (!token) {
      return { success: false, uploaded: false, reason: 'no_token' };
    }

    const lastUpload = userSettings.lastDropboxUploadTimestamp || 0;
    const now = Date.now();
    const cooldownMinutes = userSettings.dropboxSyncCooldownMinutes ?? 60;
    const cooldownMs = cooldownMinutes * 60 * 1000;

    // Check if cooldown period has passed since last upload (skipped if forceManual or skipTenMinCheck)
    if (!forceManual && !skipTenMinCheck && (now - lastUpload) < cooldownMs) {
      return { success: true, uploaded: false, reason: 'too_recent' };
    }

    // Check local changes flag (skipped if forceManual)
    if (!forceManual && !userSettings.hasLocalChanges) {
      const timeFormatted = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const statusMsg = `Sin cambios pendientes (${timeFormatted})`;
      console.log('[DropboxSync]', statusMsg);
      await updateUserSettings({ lastDropboxUploadStatus: statusMsg, hasLocalChanges: false });
      return { success: true, uploaded: false, reason: 'no_local_changes' };
    }

    // Safety check: Count valid non-trash tasks
    const activeTasksCount = items.filter(i => i.type === ItemType.TASK && !i.trash).length;
    if (activeTasksCount === 0) {
      const statusMsg = `Subida cancelada por seguridad: BD con 0 tareas (${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})`;
      console.warn('[DropboxSync]', statusMsg);
      await updateUserSettings({ lastDropboxUploadStatus: statusMsg, hasLocalChanges: userSettings.hasLocalChanges ?? true });
      return {
        success: false,
        uploaded: false,
        reason: 'zero_tasks',
        error: 'El número de tareas en la base de datos es 0. Se ha cancelado la subida a Dropbox por seguridad para evitar sobreescribir la copia en la nube.'
      };
    }

    try {
      const localJson = await exportBackupData();

      // Calculate next slot index in 1..8 rotating scheme
      const currentSlot = userSettings.lastDropboxSlotIndex || 1;
      const nextSlot = lastUpload ? ((currentSlot % 8) + 1) : currentSlot;
      const targetFileName = this.getSlotFileName(userSettings.dropboxFileName, nextSlot);

      console.log(`[DropboxSync] Subiendo respaldo al Archivo #${nextSlot} (${targetFileName})...`);

      // Try uploading JSON to Dropbox (with auto-retry on token refresh if expired)
      try {
        await this.uploadBackup(token, localJson, targetFileName);
      } catch (uploadErr: any) {
        if (userSettings.dropboxRefreshToken) {
          console.log('[DropboxSync] Error al subir. Intentando forzar renovación del token...');
          const freshToken = await this.refreshAccessTokenIfNeeded(userSettings, updateUserSettings, true);
          if (freshToken) {
            token = freshToken;
            await this.uploadBackup(token, localJson, targetFileName);
          } else {
            throw uploadErr;
          }
        } else {
          throw uploadErr;
        }
      }

      const timestamp = Date.now();
      const timeFormatted = new Date(timestamp).toLocaleDateString('es-ES') + ' ' + new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const statusMsg = `Éxito en Archivo #${nextSlot} (${timeFormatted})`;

      // Update settings: mark hasLocalChanges = false and advance lastDropboxSlotIndex = nextSlot
      await updateUserSettings({
        lastDropboxUploadTimestamp: timestamp,
        lastDropboxUploadStatus: statusMsg,
        hasLocalChanges: false,
        lastDropboxSlotIndex: nextSlot,
      });

      console.log('[DropboxSync] Subida exitosa en slot', nextSlot, '(', targetFileName, ')');
      return { success: true, uploaded: true };
    } catch (e: any) {
      console.error('[DropboxSync] Error de auto-sincronización:', e);
      // CRITICAL REQUIREMENT: If cloud upload fails, never set hasLocalChanges to false. Keep hasLocalChanges: true so it retries on next cycle.
      await updateUserSettings({
        lastDropboxUploadStatus: `Error (${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}): ${e.message || String(e)}`,
        hasLocalChanges: true,
      });
      return { success: false, uploaded: false, error: e.message || String(e) };
    }
  }
};
