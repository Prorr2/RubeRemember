import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  useColorScheme,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';
import { DropboxService, DropboxAccountInfo } from '@/services/DropboxService';

export default function DropboxScreen() {
  const store = useRememberStore();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const [tokenInput, setTokenInput] = useState(store.userSettings.dropboxAccessToken || '');
  const [showToken, setShowToken] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [accountInfo, setAccountInfo] = useState<DropboxAccountInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingSlot, setDownloadingSlot] = useState<number | null>(null);
  const [currentAppState, setCurrentAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setCurrentAppState(nextState);
    });
    return () => subscription.remove();
  }, []);

  const activeTasksCount = store.items.filter(i => i.type === 'TASK' && !i.trash).length;

  const cooldownMinutes = store.userSettings.dropboxSyncCooldownMinutes ?? 10;
  const lastUpload = store.userSettings.lastDropboxUploadTimestamp || 0;
  const lastSlotIndex = store.userSettings.lastDropboxSlotIndex || 1;
  const timeSinceLastSyncMs = lastUpload > 0 ? Date.now() - lastUpload : 0;
  const timeSinceLastSyncMin = Math.floor(timeSinceLastSyncMs / 1000 / 60);
  const cooldownElapsed = lastUpload === 0 || timeSinceLastSyncMs >= cooldownMinutes * 60 * 1000;

  const handleSaveToken = async () => {
    try {
      await store.updateUserSettings({ dropboxAccessToken: tokenInput.trim() });
      Alert.alert('Éxito', 'Token de acceso de Dropbox guardado correctamente.');
    } catch (e: any) {
      Alert.alert('Error', `No se pudo guardar el token: ${e.message || String(e)}`);
    }
  };

  const handleTestConnection = async () => {
    const tokenToTest = tokenInput.trim() || store.userSettings.dropboxAccessToken;
    if (!tokenToTest) {
      Alert.alert('Token Requerido', 'Por favor ingresa tu token de acceso de Dropbox.');
      return;
    }

    setTestingConnection(true);
    setAccountInfo(null);
    try {
      const info = await DropboxService.getAccountInfo(tokenToTest);
      setAccountInfo(info);
      Alert.alert('Conexión Exitosa', `Conectado correctamente a la cuenta de Dropbox:\n${info.name} (${info.email})`);
    } catch (e: any) {
      Alert.alert('Error de Conexión', e.message || String(e));
    } finally {
      setTestingConnection(false);
    }
  };

  const handleManualUpload = async () => {
    if (!store.userSettings.dropboxAccessToken) {
      Alert.alert('Configuración Requerida', 'Por favor guarda tu token de acceso a Dropbox antes de realizar una subida.');
      return;
    }

    if (activeTasksCount === 0) {
      Alert.alert(
        'Subida Bloqueada por Seguridad',
        'El número de tareas en la base de datos es 0. Se ha cancelado la subida a Dropbox para evitar sobreescribir la copia en la nube con un estado vacío o corrupto.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    setUploading(true);
    try {
      const result = await DropboxService.performAutoSync({
        userSettings: store.userSettings,
        items: store.items,
        exportBackupData: store.exportBackupData,
        updateUserSettings: store.updateUserSettings,
        forceManual: true,
      });

      if (result.success) {
        if (result.uploaded) {
          Alert.alert('Subida Completada', `La base de datos se ha subido exitosamente a Dropbox.`);
        } else if (result.reason === 'no_local_changes' || result.reason === 'no_changes') {
          Alert.alert('Sin Cambios Pendientes', 'No hay cambios locales pendientes por subir a Dropbox desde la última sincronización.');
        }
      } else {
        Alert.alert('Error en Subida', result.error || 'No se pudo completar la subida a Dropbox.');
      }
    } catch (e: any) {
      Alert.alert('Error', `Ocurrió un error inesperado: ${e.message || String(e)}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSetCooldownMinutes = async (minutes: number) => {
    try {
      await store.updateUserSettings({ dropboxSyncCooldownMinutes: minutes });
      Alert.alert(
        'Condición de Cooldown Actualizada',
        `La condición de tiempo mínimo transcurrido entre subidas automáticas se ha establecido en > ${minutes} minuto(s).`
      );
    } catch (e: any) {
      Alert.alert('Error', `No se pudo cambiar el tiempo de cooldown: ${e.message || String(e)}`);
    }
  };

  const handleRestoreSlot = async (slotNum: number, fileName: string) => {
    if (!store.userSettings.dropboxAccessToken) {
      Alert.alert('Configuración Requerida', 'Por favor guarda tu token de acceso a Dropbox antes de descargar.');
      return;
    }

    setDownloadingSlot(slotNum);
    try {
      const remoteContent = await DropboxService.downloadBackup(store.userSettings.dropboxAccessToken, fileName);
      setDownloadingSlot(null);

      if (!remoteContent) {
        Alert.alert(
          'Archivo No Encontrado',
          `No se encontró el archivo "${fileName}" (Archivo #${slotNum}) en tu Dropbox. Es posible que aún no se haya realizado una subida a este slot.`
        );
        return;
      }

      Alert.alert(
        `Restaurar desde Archivo #${slotNum}`,
        `¿Deseas restaurar la base de datos desde "${fileName}"?\n\nEsta acción sobrescribirá todos tus datos actuales de RubeRemember con la copia de este respaldo.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar y Sobrescribir',
            style: 'destructive',
            onPress: async () => {
              setDownloadingSlot(slotNum);
              const resultObj = await store.importBackupData(remoteContent);
              setDownloadingSlot(null);

              if (resultObj.success) {
                Alert.alert('Éxito', `La base de datos se ha restaurado correctamente desde el Archivo #${slotNum}.`, [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                const errorsMsg = resultObj.errors ? resultObj.errors.join(', ') : 'Archivo remoto inválido.';
                Alert.alert('Error al Importar', 'No se pudieron importar los datos: ' + errorsMsg);
              }
            },
          },
        ]
      );
    } catch (e: any) {
      setDownloadingSlot(null);
      Alert.alert('Error al Descargar', e.message || String(e));
    }
  };

  const formattedLastUploadDate = store.userSettings.lastDropboxUploadTimestamp
    ? new Date(store.userSettings.lastDropboxUploadTimestamp).toLocaleDateString('es-ES') +
      ' ' +
      new Date(store.userSettings.lastDropboxUploadTimestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : 'Nunca';

  // Build 7 slots array ordered from most recent to oldest
  const slotsList = Array.from({ length: 7 }, (_, idx) => {
    const slotNum = idx + 1; // 1..7
    const cyclesAgo = (lastSlotIndex - slotNum + 7) % 7;
    const estimatedAgeMinutes = cyclesAgo * cooldownMinutes;
    const fileName = DropboxService.getSlotFileName(store.userSettings.dropboxFileName, slotNum);
    return {
      slotNum,
      cyclesAgo,
      estimatedAgeMinutes,
      fileName,
      isLatest: cyclesAgo === 0 && lastUpload > 0,
    };
  }).sort((a, b) => a.cyclesAgo - b.cyclesAgo);

  const isAutoUploadActive = store.userSettings.dropboxAutoUploadEnabled !== false;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.backgroundSelected }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Dropbox y Estado de la BD</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Section 1: Connection & Access Token */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CONFIGURACIÓN DE DROPBOX</Text>
          
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="cloud-outline" size={28} color="#0061FF" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Token de Acceso de Dropbox</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Necesario para subir respaldos rotatorios a tu cuenta
                </Text>
              </View>
            </View>

            <View style={styles.tokenInputRow}>
              <TextInput
                value={tokenInput}
                onChangeText={setTokenInput}
                placeholder="Pega aquí tu Token de Acceso"
                placeholderTextColor={colors.textSecondary + '80'}
                secureTextEntry={!showToken}
                style={[
                  styles.tokenInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
              />
              <Pressable
                onPress={() => setShowToken(!showToken)}
                style={[styles.iconEyeBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                <Ionicons name={showToken ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.btnRow}>
              <Pressable
                onPress={handleSaveToken}
                style={[styles.smallBtn, { backgroundColor: '#0061FF' }]}
              >
                <Ionicons name="save-outline" size={16} color="#FFF" />
                <Text style={styles.smallBtnText}>Guardar Token</Text>
              </Pressable>

              <Pressable
                onPress={handleTestConnection}
                disabled={testingConnection}
                style={[styles.smallBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                {testingConnection ? (
                  <ActivityIndicator size="small" color="#0061FF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#0061FF" />
                    <Text style={[styles.smallBtnText, { color: '#0061FF' }]}>Probar Conexión</Text>
                  </>
                )}
              </Pressable>
            </View>

            {accountInfo && (
              <View style={styles.accountBadge}>
                <Ionicons name="person-circle-outline" size={20} color="#34C759" />
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
                  Conectado: {accountInfo.name} ({accountInfo.email})
                </Text>
              </View>
            )}

            {/* Emergency Stop / Re-enable Button */}
            {isAutoUploadActive ? (
              <Pressable
                onPress={async () => {
                  await store.updateUserSettings({ dropboxAutoUploadEnabled: false });
                  Alert.alert(
                    '🛑 AUTO-SUBIDA PAUSADA (EMERGENCIA)',
                    'Se ha detenido la auto-subida a Dropbox en caso de emergencia para proteger los 7 archivos de respaldo en la nube.'
                  );
                }}
                style={styles.emergencyStopBtn}
              >
                <Ionicons name="stop-circle" size={26} color="#FF3B30" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.emergencyStopText}>
                    PARAR AUTO-SUBIDA (EMERGENCIA)
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                    Pulsa para detener inmediatamente la auto-subida y proteger las copias en la nube.
                  </Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={async () => {
                  await store.updateUserSettings({ dropboxAutoUploadEnabled: true });
                  Alert.alert(
                    '▶️ AUTO-SUBIDA REANUDADA',
                    'La sincronización automática rotatoria de 7 archivos se ha vuelto a activar.'
                  );
                }}
                style={styles.reEnableBtn}
              >
                <Ionicons name="play-circle" size={26} color="#34C759" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reEnableText}>
                    REANUDAR AUTO-SUBIDA AUTOMÁTICA
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                    La auto-subida está en PAUSA. Pulsa para reactivar la sincronización rotatoria.
                  </Text>
                </View>
              </Pressable>
            )}
          </View>
        </View>

        {/* Section 2: Database Status & Safety Check */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ESTADO DE LA BASE DE DATOS</Text>

          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            {/* Safety Badge */}
            <View
              style={[
                styles.safetyBadge,
                {
                  backgroundColor: activeTasksCount > 0 ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)',
                  borderColor: activeTasksCount > 0 ? '#34C759' : '#FF3B30',
                },
              ]}
            >
              <Ionicons
                name={activeTasksCount > 0 ? 'shield-checkmark' : 'shield-disclaimer'}
                size={22}
                color={activeTasksCount > 0 ? '#34C759' : '#FF3B30'}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: activeTasksCount > 0 ? '#34C759' : '#FF3B30',
                    fontSize: 13,
                    fontWeight: 'bold',
                  }}
                >
                  {activeTasksCount > 0
                    ? `Base de Datos Válida (${activeTasksCount} Tareas)`
                    : 'ALERTA: 0 Tareas - Subida Bloqueada'}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                  {activeTasksCount > 0
                    ? 'Condición de seguridad cumplida (Tareas > 0). Listo para sincronizar.'
                    : 'La base de datos no contiene tareas. Se ha bloqueado la subida automática a Dropbox.'}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Rotación de Archivos (1..7):</Text>
              <Text style={{ color: '#0061FF', fontSize: 13, fontWeight: '700' }}>
                Archivo #{lastSlotIndex} de 7
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Cambios Locales Pendientes:</Text>
              <Text
                style={{
                  color: store.userSettings.hasLocalChanges ? '#FF9500' : '#34C759',
                  fontSize: 13,
                  fontWeight: '700',
                }}
              >
                {store.userSettings.hasLocalChanges ? 'Sí (se subirá en próxima sync)' : 'No (BD al día)'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Última Subida Exitosa:</Text>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
                {formattedLastUploadDate}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Estado Última Sincronización:</Text>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' }}>
                {store.userSettings.lastDropboxUploadStatus || 'Sin registrar'}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 3: RESTAURACIÓN ROTATORIA DE 7 ARCHIVOS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RESTAURAR DESDE DROPBOX (7 RESPALDOS)</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
            Selecciona cuál de los 7 archivos rotatorios deseas restaurar en tu dispositivo:
          </Text>

          <View style={{ gap: 10 }}>
            {slotsList.map((item) => (
              <View
                key={item.slotNum}
                style={[
                  styles.slotCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: item.isLatest ? '#34C759' : colors.backgroundSelected,
                    borderWidth: item.isLatest ? 1.5 : 1,
                  },
                ]}
              >
                {/* Header Row: Title & Badge */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <Text style={[styles.slotNumText, { color: colors.text }]}>
                    Archivo #{item.slotNum}
                  </Text>
                  {item.isLatest ? (
                    <View style={[styles.ageBadge, { backgroundColor: 'rgba(52, 199, 89, 0.15)', borderColor: '#34C759' }]}>
                      <Ionicons name="checkmark-circle" size={12} color="#34C759" />
                      <Text style={[styles.ageBadgeText, { color: '#34C759' }]}>Más reciente</Text>
                    </View>
                  ) : (
                    <View style={[styles.ageBadge, { backgroundColor: 'rgba(255, 149, 0, 0.12)', borderColor: '#FF9500' }]}>
                      <Ionicons name="time-outline" size={12} color="#FF9500" />
                      <Text style={[styles.ageBadgeText, { color: '#FF9500' }]}>
                        Hace {item.cyclesAgo} ciclo(s) (~{item.estimatedAgeMinutes} min)
                      </Text>
                    </View>
                  )}
                </View>

                {/* Bottom Row: Filename & Restore Action */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', flex: 1 }} numberOfLines={1}>
                    {item.fileName}
                  </Text>

                  <Pressable
                    onPress={() => handleRestoreSlot(item.slotNum, item.fileName)}
                    disabled={downloadingSlot !== null}
                    style={[
                      styles.restoreBtn,
                      { backgroundColor: item.isLatest ? '#0061FF' : colors.backgroundSelected },
                    ]}
                  >
                    {downloadingSlot === item.slotNum ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="cloud-download-outline" size={15} color={item.isLatest ? '#FFF' : colors.text} />
                        <Text style={[styles.restoreBtnText, { color: item.isLatest ? '#FFF' : colors.text }]}>
                          Restaurar
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Section 4: DEBUG & CONTROL PANEL */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FF9500' }]}>DEPURACIÓN Y VARIABLES DE CONTROL</Text>

          <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderLeftWidth: 3, borderLeftColor: '#FF9500' }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="bug-outline" size={24} color="#FF9500" />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Variables del Proceso Rotatorio</Text>
            </View>

            <View style={styles.debugGrid}>
              <View style={[styles.debugItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.debugKey, { color: colors.textSecondary }]}>lastDropboxSlotIndex</Text>
                <Text style={[styles.debugVal, { color: '#0061FF' }]}>
                  Archivo #{lastSlotIndex} / 7
                </Text>
              </View>

              <View style={[styles.debugItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.debugKey, { color: colors.textSecondary }]}>hasLocalChanges</Text>
                <Text style={[styles.debugVal, { color: store.userSettings.hasLocalChanges ? '#FF9500' : '#34C759' }]}>
                  {String(store.userSettings.hasLocalChanges ?? false)}
                </Text>
              </View>

              <View style={[styles.debugItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.debugKey, { color: colors.textSecondary }]}>activeTasksCount (&gt; 0)</Text>
                <Text style={[styles.debugVal, { color: activeTasksCount > 0 ? '#34C759' : '#FF3B30' }]}>
                  {activeTasksCount} ({activeTasksCount > 0 ? 'Cumplido' : 'Bloqueado'})
                </Text>
              </View>

              <View style={[styles.debugItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.debugKey, { color: colors.textSecondary }]}>dropboxAutoUploadEnabled</Text>
                <Text style={[styles.debugVal, { color: isAutoUploadActive ? '#34C759' : '#FF3B30' }]}>
                  {String(isAutoUploadActive)}
                </Text>
              </View>

              <View style={[styles.debugItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.debugKey, { color: colors.textSecondary }]}>Tiempo desde última sync</Text>
                <Text style={[styles.debugVal, { color: colors.text }]}>
                  {lastUpload > 0 ? `${timeSinceLastSyncMin} min (${timeSinceLastSyncMs} ms)` : 'Sin sync previa'}
                </Text>
              </View>

              <View style={[styles.debugItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.debugKey, { color: colors.textSecondary }]}>Condición &gt; {cooldownMinutes} min</Text>
                <Text style={[styles.debugVal, { color: cooldownElapsed ? '#34C759' : '#FF9500' }]}>
                  {String(cooldownElapsed)}
                </Text>
              </View>

              <View style={[styles.debugItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.debugKey, { color: colors.textSecondary }]}>lastDropboxUploadStatus</Text>
                <Text style={[styles.debugVal, { color: colors.text }]}>
                  {store.userSettings.lastDropboxUploadStatus || 'N/A'}
                </Text>
              </View>

              <View style={[styles.debugItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.debugKey, { color: colors.textSecondary }]}>AppState de la App</Text>
                <Text style={[styles.debugVal, { color: currentAppState === 'active' ? '#34C759' : '#FF9500' }]}>
                  {currentAppState}
                </Text>
              </View>

              <View style={[styles.debugItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.debugKey, { color: colors.textSecondary }]}>Intervalo temporizador</Text>
                <Text style={[styles.debugVal, { color: colors.text }]}>
                  Cada 1 min (60.000 ms)
                </Text>
              </View>
            </View>

            {/* Manual Debug Actions */}
            <View style={{ gap: 10, marginTop: 14 }}>
              <View style={styles.btnRow}>
                <Pressable
                  onPress={async () => {
                    await store.updateUserSettings({ hasLocalChanges: true });
                    Alert.alert('Debug', 'Flag hasLocalChanges establecido manualmente a TRUE.');
                  }}
                  style={[styles.smallBtn, { backgroundColor: 'rgba(255, 149, 0, 0.15)', borderWidth: 1, borderColor: '#FF9500' }]}
                >
                  <Ionicons name="flag-outline" size={16} color="#FF9500" />
                  <Text style={[styles.smallBtnText, { color: '#FF9500' }]}>Forzar TRUE</Text>
                </Pressable>

                <Pressable
                  onPress={async () => {
                    await store.updateUserSettings({ hasLocalChanges: false });
                    Alert.alert('Debug', 'Flag hasLocalChanges establecido manualmente a FALSE.');
                  }}
                  style={[styles.smallBtn, { backgroundColor: 'rgba(52, 199, 89, 0.15)', borderWidth: 1, borderColor: '#34C759' }]}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
                  <Text style={[styles.smallBtnText, { color: '#34C759' }]}>Forzar FALSE</Text>
                </Pressable>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>
                  Modo Cooldown para pruebas de auto-sync:
                </Text>
                <View style={styles.btnRow}>
                  <Pressable
                    onPress={() => handleSetCooldownMinutes(10)}
                    style={[
                      styles.smallBtn,
                      {
                        backgroundColor: cooldownMinutes === 10 ? 'rgba(0, 97, 255, 0.2)' : colors.background,
                        borderWidth: 1,
                        borderColor: cooldownMinutes === 10 ? '#0061FF' : colors.backgroundSelected,
                      },
                    ]}
                  >
                    <Ionicons name="time-outline" size={16} color={cooldownMinutes === 10 ? '#0061FF' : colors.textSecondary} />
                    <Text style={[styles.smallBtnText, { color: cooldownMinutes === 10 ? '#0061FF' : colors.textSecondary }]}>
                      Prod (&gt; 10 min)
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleSetCooldownMinutes(1)}
                    style={[
                      styles.smallBtn,
                      {
                        backgroundColor: cooldownMinutes === 1 ? 'rgba(88, 86, 214, 0.2)' : colors.background,
                        borderWidth: 1,
                        borderColor: cooldownMinutes === 1 ? '#5856D6' : colors.backgroundSelected,
                      },
                    ]}
                  >
                    <Ionicons name="flash-outline" size={16} color={cooldownMinutes === 1 ? '#5856D6' : colors.textSecondary} />
                    <Text style={[styles.smallBtnText, { color: cooldownMinutes === 1 ? '#5856D6' : colors.textSecondary }]}>
                      Pruebas (&gt; 1 min)
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Section 5: MANUAL FORCE UPLOAD BUTTON */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUBIDA MANUAL DE EMERGENCIA</Text>

          <View style={styles.actionsContainer}>
            <Pressable
              onPress={handleManualUpload}
              disabled={uploading || downloadingSlot !== null}
              style={[styles.actionBtn, { backgroundColor: '#0061FF' }]}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
                  <Text style={styles.actionBtnText}>Forzar Subida Manual Ahora</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Help Guide */}
        <View style={[styles.helpCard, { backgroundColor: colors.backgroundElement }]}>
          <Ionicons name="information-circle-outline" size={22} color="#0061FF" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: 'bold' }}>
              ¿Cómo funciona el Sistema Rotatorio de 7 Archivos?
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
              Cada subida automática o manual escribe en el siguiente número de archivo rotatorio (1 ➔ 2 ➔ 3 ... ➔ 7 ➔ 1). Esto garantiza que dispongas siempre de hasta 7 respaldos independientes guardados secuencialmente en Dropbox.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  container: {
    padding: 16,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  tokenInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  iconEyeBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  smallBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emergencyStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  emergencyStopText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reEnableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderWidth: 1.5,
    borderColor: '#34C759',
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  reEnableText: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: 'bold',
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  slotCard: {
    flexDirection: 'column',
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  slotNumText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  ageBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  restoreBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  debugGrid: {
    gap: 8,
  },
  debugItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debugKey: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  debugVal: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionsContainer: {
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  helpCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    padding: 14,
  },
});
