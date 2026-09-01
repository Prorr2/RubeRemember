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
   * Get Current Account details from Dropbox API v2
   */
  async getAccountInfo(accessToken: string): Promise<DropboxAccountInfo> {
    if (!accessToken || !accessToken.trim()) {
      throw new Error('El token de acceso a Dropbox está vacío.');
    }

    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
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
   * Download remote backup file from Dropbox
   */
  async downloadBackup(accessToken: string, fileName: string = 'rube_remember_backup.json'): Promise<string | null> {
    if (!accessToken || !accessToken.trim()) {
      throw new Error('El token de acceso a Dropbox está vacío.');
    }

    const path = fileName.startsWith('/') ? fileName : `/${fileName}`;

    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
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
  async uploadBackup(accessToken: string, contentStr: string, fileName: string = 'rube_remember_backup.json'): Promise<void> {
    if (!accessToken || !accessToken.trim()) {
      throw new Error('El token de acceso a Dropbox está vacío.');
    }

    const path = fileName.startsWith('/') ? fileName : `/${fileName}`;

    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
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
   * Performs automated check & sync if conditions are met:
   * 1. Access token configured & auto sync enabled
   * 2. > 10 min since last upload
   * 3. hasLocalChanges === true (flag indicating local DB was modified since last upload)
   * 4. Safety check: Total tasks count > 0 (prevents overwriting remote with empty/corrupted DB)
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

    const token = userSettings.dropboxAccessToken;
    if (!token || !token.trim()) {
      return { success: false, uploaded: false, reason: 'no_token' };
    }

    if (!forceManual && userSettings.dropboxAutoUploadEnabled === false) {
      return { success: false, uploaded: false, reason: 'disabled' };
    }

    const lastUpload = userSettings.lastDropboxUploadTimestamp || 0;
    const now = Date.now();
    const cooldownMinutes = userSettings.dropboxSyncCooldownMinutes ?? 10;
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
      await updateUserSettings({ lastDropboxUploadStatus: statusMsg, hasLocalChanges: userSettings.hasLocalChanges });
      return {
        success: false,
        uploaded: false,
        reason: 'zero_tasks',
        error: 'El número de tareas en la base de datos es 0. Se ha cancelado la subida a Dropbox por seguridad para evitar sobreescribir la copia en la nube.'
      };
    }

    try {
      const localJson = await exportBackupData();
      const fileName = userSettings.dropboxFileName || 'rube_remember_backup.json';

      // Upload JSON to Dropbox
      await this.uploadBackup(token, localJson, fileName);

      const timestamp = Date.now();
      const timeFormatted = new Date(timestamp).toLocaleDateString('es-ES') + ' ' + new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const statusMsg = `Éxito (${timeFormatted})`;

      // Mark hasLocalChanges = false after successful upload
      await updateUserSettings({
        lastDropboxUploadTimestamp: timestamp,
        lastDropboxUploadStatus: statusMsg,
        hasLocalChanges: false,
      });

      console.log('[DropboxSync] Subida exitosa a Dropbox en', timeFormatted, '- hasLocalChanges reseteado a false');
      return { success: true, uploaded: true };
    } catch (e: any) {
      console.error('[DropboxSync] Error de auto-sincronización:', e);
      await updateUserSettings({
        lastDropboxUploadStatus: `Error (${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}): ${e.message || String(e)}`,
        hasLocalChanges: true, // Preserve true so it retries on next cycle
      });
      return { success: false, uploaded: false, error: e.message || String(e) };
    }
  }
};
