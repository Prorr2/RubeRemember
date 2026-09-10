import React, { useState, useEffect, useRef } from 'react';
import { useRememberStore, rememberStore } from '../../store';
import { MergeResult } from '../../services/MergeEngine';

export const SyncPanel: React.FC = () => {
  useRememberStore(); // re-render on store change
  const [mobileConnected, setMobileConnected] = useState(false);
  const [receivedPending, setReceivedPending] = useState(false);
  const [outgoingPending, setOutgoingPending] = useState(false);
  const [qrCodes, setQrCodes] = useState<Array<{ ip: string; url: string; svg: string }>>([]);
  const [banner, setBanner] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll /api/health every 3 seconds
  useEffect(() => {
    let active = true;
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setMobileConnected(!!data.mobileConnected);
            setReceivedPending(!!data.received);
            setOutgoingPending(!!data.outgoing);
            if (Array.isArray(data.qrCodes) && data.qrCodes.length > 0) {
              setQrCodes(data.qrCodes);
            }
          }
        }
      } catch {}
    };

    checkHealth();
    const interval = setInterval(checkHealth, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleRequestDataFromMobile = async () => {
    setSyncing(true);
    setBanner({ text: 'Enviando solicitud de datos al móvil...', type: 'info' });
    try {
      const res = await fetch('/api/request', { method: 'POST' });
      if (res.ok) {
        setBanner({ text: 'Petición enviada. Esperando a que el móvil suba sus datos...', type: 'info' });
      } else {
        setBanner({ text: 'Error al solicitar datos al móvil', type: 'error' });
      }
    } catch (e: any) {
      setBanner({ text: 'Fallo de conexión: ' + e.message, type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handlePullAndMerge = async () => {
    setSyncing(true);
    setBanner({ text: 'Descargando datos recibidos del servidor local...', type: 'info' });
    try {
      const res = await fetch('/api/backup/latest');
      if (res.ok) {
        const payload = await res.json();
        if (payload && payload.data) {
          // Perform intelligent merge!
          const mergeRes: MergeResult = rememberStore.mergeWithRemote(payload.data);
          if (mergeRes.success && mergeRes.stats) {
            const s = mergeRes.stats;
            setBanner({
              text: `✅ Fusión inteligente completada: +${s.itemsAddedFromRemote} añadidos, ${s.itemsUpdatedFromRemote} actualizados de remoto, ${s.commentsMerged} notas fusionadas.`,
              type: 'success'
            });
            setReceivedPending(false);
          } else {
            setBanner({ text: `❌ Error en el merge: ${mergeRes.error}`, type: 'error' });
          }
        } else {
          setBanner({ text: 'No hay datos nuevos recibidos del móvil.', type: 'info' });
        }
      }
    } catch (e: any) {
      setBanner({ text: 'Error al recibir datos: ' + e.message, type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSendToMobile = async () => {
    setSyncing(true);
    setBanner({ text: 'Subiendo base de datos web al servidor local...', type: 'info' });
    try {
      const data = rememberStore.exportBackupData();
      const res = await fetch('/api/outgoing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data
      });
      if (res.ok) {
        setBanner({ text: '✅ Datos preparados para el móvil. El móvil los recogerá automáticamente.', type: 'success' });
        setOutgoingPending(true);
      } else {
        setBanner({ text: 'Error al enviar datos al servidor local', type: 'error' });
      }
    } catch (e: any) {
      setBanner({ text: 'Fallo de red: ' + e.message, type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleRollback = () => {
    if (window.confirm('¿Deshacer la última fusión (rollback al snapshot anterior al merge)?')) {
      const restored = rememberStore.restorePreMergeBackup();
      if (restored) {
        setBanner({ text: '✅ Rollback completado con éxito. Se restauró el estado anterior al merge.', type: 'success' });
      } else {
        setBanner({ text: 'No se encontró ninguna copia de seguridad pre-merge para restaurar.', type: 'error' });
      }
    }
  };

  const handleExportJson = () => {
    const json = rememberStore.exportBackupData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rube_remember_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSplit = async () => {
    setSyncing(true);
    try {
      const split = await rememberStore.exportBackupDataSplit();
      const ts = Date.now();

      // Download text
      const blobText = new Blob([split.text], { type: 'application/json' });
      const urlText = URL.createObjectURL(blobText);
      const aText = document.createElement('a');
      aText.href = urlText;
      aText.download = `rube_remember_backup_${ts}.json`;
      aText.click();
      URL.revokeObjectURL(urlText);

      // Download images bundle if any
      if (Object.keys(split.images).length > 0) {
        const blobImg = new Blob([JSON.stringify(split.images, null, 2)], { type: 'application/json' });
        const urlImg = URL.createObjectURL(blobImg);
        const aImg = document.createElement('a');
        aImg.href = urlImg;
        aImg.download = `rube_remember_images_${ts}.json`;
        aImg.click();
        URL.revokeObjectURL(urlImg);
      }

      setBanner({ text: '✅ Respaldos pareados descargados con éxito.', type: 'success' });
    } catch (e: any) {
      setBanner({ text: 'Error al exportar respaldo pareado: ' + e.message, type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const res = rememberStore.importBackupData(content);
        if (res.success) {
          setBanner({ text: '✅ Base de datos importada con éxito desde archivo.', type: 'success' });
        } else {
          setBanner({ text: '❌ Error importando archivo: ' + (res.errors || []).join(' '), type: 'error' });
        }
      } catch (err: any) {
        setBanner({ text: 'Error leyendo archivo: ' + err.message, type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="view-container">
      <div className="view-header" style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          📶 Sincronización Local y Copias de Seguridad
        </h2>
        <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
          Sincronización por red Wi-Fi local con el móvil y gestión de importación/exportación de copias.
        </p>
      </div>

      {banner && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 16px',
            marginBottom: 20,
            borderRadius: 10,
            borderLeft: `4px solid ${banner.type === 'success' ? '#52c41a' : banner.type === 'error' ? '#ff4d4f' : '#1890ff'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{banner.text}</span>
          <button className="btn btn-ghost" onClick={() => setBanner(null)} style={{ padding: '2px 8px' }}>
            ✕
          </button>
        </div>
      )}

      {/* QR Codes for Mobile Connection */}
      {qrCodes.length > 0 && (
        <div className="glass-card" style={{ borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              📷 Conectar Móvil (Códigos QR)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'rgba(255, 255, 255, 0.6)' }}>
              Apunta con la cámara de la app móvil a cualquiera de estos códigos para vincular la red local automáticamente:
            </p>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {qrCodes.map((item, idx) => (
              <div
                key={item.ip || idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  minWidth: 190,
                }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: item.svg }}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 4 }}>
                    {item.ip === '127.0.0.1' ? 'Localhost (PC)' : `Red ${idx + 1} (${item.ip})`}
                  </div>
                  <code
                    style={{
                      fontSize: 12,
                      color: '#38bdf8',
                      background: 'rgba(56, 189, 248, 0.1)',
                      padding: '3px 8px',
                      borderRadius: 6,
                      userSelect: 'all',
                    }}
                  >
                    {item.url}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network Sync Status */}
      <div className="glass-card" style={{ borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              📲 Estado del Móvil
              <span className={`badge ${mobileConnected ? 'badge-success' : 'badge-neutral'}`}>
                {mobileConnected ? 'CONECTADO (Activo)' : 'NO DETECTADO'}
              </span>
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' }}>
              El móvil debe estar en la misma red Wi-Fi y tener la app abierta en la pantalla de Sincronización.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {receivedPending ? (
              <button
                className="btn btn-success"
                onClick={handlePullAndMerge}
                disabled={syncing}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                ⚡ Fusión Inteligente (Datos del Móvil Listos)
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={handleRequestDataFromMobile}
                disabled={syncing}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                📥 Pedir Datos al Móvil
              </button>
            )}

            <button
              className="btn btn-primary"
              onClick={handleSendToMobile}
              disabled={syncing}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              📤 Enviar al Móvil {outgoingPending ? '(Listo)' : ''}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 14, alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={handleRollback} style={{ fontSize: 12 }}>
            ↩️ Deshacer Último Merge (Rollback)
          </button>
          <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' }}>
            Restaura la copia de seguridad tomada automáticamente antes de fusionar.
          </span>
        </div>
      </div>

      {/* Manual File Backup & Restore */}
      <div className="glass-card" style={{ borderRadius: 14, padding: 20 }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: 16 }}>📁 Archivos de Respaldo</h3>
        <p style={{ margin: '0 0 16px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
          Descarga o restaura copias en formato JSON estándar compatibles con Android, Web y Nube.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExportJson}>
            💾 Descargar Backup (.json)
          </button>

          <button className="btn btn-secondary" onClick={handleExportSplit}>
            📦 Descargar Backup Pareado (Texto + Imágenes)
          </button>

          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            📥 Importar Archivo de Respaldo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileImport}
          />
        </div>
      </div>
    </div>
  );
};
