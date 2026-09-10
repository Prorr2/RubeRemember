import React, { useState, useEffect } from 'react';
import { useRememberStore, rememberStore } from '../../store';
import { DropboxService, PairedBackupFiles, DropboxAccountInfo } from '../../services/DropboxService';

export const DropboxView: React.FC = () => {
  const store = useRememberStore();
  const settings = store.userSettings;

  const [accountInfo, setAccountInfo] = useState<DropboxAccountInfo | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [cloudBackups, setCloudBackups] = useState<PairedBackupFiles[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [appKeyInput, setAppKeyInput] = useState(settings.dropboxAppKey || '');
  const [storageBudgetMB, setStorageBudgetMB] = useState(settings.dropboxStorageBudgetMB || 1500);

  const isConnected = !!settings.dropboxAccessToken;

  // 1. Detect OAuth redirect callback with code in URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const storedVerifier = sessionStorage.getItem('rube_dropbox_verifier');

    if (code && storedVerifier && appKeyInput) {
      setSyncing(true);
      setStatusMessage({ text: 'Intercambiando código OAuth por tokens de Dropbox...', type: 'info' });

      const redirectUri = window.location.origin + window.location.pathname;
      DropboxService.exchangeCodeForTokens(code, storedVerifier, appKeyInput, redirectUri)
        .then((tokens) => {
          rememberStore.updateUserSettings({
            dropboxAccessToken: tokens.accessToken,
            dropboxRefreshToken: tokens.refreshToken,
            dropboxTokenFetchedTimestamp: Date.now(),
            lastDropboxUploadStatus: 'Conectado exitosamente con Dropbox'
          });
          sessionStorage.removeItem('rube_dropbox_verifier');
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          setStatusMessage({ text: '✅ Conexión con Dropbox autorizada con éxito.', type: 'success' });
        })
        .catch((err) => {
          console.error('[DropboxView] OAuth callback error:', err);
          setStatusMessage({ text: `❌ Error de autorización: ${err.message}`, type: 'error' });
        })
        .finally(() => setSyncing(false));
    }
  }, [appKeyInput]);

  // 2. Fetch Account Info when connected
  useEffect(() => {
    if (isConnected && settings.dropboxAccessToken) {
      setLoadingAccount(true);
      DropboxService.getCurrentAccount(settings.dropboxAccessToken)
        .then(info => setAccountInfo(info))
        .catch(err => {
          console.warn('[DropboxView] Could not fetch account info:', err);
          // Try refresh if token expired
          if (settings.dropboxRefreshToken && settings.dropboxAppKey) {
            DropboxService.refreshAccessToken(settings.dropboxRefreshToken, settings.dropboxAppKey)
              .then(refreshed => {
                rememberStore.updateUserSettings({
                  dropboxAccessToken: refreshed.accessToken,
                  dropboxTokenFetchedTimestamp: Date.now()
                });
              })
              .catch(e => console.error('[DropboxView] Refresh failed:', e));
          }
        })
        .finally(() => setLoadingAccount(false));

      fetchCloudBackups();
    } else {
      setAccountInfo(null);
      setCloudBackups([]);
    }
  }, [isConnected, settings.dropboxAccessToken]);

  const fetchCloudBackups = async () => {
    if (!settings.dropboxAccessToken) return;
    setLoadingBackups(true);
    try {
      const files = await DropboxService.listBackupFiles(settings.dropboxAccessToken);
      const paired = DropboxService.groupPairedBackups(files);
      setCloudBackups(paired);
    } catch (e: any) {
      console.warn('[DropboxView] Error fetching backups:', e);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleConnect = async () => {
    if (!appKeyInput.trim()) {
      alert('Por favor, ingresa tu Dropbox App Key antes de conectar.');
      return;
    }

    rememberStore.updateUserSettings({ dropboxAppKey: appKeyInput.trim() });

    try {
      const verifier = DropboxService.generateCodeVerifier();
      sessionStorage.setItem('rube_dropbox_verifier', verifier);
      const challenge = await DropboxService.generateCodeChallenge(verifier);
      const redirectUri = window.location.origin + window.location.pathname;
      const authUrl = DropboxService.getAuthUrl(appKeyInput.trim(), redirectUri, challenge);
      window.location.href = authUrl;
    } catch (e: any) {
      alert('Error iniciando flujo de autenticación PKCE: ' + e.message);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('¿Desconectar la cuenta de Dropbox?')) {
      rememberStore.updateUserSettings({
        dropboxAccessToken: '',
        dropboxRefreshToken: '',
        dropboxTokenFetchedTimestamp: 0,
        lastDropboxUploadStatus: 'Desconectado'
      });
      setAccountInfo(null);
      setCloudBackups([]);
      setStatusMessage({ text: 'Cuenta de Dropbox desconectada.', type: 'info' });
    }
  };

  const handleUploadBackup = async () => {
    if (!settings.dropboxAccessToken) return;
    setSyncing(true);
    setStatusMessage({ text: 'Preparando y subiendo snapshot pareado a Dropbox...', type: 'info' });

    try {
      // 1. Check comment integrity guard
      const localComments = (store.items || []).reduce((sum, it) => {
        if (it.type === 'TASK' && !it.trash) {
          return sum + ((it as any).comments ? (it as any).comments.length : 0);
        }
        return sum;
      }, 0);

      const isSuspicious = DropboxService.hasSuspiciousCommentLoss(localComments, settings.lastDropboxCommentCount || 0);
      if (isSuspicious) {
        if (!window.confirm(`⚠️ ADVERTENCIA DE INTEGRIDAD: Se detectó una posible pérdida de comentarios (Actual: ${localComments}, Último subido: ${settings.lastDropboxCommentCount}). ¿Deseas forzar la subida de todas formas?`)) {
          setStatusMessage({ text: 'Subida cancelada por el usuario tras alerta de integridad.', type: 'error' });
          setSyncing(false);
          return;
        }
      }

      // 2. Export split
      const split = await rememberStore.exportBackupDataSplit();

      // 3. Upload paired backup
      const uploadRes = await DropboxService.uploadPairedBackup(
        settings.dropboxAccessToken,
        split.text,
        split.images
      );

      // 4. Cleanup old snapshots if exceeding budget
      const cleanup = await DropboxService.cleanupOldSnapshots(settings.dropboxAccessToken, storageBudgetMB);

      // 5. Update userSettings
      rememberStore.updateUserSettings({
        lastDropboxUploadTimestamp: uploadRes.timestamp,
        lastDropboxUploadStatus: `Subida exitosa: ${uploadRes.textFileName}`,
        lastDropboxCommentCount: localComments,
        lastDropboxSnapshotFiles: [uploadRes.textFileName, ...(uploadRes.imagesFileName ? [uploadRes.imagesFileName] : [])],
        hasLocalChanges: false
      });

      setStatusMessage({
        text: `✅ Respaldo pareado subido con éxito (${uploadRes.textFileName}${cleanup.deleted.length > 0 ? `, rotados ${cleanup.deleted.length} archivos antiguos` : ''}).`,
        type: 'success'
      });

      await fetchCloudBackups();
    } catch (e: any) {
      setStatusMessage({ text: `❌ Error subiendo a Dropbox: ${e.message}`, type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleRestoreBackup = async (pair: PairedBackupFiles) => {
    if (!settings.dropboxAccessToken) return;
    const dateStr = pair.timestamp ? new Date(pair.timestamp).toLocaleString() : 'Copia legacy';
    if (!window.confirm(`¿Restaurar el respaldo del ${dateStr}? Se importará la base de datos y su bundle de imágenes.`)) {
      return;
    }

    setSyncing(true);
    setStatusMessage({ text: `Descargando respaldo ${pair.textFile.name}...`, type: 'info' });

    try {
      const downloaded = await DropboxService.downloadPairedBackup(settings.dropboxAccessToken, pair.textFile.name);
      const res = rememberStore.importBackupData(downloaded.text, downloaded.images);

      if (res.success) {
        setStatusMessage({ text: `✅ Base de datos restaurada con éxito desde ${pair.textFile.name}.`, type: 'success' });
      } else {
        setStatusMessage({ text: `❌ Error al restaurar: ${(res.errors || []).join(' ')}`, type: 'error' });
      }
    } catch (e: any) {
      setStatusMessage({ text: `❌ Error descargando de Dropbox: ${e.message}`, type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="view-container">
      <div className="view-header" style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          ☁️ Sincronización en la Nube (Dropbox OAuth 2.0)
        </h2>
        <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
          Respaldos automáticos continuos en la nube mediante snapshots pareados (Base de datos + Imágenes).
        </p>
      </div>

      {statusMessage && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 16px',
            marginBottom: 20,
            borderRadius: 10,
            borderLeft: `4px solid ${statusMessage.type === 'success' ? '#52c41a' : statusMessage.type === 'error' ? '#ff4d4f' : '#1890ff'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{statusMessage.text}</span>
          <button className="btn btn-ghost" onClick={() => setStatusMessage(null)} style={{ padding: '2px 8px' }}>
            ✕
          </button>
        </div>
      )}

      {/* Connection Panel */}
      <div className="glass-card" style={{ borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          🔐 Estado de la Conexión
          <span className={`badge ${isConnected ? 'badge-success' : 'badge-neutral'}`}>
            {isConnected ? 'CONECTADO' : 'NO CONECTADO'}
          </span>
        </h3>

        {!isConnected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'rgba(255, 255, 255, 0.8)' }}>
                Dropbox App Key (Client ID de la consola de Dropbox):
              </label>
              <input
                type="text"
                className="input"
                value={appKeyInput}
                onChange={(e) => setAppKeyInput(e.target.value)}
                placeholder="Ej. k4g8z9example"
                style={{ width: '100%', maxWidth: 400 }}
              />
            </div>

            <div>
              <button
                className="btn btn-primary"
                onClick={handleConnect}
                disabled={syncing || !appKeyInput.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                🔗 Conectar con Dropbox
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {loadingAccount ? 'Cargando perfil...' : (accountInfo ? `${accountInfo.name} (${accountInfo.email})` : 'Conectado')}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 4 }}>
                  Última subida: {settings.lastDropboxUploadTimestamp ? new Date(settings.lastDropboxUploadTimestamp).toLocaleString() : 'Ninguna'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleUploadBackup}
                  disabled={syncing}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {syncing ? '⏳ Subiendo...' : '📤 Subir Copia Ahora'}
                </button>
                <button className="btn btn-danger" onClick={handleDisconnect} disabled={syncing}>
                  Desconectar
                </button>
              </div>
            </div>

            {/* Storage Budget & Options */}
            <div style={{ marginTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 14, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>Presupuesto de Almacenamiento (MB):</label>
                <input
                  type="number"
                  className="input"
                  value={storageBudgetMB}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 50;
                    setStorageBudgetMB(val);
                    rememberStore.updateUserSettings({ dropboxStorageBudgetMB: val });
                  }}
                  min={50}
                  max={10000}
                  style={{ width: 100 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="chk-auto-upload"
                  checked={settings.dropboxAutoUploadEnabled ?? true}
                  onChange={(e) => rememberStore.updateUserSettings({ dropboxAutoUploadEnabled: e.target.checked })}
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
                <label htmlFor="chk-auto-upload" style={{ fontSize: 13, cursor: 'pointer' }}>
                  Subida automática al detectar cambios
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cloud Backups List */}
      {isConnected && (
        <div className="glass-card" style={{ borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              📁 Copias Disponibles en la Nube
              <span className="badge badge-neutral">{cloudBackups.length}</span>
            </h3>
            <button className="btn btn-ghost" onClick={fetchCloudBackups} disabled={loadingBackups}>
              {loadingBackups ? 'Cargando...' : '🔄 Actualizar Lista'}
            </button>
          </div>

          {loadingBackups ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'rgba(255, 255, 255, 0.5)' }}>
              Consultando archivos en Dropbox...
            </div>
          ) : cloudBackups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'rgba(255, 255, 255, 0.5)' }}>
              No se encontraron respaldos en Dropbox todavía. Pulsa "Subir Copia Ahora" para crear el primero.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cloudBackups.map((pair) => (
                <div
                  key={pair.textFile.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: 10,
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>
                        {pair.timestamp ? new Date(pair.timestamp).toLocaleString() : pair.textFile.name}
                      </span>
                      {pair.imagesFile && (
                        <span className="badge badge-success" style={{ fontSize: 10 }}>
                          🖼️ CON IMÁGENES
                        </span>
                      )}
                      {pair.isLegacy && (
                        <span className="badge badge-warning" style={{ fontSize: 10 }}>
                          LEGACY
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
                      Texto: {pair.textFile.name} ({formatBytes(pair.textFile.size)})
                      {pair.imagesFile && ` + Imágenes: ${pair.imagesFile.name} (${formatBytes(pair.imagesFile.size)})`}
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary"
                    onClick={() => handleRestoreBackup(pair)}
                    disabled={syncing}
                    style={{ fontSize: 13, padding: '6px 14px' }}
                  >
                    📥 Restaurar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
