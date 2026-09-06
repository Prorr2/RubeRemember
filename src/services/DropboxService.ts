import { Item, ItemType, Task, UserSettings } from '../models/Item';

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
  failedDeletes?: string[];
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
   * Generates timestamp-paired filenames for the text backup and its images bundle.
   * Example: rube_remember_backup_1712345678901.json + rube_remember_images_1712345678901.json
   */
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
      timestamp: ts,
    };
  },

  /**
   * Parses the timestamp out of a timestamped backup filename. Returns 0 if not parseable.
   */
  getTimestampFromFileName(fileName: string): number {
    const match = fileName.match(/(\d{10,})\.json$/);
    return match ? parseInt(match[1], 10) : 0;
  },

  /**
   * Returns true if the given filename belongs to this app's backup naming scheme.
   */
  isBackupFileName(fileName: string, baseName: string = 'rube_remember_backup.json'): boolean {
    const cleanBase = baseName.replace(/(_\d+)?\.json$/i, '').replace(/_images$/i, '');
    return fileName.startsWith(cleanBase) && fileName.endsWith('.json');
  },

  /**
   * Lists files in the app folder prefix of Dropbox, returning name + size (bytes).
   */
  async listBackupFiles(accessToken: string, baseName: string = 'rube_remember_backup.json'): Promise<Array<{ name: string; size: number }>> {
    const cleanAccToken = this.cleanToken(accessToken);
    if (!cleanAccToken) {
      throw new Error('El token de acceso a Dropbox está vacío.');
    }

    const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanAccToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: '', recursive: false }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = `Error listando archivos de Dropbox (${response.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error_summary) {
          msg = parsed.error_summary;
        }
      } catch (e) {}
      throw new Error(msg);
    }

    const data = await response.json();
    const entries: Array<{ name: string; size: number }> = (data.entries || [])
      .filter((e: any) => e['.tag'] === 'file')
      .map((e: any) => ({ name: e.name, size: e.size || 0 }))
      .filter((e: any) => this.isBackupFileName(e.name, baseName));

    return entries;
  },

  /**
   * Deletes a single file from Dropbox (files/delete_v2). Missing file is treated as success.
   */
  async deleteFile(accessToken: string, fileName: string): Promise<void> {
    const cleanAccToken = this.cleanToken(accessToken);
    if (!cleanAccToken) {
      throw new Error('El token de acceso a Dropbox está vacío.');
    }
    const path = fileName.startsWith('/') ? fileName : `/${fileName}`;
    const response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanAccToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });
    if (!response.ok && response.status !== 409) {
      const errText = await response.text();
      let msg = `Error borrando archivo de Dropbox (${response.status})`;
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
   * Enforces the storage budget: given the remote file list, computes how many of the OLDEST
   * paired snapshots must be deleted so the total remote size stays under the budget. Returns
   * the list of file names to delete (oldest first).
   *
   * Safety guarantee: the newest snapshot is NEVER deleted. Even if a single backup alone
   * exceeds the budget, the latest cloud copy is always preserved so rotation can never
   * wipe all backups.
   */
  computeFilesToDeleteForBudget(
    files: Array<{ name: string; size: number }>,
    budgetBytes: number
  ): string[] {
    // Group into paired snapshots by timestamp (text + images share the same timestamp).
    const snapshots: Record<number, Array<{ name: string; size: number }>> = {};
    for (const f of files) {
      const ts = this.getTimestampFromFileName(f.name);
      if (ts <= 0) {
        continue; // legacy non-timestamped backups are excluded from rotation
      }
      if (!snapshots[ts]) {
        snapshots[ts] = [];
      }
      snapshots[ts].push(f);
    }

    const snapshotEntries = Object.keys(snapshots)
      .map((ts) => parseInt(ts, 10))
      .sort((a, b) => a - b)
      .map((ts) => ({
        ts,
        size: snapshots[ts].reduce((sum, f) => sum + f.size, 0),
        files: snapshots[ts].map((f) => f.name),
      }));

    // Iterate oldest -> newest, but never touch the newest snapshot.
    const deletable = snapshotEntries.slice(0, -1);

    let toDelete: string[] = [];
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    let currentSize = totalSize;

    for (const snap of deletable) {
      if (currentSize <= budgetBytes) {
        break;
      }
      toDelete.push(...snap.files);
      currentSize -= snap.size;
    }

    return toDelete;
  },

  /**
   * Deletes a list of files with automatic retries. Always pairs text + images together
   * (they are whole snapshots). Returns which files were deleted and which failed.
   */
  async deleteFilesWithRetry(
    accessToken: string,
    toDelete: string[],
    maxAttempts: number = 2
  ): Promise<{ deleted: string[]; failed: string[] }> {
    const deleted: string[] = [];
    const failed: string[] = [];
    for (const f of toDelete) {
      let deletedOne = false;
      for (let attempt = 1; attempt <= maxAttempts && !deletedOne; attempt++) {
        try {
          await this.deleteFile(accessToken, f);
          deletedOne = true;
        } catch (e: any) {
          console.warn(`[DropboxSync] Fallo al borrar ${f} (intento ${attempt}/${maxAttempts}):`, e.message || String(e));
        }
      }
      if (deletedOne) {
        deleted.push(f);
      } else {
        failed.push(f);
      }
    }
    return { deleted, failed };
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
   * Counts the total number of comments across all active (non-trash) tasks.
   * Used to detect catastrophic data loss before uploading to the cloud.
   */
  countActiveComments(items: Item[]): number {
    return items.reduce((total, item) => {
      if (item.type === ItemType.TASK && !item.trash) {
        const task = item as Task;
        total += (task.comments || []).length;
      }
      return total;
    }, 0);
  },

  /**
   * Detects a potential catastrophic loss of task comments before overwriting the cloud backup.
   * Returns true if the current comment count is suspiciously lower than the last successfully
   * uploaded count, which would indicate all Task.comments were wiped from the database.
   */
  hasSuspiciousCommentLoss(
    currentCount: number,
    lastUploadedCount: number | undefined,
    activeTasksCount: number
  ): boolean {
    // No previous record of comment count uploaded: can't detect regression, allow upload.
    if (lastUploadedCount === undefined || lastUploadedCount === null) return false;
    // If there are no active tasks, upload is already blocked elsewhere (zero_tasks).
    if (activeTasksCount === 0) return false;
    // If last upload had zero comments and current also has zero, nothing to lose.
    if (lastUploadedCount === 0 && currentCount === 0) return false;
    // If last upload recorded comments but current has none, this is almost certainly data loss.
    if (lastUploadedCount > 0 && currentCount === 0) return true;
    // Guard against drastic partial loss (e.g. dropped below 50% of the previous count).
    // Only trigger on a meaningful drop (previous had a substantial baseline).
    if (lastUploadedCount >= 10 && currentCount < Math.floor(lastUploadedCount / 2)) {
      return true;
    }
    return false;
  },

  /**
   * Performs automated check & sync using a rotating set of timestamp-paired snapshots
   * (rube_remember_backup_<TS>.json + rube_remember_images_<TS>.json) with budget-based cleanup.
   */
  async performAutoSync(params: {
    userSettings: UserSettings;
    items: Item[];
    exportBackupData: () => Promise<string>;
    exportBackupDataSplit?: () => Promise<{ text: string; images: Record<string, string> }>;
    updateUserSettings: (updates: Partial<UserSettings>) => Promise<void>;
    forceManual?: boolean;
    skipTenMinCheck?: boolean;
    skipCommentIntegrityCheck?: boolean;
    skipBudgetCheck?: boolean;
    onBudgetCleanup?: (toDelete: string[]) => Promise<boolean> | boolean;
  }): Promise<SyncResult> {
    const {
      userSettings,
      items,
      exportBackupData,
      exportBackupDataSplit,
      updateUserSettings,
      forceManual = false,
      skipTenMinCheck = false,
      skipCommentIntegrityCheck = false,
      skipBudgetCheck = false,
      onBudgetCleanup,
    } = params;

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

    // Integrity check: detect catastrophic loss of task comments before overwriting the cloud backup.
    // Skips the existing "zero_tasks" scenario (already handled above) and any manual forced bypass.
    if (!forceManual && !skipCommentIntegrityCheck) {
      const activeTasks = items.filter(i => i.type === ItemType.TASK && !i.trash);
      const currentCommentCount = this.countActiveComments(items);
      const lastUploadedCommentCount = userSettings.lastDropboxCommentCount;
      const lastUpload = userSettings.lastDropboxUploadTimestamp || 0;

      // Only enforce protection once we have a previous upload to compare against.
      const hasPreviousUpload = lastUpload > 0;

      if (hasPreviousUpload && this.hasSuspiciousCommentLoss(currentCommentCount, lastUploadedCommentCount, activeTasks.length)) {
        const statusMsg = `Subida CANCELADA por integridad: se detectó pérdida de comentarios de tareas. Actual: ${currentCommentCount}, previo subido: ${lastUploadedCommentCount ?? 0} (${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})`;
        console.warn('[DropboxSync]', statusMsg);
        await updateUserSettings({ lastDropboxUploadStatus: statusMsg, hasLocalChanges: userSettings.hasLocalChanges ?? true });
        return {
          success: false,
          uploaded: false,
          reason: 'comments_lost',
          error: 'Se detectó una pérdida masiva de comentarios/notas en las tareas. La subida a la nube se canceló por seguridad para no sobreescribir la copia con datos vacíos. Revisa la base de datos local antes de forzar una subida manual.'
        };
      }
    }

    try {
      // Compute budget (MB) from settings; default 1500 MB, never less than 50 MB.
      const budgetMb = Math.max(50, userSettings.dropboxStorageBudgetMB ?? 1500);
      const budgetBytes = budgetMb * 1024 * 1024;

      const fileNames = this.getTimestampFileNames(Date.now(), userSettings.dropboxFileName);
      const targetTextFile = fileNames.text;
      const targetImagesFile = fileNames.images;

      let textJson = await exportBackupData();
      let imagesJson: string | null = null;

      if (exportBackupDataSplit) {
        const split = await exportBackupDataSplit();
        textJson = split.text;
        imagesJson = JSON.stringify(split.images);
      }

      console.log(`[DropboxSync] Subiendo respaldo (${targetTextFile}) y bundle de imágenes (${targetImagesFile})...`);

      // Try uploading both files to Dropbox (with auto-retry on token refresh if expired)
      const performUpload = async () => {
        await this.uploadBackup(token as string, textJson, targetTextFile);
        if (imagesJson) {
          await this.uploadBackup(token as string, imagesJson, targetImagesFile);
        }
      };

      try {
        await performUpload();
      } catch (uploadErr: any) {
        if (userSettings.dropboxRefreshToken) {
          console.log('[DropboxSync] Error al subir. Intentando forzar renovación del token...');
          const freshToken = await this.refreshAccessTokenIfNeeded(userSettings, updateUserSettings, true);
          if (freshToken) {
            token = freshToken;
            await performUpload();
          } else {
            throw uploadErr;
          }
        } else {
          throw uploadErr;
        }
      }

      // Enforce budget: list remote backup files and delete the oldest snapshots until under budget.
      let deletedDuringSync: string[] = [];
      let failedDeletesDuringSync: string[] = [];
      if (!skipBudgetCheck) {
        try {
          const remoteFiles = await this.listBackupFiles(token, userSettings.dropboxFileName);
          const toDelete = this.computeFilesToDeleteForBudget(remoteFiles, budgetBytes);
          if (toDelete.length > 0) {
            let proceed = true;
            if (onBudgetCleanup) {
              try {
                proceed = await onBudgetCleanup([...toDelete]);
              } catch (cbErr: any) {
                console.warn('[DropboxSync] onBudgetCleanup falló, se procede con borrado seguro:', cbErr);
              }
            }
            if (proceed) {
              const outcome = await this.deleteFilesWithRetry(token, toDelete);
              deletedDuringSync = outcome.deleted;
              failedDeletesDuringSync = outcome.failed;
              console.log(`[DropboxSync] Presupuesto ${budgetMb}MB: liberando espacio, borrados ${deletedDuringSync.length} archivo(s) antiguo(s):`, deletedDuringSync);
              if (failedDeletesDuringSync.length > 0) {
                console.warn('[DropboxSync] No se pudieron borrar estos archivos (se reintentarán en la próxima sync):', failedDeletesDuringSync);
              }
            } else {
              console.log(`[DropboxSync] Presupuesto ${budgetMb}MB: el usuario canceló la rotación, no se borró ningún archivo.`);
            }
          } else {
            console.log(`[DropboxSync] Presupuesto ${budgetMb}MB: dentro del límite, sin archivos por borrar.`);
          }
        } catch (listErr: any) {
          // Listing/budget enforcement is best-effort; uploading succeeded so don't fail the sync.
          console.warn('[DropboxSync] No se pudo verificar el presupuesto de Dropbox:', listErr);
        }
      }

      const timestamp = Date.now();
      const timeFormatted = new Date(timestamp).toLocaleDateString('es-ES') + ' ' + new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const statusMsg = `Éxito (${timeFormatted})`;

      // Update settings: mark hasLocalChanges = false and record upload metadata
      const commentCount = this.countActiveComments(items);
      await updateUserSettings({
        lastDropboxUploadTimestamp: timestamp,
        lastDropboxUploadStatus: statusMsg,
        hasLocalChanges: false,
        lastDropboxSlotIndex: 1,
        lastDropboxCommentCount: commentCount,
        lastDropboxSnapshotFiles: [targetTextFile, targetImagesFile].filter(Boolean),
      });

      console.log('[DropboxSync] Subida exitosa (', targetTextFile, ',', targetImagesFile, ')');
      return { success: true, uploaded: true, deletedFiles: deletedDuringSync, failedDeletes: failedDeletesDuringSync };
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
