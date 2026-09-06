import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore } from '@/hooks/use-remember-store';
import { Colors, Accent } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/screen-header';
import { DropboxService, DropboxAccountInfo } from '@/services/DropboxService';

// ─────────────────────────────────────────────────────────────────────────────
// Calendar date helpers (same pattern as goals.tsx)
// ─────────────────────────────────────────────────────────────────────────────
const getLocalDateStr = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDaysInMonth = (date: Date): { dayNum: number; dateStr: string; isCurrentMonth: boolean }[] => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days = [];

  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6; // Sunday becomes index 6

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevDay = prevMonthLastDay - i;
    const prevDate = new Date(year, month - 1, prevDay);
    days.push({
      dayNum: prevDay,
      dateStr: getLocalDateStr(prevDate),
      isCurrentMonth: false,
    });
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const curDate = new Date(year, month, i);
    days.push({
      dayNum: i,
      dateStr: getLocalDateStr(curDate),
      isCurrentMonth: true,
    });
  }

  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const nextDate = new Date(year, month + 1, i);
    days.push({
      dayNum: i,
      dateStr: getLocalDateStr(nextDate),
      isCurrentMonth: false,
    });
  }

  return days;
};

const getMonthNameSpanish = (date: Date): string => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const m = date.getMonth();
  const y = date.getFullYear();
  return `${months[m]} ${y}`;
};

const calModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 290,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});

// Date-range filter panel for the restore list
function SnapshotDateFilter({
  from,
  to,
  onChange,
  colors,
}: {
  from: string | null;
  to: string | null;
  onChange: (next: { from: string | null; to: string | null }) => void;
  colors: typeof Colors.light | typeof Colors.dark;
}) {
  const [pickingEdge, setPickingEdge] = useState<'from' | 'to'>('from');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const todayStr = getLocalDateStr();

  const formatDisplay = (dStr: string | null): string => {
    if (!dStr) return 'Cualquier día';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
  };

  const openPicker = (edge: 'from' | 'to') => {
    setPickingEdge(edge);
    setCurrentMonthDate(new Date());
    setIsCalendarVisible(true);
  };

  const handleDaySelect = (dateStr: string) => {
    if (pickingEdge === 'from') {
      const next = { from: dateStr, to };
      if (to && dateStr > to) next.to = dateStr;
      onChange(next);
    } else {
      const next = { from, to: dateStr };
      if (from && dateStr < from) next.from = dateStr;
      onChange(next);
    }
    setIsCalendarVisible(false);
  };

  const applyPreset = (days: number) => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    onChange({ from: getLocalDateStr(fromDate), to: getLocalDateStr(toDate) });
  };

  const clear = () => onChange({ from: null, to: null });

  const active = from !== null || to !== null;

  const dayHeaders = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Filtrar respaldos por fecha</Text>
        {active && (
          <Pressable onPress={clear} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 2 }}>
            <Ionicons name="close-circle-outline" size={14} color={Accent} />
            <Text style={{ color: Accent, fontSize: 12, fontWeight: '600' }}>Limpiar filtro</Text>
          </Pressable>
        )}
      </View>

      {/* Presets */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {[
          { label: '7 días', days: 7 },
          { label: '30 días', days: 30 },
          { label: '90 días', days: 90 },
        ].map((p) => (
          <Pressable
            key={p.label}
            onPress={() => applyPreset(p.days)}
            style={[styles.filterChip, { backgroundColor: 'rgba(0, 97, 255, 0.12)' }]}
          >
            <Text style={{ color: Accent, fontSize: 11, fontWeight: '600' }}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* From / To buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Pressable
          onPress={() => openPicker('from')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderRadius: 10,
            borderColor: from ? Accent : colors.backgroundSelected,
            paddingVertical: 9,
            paddingHorizontal: 12,
            backgroundColor: colors.background,
          }}
        >
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Desde</Text>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{formatDisplay(from)}</Text>
          </View>
          <Ionicons name="calendar-outline" size={16} color={Accent} />
        </Pressable>

        <Pressable
          onPress={() => openPicker('to')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderRadius: 10,
            borderColor: to ? Accent : colors.backgroundSelected,
            paddingVertical: 9,
            paddingHorizontal: 12,
            backgroundColor: colors.background,
          }}
        >
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Hasta</Text>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{formatDisplay(to)}</Text>
          </View>
          <Ionicons name="calendar-outline" size={16} color={Accent} />
        </Pressable>
      </View>

      <Modal visible={isCalendarVisible} transparent animationType="fade" onRequestClose={() => setIsCalendarVisible(false)}>
        <Pressable onPress={() => setIsCalendarVisible(false)} style={calModalStyles.overlay}>
          <Pressable onPress={(e) => e.stopPropagation()} style={[calModalStyles.container, { backgroundColor: colors.background }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>
                {pickingEdge === 'from' ? 'Desde (día de inicio)' : 'Hasta (día de fin)'}
              </Text>
              <Pressable onPress={() => setIsCalendarVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Pressable
                onPress={() => setCurrentMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                style={{ padding: 6 }}
              >
                <Ionicons name="chevron-back" size={18} color={Accent} />
              </Pressable>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>
                {getMonthNameSpanish(currentMonthDate)}
              </Text>
              <Pressable
                onPress={() => setCurrentMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                style={{ padding: 6 }}
              >
                <Ionicons name="chevron-forward" size={18} color={Accent} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              {dayHeaders.map((h, idx) => (
                <Text key={idx} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 'bold', color: colors.textSecondary }}>
                  {h}
                </Text>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {getDaysInMonth(currentMonthDate).map((day, idx) => {
                const selected = day.dateStr === (pickingEdge === 'from' ? from : to);
                const isToday = day.dateStr === todayStr;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => handleDaySelect(day.dateStr)}
                    style={{
                      width: '14.28%',
                      aspectRatio: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 18,
                      backgroundColor: selected ? Accent : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: selected || isToday ? 'bold' : 'normal',
                        color: selected
                          ? '#FFF'
                          : day.isCurrentMonth
                            ? colors.text
                            : colors.textSecondary,
                      }}
                    >
                      {day.dayNum}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function DropboxScreen() {
  const store = useRememberStore();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const [tokenInput, setTokenInput] = useState(store.userSettings.dropboxAccessToken || '');
  const [refreshTokenInput, setRefreshTokenInput] = useState(store.userSettings.dropboxRefreshToken || '');
  const [appKeyInput, setAppKeyInput] = useState(store.userSettings.dropboxAppKey || '');
  const [appSecretInput, setAppSecretInput] = useState(store.userSettings.dropboxAppSecret || '');
  const [showToken, setShowToken] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);
  const [accountInfo, setAccountInfo] = useState<DropboxAccountInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [remoteSnapshots, setRemoteSnapshots] = useState<Array<{
    key: string;
    label: string;
    textFile: string;
    imagesFile?: string;
    size: number;
    isPair: boolean;
    isLatest: boolean;
    timestamp: number;
  }>>([]);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState<string | null>(null);
  const [filterTo, setFilterTo] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('1500');
  const [currentAppState, setCurrentAppState] = useState<AppStateStatus>(AppState.currentState);

  const [, setTick] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setCurrentAppState(nextState);
    });
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  // Keep the budget input in sync once settings finish loading.
  useEffect(() => {
    const budget = store.userSettings.dropboxStorageBudgetMB ?? 1500;
    setBudgetInput(String(budget));
  }, [store.userSettings.dropboxStorageBudgetMB]);

  useEffect(() => {
    if (store.userSettings.dropboxAccessToken) {
      refreshRemoteSnapshots(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh the remote snapshot list.
  const refreshRemoteSnapshots = useCallback(async (silent = false) => {
    const baseName = store.userSettings.dropboxFileName || 'rube_remember_backup.json';
    let tokenToUse = store.userSettings.dropboxAccessToken;
    if (!tokenToUse) {
      try {
        tokenToUse = (await DropboxService.refreshAccessTokenIfNeeded(store.userSettings, store.updateUserSettings)) || '';
      } catch (err) {}
    }
    if (!tokenToUse) {
      if (!silent) setSnapshotError('No hay un token de acceso. Conéctate a Dropbox para ver los respaldos.');
      setRemoteSnapshots([]);
      return;
    }
    try {
      const files = await DropboxService.listBackupFiles(tokenToUse, baseName);
      // Group timestamped files into paired snapshots; legacy 1..8 files shown individually.
      const byStamp: Record<number, { text?: string; images?: string; size: number }> = {};
      const legacy: Array<{ name: string; size: number }> = [];
      for (const f of files) {
        const ts = DropboxService.getTimestampFromFileName(f.name);
        if (ts <= 0) {
          legacy.push(f);
          continue;
        }
        if (!byStamp[ts]) {
          byStamp[ts] = { size: 0 };
        }
        if (f.name.includes('_images_')) {
          byStamp[ts].images = f.name;
        } else {
          byStamp[ts].text = f.name;
        }
        byStamp[ts].size += f.size;
      }

      const latestTs = Math.max(0, ...Object.keys(byStamp).map(Number));
      const snapshots = Object.keys(byStamp)
        .map((tsStr) => {
          const ts = parseInt(tsStr, 10);
          const g = byStamp[ts];
          const textFile = g.text || (g.images ? g.images.replace('_images_', '_') : '');
          const dt = new Date(ts);
          const label = dt.toLocaleDateString('es-ES') + ' ' + dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return {
            key: `snap-${ts}`,
            label,
            textFile,
            imagesFile: g.images,
            size: g.size,
            isPair: !!(g.text && g.images),
            isLatest: ts === latestTs,
            timestamp: ts,
          };
        })
        .concat(
          legacy.map((f) => {
            const ts = DropboxService.getTimestampFromFileName(f.name);
            return {
              key: `legacy-${f.name}`,
              label: f.name,
              textFile: f.name,
              imagesFile: undefined,
              size: f.size,
              isPair: false,
              isLatest: false,
              timestamp: ts,
            };
          })
        )
        .sort((a, b) => b.timestamp - a.timestamp || a.key.localeCompare(b.key));

      setRemoteSnapshots(snapshots);
      setSnapshotError(null);
    } catch (e: any) {
      if (!silent) setSnapshotError(e.message || String(e));
      setRemoteSnapshots([]);
    }
  }, [store.userSettings, store.updateUserSettings]);

  const activeTasksCount = store.items.filter(i => i.type === 'TASK' && !i.trash).length;

  // Filter the remote snapshots by the selected date range (start of from-day to
  // end of to-day, inclusive). Legacy files (no timestamp) are hidden while a
  // filter is active since they have no date to match.
  const filterActive = filterFrom !== null || filterTo !== null;
  const filteredSnapshots = useMemo(() => {
    if (!filterActive) return remoteSnapshots;
    const fromMs = filterFrom ? new Date(filterFrom + 'T00:00:00').getTime() : -Infinity;
    const toMs = filterTo ? new Date(filterTo + 'T23:59:59.999').getTime() : Infinity;
    return remoteSnapshots.filter((s) => s.timestamp > 0 && s.timestamp >= fromMs && s.timestamp <= toMs);
  }, [remoteSnapshots, filterFrom, filterTo, filterActive]);

  const cooldownMinutes = store.userSettings.dropboxSyncCooldownMinutes ?? 60;
  const lastUpload = store.userSettings.lastDropboxUploadTimestamp || 0;
  const timeSinceLastSyncMs = lastUpload > 0 ? Date.now() - lastUpload : 0;
  const timeSinceLastSyncMin = Math.floor(timeSinceLastSyncMs / 1000 / 60);
  const cooldownElapsed = lastUpload === 0 || timeSinceLastSyncMs >= cooldownMinutes * 60 * 1000;

  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
  const tokenFetchedAt = store.userSettings.dropboxTokenFetchedTimestamp || 0;
  const timeSinceTokenFetchMs = tokenFetchedAt > 0 ? Date.now() - tokenFetchedAt : 0;
  const timeSinceTokenFetchHours = (timeSinceTokenFetchMs / (1000 * 60 * 60)).toFixed(1);
  const isTokenOlderThan4Hours = timeSinceTokenFetchMs >= FOUR_HOURS_MS;

  const hasAccessToken = !!(tokenInput.trim() || store.userSettings.dropboxAccessToken);
  const remainingLifetimeMs = Math.max(0, FOUR_HOURS_MS - timeSinceTokenFetchMs);
  const remainingHours = Math.floor(remainingLifetimeMs / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((remainingLifetimeMs % (1000 * 60 * 60)) / (1000 * 60));

  let remainingLifetimeText = '';
  if (!hasAccessToken) {
    remainingLifetimeText = 'Sin token de acceso configurado';
  } else if (tokenFetchedAt === 0) {
    remainingLifetimeText = 'Tiempo de vida restante: ~4h 0m (Ingresado manualmente)';
  } else if (remainingLifetimeMs > 0) {
    remainingLifetimeText = `Tiempo de vida restante: ${remainingHours}h ${remainingMinutes}m`;
  } else {
    remainingLifetimeText = 'Token expirado (Han pasado > 4h)';
  }

  const handleSaveCredentials = async () => {
    try {
      const cleanToken = DropboxService.cleanToken(tokenInput);
      const cleanRefToken = DropboxService.cleanToken(refreshTokenInput);
      const cleanKey = DropboxService.cleanToken(appKeyInput);
      const cleanSec = DropboxService.cleanToken(appSecretInput);

await store.updateUserSettings({
        dropboxAccessToken: cleanToken,
        dropboxRefreshToken: cleanRefToken,
        dropboxAppKey: cleanKey,
        dropboxAppSecret: cleanSec,
        hasLocalChanges: true,
      });
      setTokenInput(cleanToken);
      setRefreshTokenInput(cleanRefToken);
      setAppKeyInput(cleanKey);
      setAppSecretInput(cleanSec);
      Alert.alert('Éxito', 'Configuración de Dropbox guardada correctamente.');
    } catch (e: any) {
      Alert.alert('Error', `No se pudo guardar la configuración: ${e.message || String(e)}`);
    }
  };

  const handleForceRefreshToken = async () => {
    const rfToken = DropboxService.cleanToken(refreshTokenInput) || DropboxService.cleanToken(store.userSettings.dropboxRefreshToken);
    if (!rfToken) {
      Alert.alert('Refresh Token Requerido', 'Por favor ingresa un Refresh Token en la configuración.');
      return;
    }

    setRefreshingToken(true);
    try {
      const newToken = await DropboxService.refreshAccessTokenIfNeeded(
        {
          ...store.userSettings,
          dropboxAccessToken: DropboxService.cleanToken(tokenInput) || store.userSettings.dropboxAccessToken,
          dropboxRefreshToken: rfToken,
          dropboxAppKey: DropboxService.cleanToken(appKeyInput) || store.userSettings.dropboxAppKey,
          dropboxAppSecret: DropboxService.cleanToken(appSecretInput) || store.userSettings.dropboxAppSecret,
        },
        store.updateUserSettings,
        true
      );
      if (newToken) {
        setTokenInput(newToken);
        Alert.alert('Token Renovado', 'Se ha obtenido exitosamente un nuevo Access Token de 4 horas usando el Refresh Token.');
      } else {
        Alert.alert('Error', 'No se pudo generar un nuevo Access Token.');
      }
    } catch (e: any) {
      Alert.alert('Error al Renovar Token', e.message || String(e));
    } finally {
      setRefreshingToken(false);
    }
  };

  const handleTestConnection = async () => {
    const tokenToTest = DropboxService.cleanToken(tokenInput) || DropboxService.cleanToken(store.userSettings.dropboxAccessToken);
    if (!tokenToTest) {
      Alert.alert('Token Requerido', 'Por favor ingresa tu Token de Acceso de Dropbox.');
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
    const hasCreds = !!(store.userSettings.dropboxAccessToken || store.userSettings.dropboxRefreshToken || tokenInput.trim() || refreshTokenInput.trim());
    if (!hasCreds) {
      Alert.alert('Configuración Requerida', 'Por favor guarda tu token de acceso o refresh token antes de realizar una subida.');
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
        exportBackupDataSplit: store.exportBackupDataSplit,
        updateUserSettings: store.updateUserSettings,
        forceManual: true,
        onBudgetCleanup: (toDelete: string[]) => {
          return new Promise<boolean>((resolve) => {
            const names = toDelete.map((f) => `• ${f}`).join('\n');
            Alert.alert(
              'Espacio en Dropbox',
              `El presupuesto de almacenamiento se ha alcanzado. Se eliminarán los siguientes respaldos antiguos para dejar espacio:\n\n${names}\n\n¿Deseas proceder con la rotación?`,
              [
                { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Eliminar', style: 'destructive', onPress: () => resolve(true) },
              ]
            );
          });
        },
      });

      if (result.success) {
        if (result.uploaded) {
          let msg = 'La base de datos se ha subido exitosamente a Dropbox.';
          if (result.deletedFiles && result.deletedFiles.length > 0) {
            msg += `\n\nSe eliminaron ${result.deletedFiles.length} respaldo(s) antiguo(s):\n${result.deletedFiles.map((f) => `• ${f}`).join('\n')}`;
          }
          if (result.failedDeletes && result.failedDeletes.length > 0) {
            msg += `\n\n⚠️ No se pudieron eliminar (se reintentará en la próxima sync):\n${result.failedDeletes.map((f) => `• ${f}`).join('\n')}`;
          }
          Alert.alert('Subida Completada', msg);
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
      await store.updateUserSettings({ dropboxSyncCooldownMinutes: minutes, hasLocalChanges: true });
      Alert.alert(
        'Cooldown Actualizado',
        `La sincronización automática se realizará como máximo cada ${minutes} minuto(s).`
      );
    } catch (e: any) {
      Alert.alert('Error', `No se pudo cambiar el tiempo de cooldown: ${e.message || String(e)}`);
    }
  };

  const handleRestoreSnapshot = async (snapshot: { key: string; label: string; textFile: string; imagesFile?: string; isPair: boolean }) => {
    let tokenToUse = store.userSettings.dropboxAccessToken;
    if (!tokenToUse) {
      try {
        tokenToUse = (await DropboxService.refreshAccessTokenIfNeeded(store.userSettings, store.updateUserSettings)) || '';
      } catch (err) {}
    }

    if (!tokenToUse) {
      Alert.alert('Configuración Requerida', 'Por favor guarda tu token de acceso o refresh token antes de descargar.');
      return;
    }

    setDownloadingKey(snapshot.key);
    try {
      const remoteContent = await DropboxService.downloadBackup(tokenToUse, snapshot.textFile);
      let imagesBundle: Record<string, string> | undefined;
      if (snapshot.imagesFile) {
        const imagesContent = await DropboxService.downloadBackup(tokenToUse, snapshot.imagesFile);
        if (imagesContent) {
          try {
            const parsed = JSON.parse(imagesContent);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              imagesBundle = parsed;
            }
          } catch (e) {
            console.warn('[Dropbox] El bundle de imágenes no es un JSON válido:', e);
          }
        }
      }
      setDownloadingKey(null);

      if (!remoteContent) {
        Alert.alert(
          'Archivo No Encontrado',
          `No se encontró el archivo "${snapshot.textFile}" en tu Dropbox.`
        );
        return;
      }

      const isTimestamped = DropboxService.getTimestampFromFileName(snapshot.textFile) > 0;
      Alert.alert(
        `Restaurar desde ${isTimestamped ? 'respaldos' : 'respaldo'}`,
        `¿Deseas restaurar la base de datos desde "${snapshot.label}"?\n\nEsta acción sobrescribirá todos tus datos actuales de RubeRemember con la copia de este respaldo.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar y Sobrescribir',
            style: 'destructive',
            onPress: async () => {
              setDownloadingKey(snapshot.key);
              try {
                const resultObj = await store.importBackupData(remoteContent, imagesBundle);
                setDownloadingKey(null);

                if (resultObj.success) {
                  await store.updateUserSettings({
                    lastDropboxRestoredFiles: [snapshot.textFile, snapshot.imagesFile || ''].filter(Boolean),
                    lastDropboxRestoreTimestamp: Date.now(),
                    hasLocalChanges: true,
                  });
                  Alert.alert('Éxito', `La base de datos se ha restaurado correctamente desde "${snapshot.label}".`, [
                    { text: 'OK', onPress: () => router.back() }
                  ]);
                } else {
                  const errorsMsg = resultObj.errors ? resultObj.errors.join(', ') : 'Archivo remoto inválido.';
                  Alert.alert('Error al Importar', 'No se pudieron importar los datos: ' + errorsMsg);
                }
              } catch (e: any) {
                setDownloadingKey(null);
                Alert.alert('Error al Importar', e.message || String(e));
              }
            },
          },
        ]
      );
    } catch (e: any) {
      setDownloadingKey(null);
      Alert.alert('Error al Descargar', e.message || String(e));
    }
  };

  const handleDeleteSnapshot = async (snapshot: { key: string; label: string; textFile: string; imagesFile?: string }) => {
    Alert.alert(
      'Borrar respaldo',
      `¿Está seguro de que desea borrar este respaldo?\n\n"${snapshot.label}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, borrar',
          style: 'destructive',
          onPress: async () => {
            let tokenToUse = store.userSettings.dropboxAccessToken;
            if (!tokenToUse) {
              try {
                tokenToUse = (await DropboxService.refreshAccessTokenIfNeeded(store.userSettings, store.updateUserSettings)) || '';
              } catch (err) {}
            }
            if (!tokenToUse) {
              Alert.alert('Configuración Requerida', 'Por favor guarda tu token de acceso o refresh token antes de borrar.');
              return;
            }

            const filesToDelete = [snapshot.textFile, snapshot.imagesFile || ''].filter(Boolean);
            setDeletingKey(snapshot.key);
            try {
              const outcome = await DropboxService.deleteFilesWithRetry(tokenToUse, filesToDelete);
              const failedCount = outcome.failed.length;
              if (outcome.deleted.length > 0) {
                await refreshRemoteSnapshots(true);
              }
              if (failedCount === 0) {
                Alert.alert('Respaldo eliminado', `Se borró correctamente el respaldo "${snapshot.label}" de Dropbox.`);
              } else {
                Alert.alert(
                  'Borrado incompleto',
                  `Se borraron ${outcome.deleted.length} archivo(s), pero ${failedCount} archivo(s) no pudieron borrarse (${outcome.failed.join(', ')}).`
                );
              }
            } catch (e: any) {
              Alert.alert('Error al Borrar', e.message || String(e));
            } finally {
              setDeletingKey(null);
            }
          },
        },
      ]
    );
  };

  const handleSetStorageBudget = async () => {
    const parsed = parseInt((budgetInput || '').replace(/\D/g, ''), 10);
    if (isNaN(parsed) || parsed < 50) {
      Alert.alert('Valor no válido', 'El presupuesto debe ser un número mayor o igual a 50 MB.');
      return;
    }
    try {
      await store.updateUserSettings({ dropboxStorageBudgetMB: parsed, hasLocalChanges: true });
      Alert.alert(
        'Presupuesto Actualizado',
        `El presupuesto de espacio en Dropbox se ha establecido en ${parsed} MB. Los respaldos más antiguos se eliminarán automáticamente si se supera este límite.`
      );
      setBudgetInput(String(parsed));
    } catch (e: any) {
      Alert.alert('Error', `No se pudo cambiar el presupuesto: ${e.message || String(e)}`);
    }
  };

  const formattedLastUploadDate = store.userSettings.lastDropboxUploadTimestamp
    ? new Date(store.userSettings.lastDropboxUploadTimestamp).toLocaleDateString('es-ES') +
      ' ' +
      new Date(store.userSettings.lastDropboxUploadTimestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : 'Nunca';

  const formattedTokenFetchedDate = tokenFetchedAt > 0
    ? new Date(tokenFetchedAt).toLocaleDateString('es-ES') +
      ' ' +
      new Date(tokenFetchedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : 'No registrado aún';

  const storageBudgetMB = store.userSettings.dropboxStorageBudgetMB ?? 1500;

  const isAutoUploadActive = store.userSettings.dropboxAutoUploadEnabled !== false;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <ScreenHeader title="Dropbox y Estado de la BD" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Section 1: Connection & Access Token */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CONFIGURACIÓN DE DROPBOX (OAUTH2)</Text>
          
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="cloud-outline" size={28} color={Accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Credenciales y Refresh Token</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Permite renovar automáticamente el token de acceso cada 4 horas
                </Text>
              </View>
            </View>

            {/* Refresh Token Input */}
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Refresh Token (Ilimitado):</Text>
              <View style={styles.tokenInputRow}>
                <TextInput
                  value={refreshTokenInput}
                  onChangeText={setRefreshTokenInput}
                  placeholder="Pega aquí tu Refresh Token"
                  placeholderTextColor={colors.textSecondary + '80'}
                  secureTextEntry={!showSecrets}
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
                  onPress={() => setShowSecrets(!showSecrets)}
                  style={[styles.iconEyeBtn, { backgroundColor: colors.backgroundSelected }]}
                >
                  <Ionicons name={showSecrets ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.text} />
                </Pressable>
              </View>
            </View>

            {/* App Key & App Secret Inputs */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>App Key (Client ID):</Text>
                <TextInput
                  value={appKeyInput}
                  onChangeText={setAppKeyInput}
                  placeholder="App Key"
                  placeholderTextColor={colors.textSecondary + '80'}
                  style={[
                    styles.tokenInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.background,
                      borderColor: colors.backgroundSelected,
                    },
                  ]}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>App Secret (Opcional):</Text>
                <TextInput
                  value={appSecretInput}
                  onChangeText={setAppSecretInput}
                  placeholder="App Secret"
                  placeholderTextColor={colors.textSecondary + '80'}
                  secureTextEntry={!showSecrets}
                  style={[
                    styles.tokenInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.background,
                      borderColor: colors.backgroundSelected,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Short-Lived Access Token Input */}
            <View style={{ gap: 4, marginTop: 4 }}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Access Token Actual (Caduca en 4h):</Text>
              <View style={styles.tokenInputRow}>
                <TextInput
                  value={tokenInput}
                  onChangeText={setTokenInput}
                  placeholder="Access Token (sl...)"
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
              {hasAccessToken && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                  <Ionicons
                    name={remainingLifetimeMs > 0 || tokenFetchedAt === 0 ? "checkmark-circle-outline" : "alert-circle-outline"}
                    size={14}
                    color={remainingLifetimeMs > 0 || tokenFetchedAt === 0 ? "#34C759" : "#FF9500"}
                  />
                  <Text style={{ color: remainingLifetimeMs > 0 || tokenFetchedAt === 0 ? '#34C759' : '#FF9500', fontSize: 12, fontWeight: '600' }}>
                    {remainingLifetimeText}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.btnRow}>
              <Pressable
                onPress={handleSaveCredentials}
                style={[styles.smallBtn, { backgroundColor: Accent }]}
              >
                <Ionicons name="save-outline" size={16} color="#FFF" />
                <Text style={styles.smallBtnText}>Guardar</Text>
              </Pressable>

              <Pressable
                onPress={handleForceRefreshToken}
                disabled={refreshingToken}
                style={[styles.smallBtn, { backgroundColor: '#5856D6' }]}
              >
                {refreshingToken ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={16} color="#FFF" />
                    <Text style={styles.smallBtnText}>Renovar Token</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={handleTestConnection}
                disabled={testingConnection}
                style={[styles.smallBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                {testingConnection ? (
                  <ActivityIndicator size="small" color={Accent} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color={Accent} />
                    <Text style={[styles.smallBtnText, { color: Accent }]}>Probar</Text>
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
                  await store.updateUserSettings({ dropboxAutoUploadEnabled: false, hasLocalChanges: true });
                  Alert.alert(
                    '🛑 AUTO-SUBIDA PAUSADA (EMERGENCIA)',
                    'Se ha detenido la auto-subida a Dropbox en caso de emergencia para proteger los 8 archivos de respaldo en la nube.'
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
                  await store.updateUserSettings({ dropboxAutoUploadEnabled: true, hasLocalChanges: true });
                  Alert.alert(
                    '▶️ AUTO-SUBIDA REANUDADA',
                    'La sincronización automática de respaldos con rotación por presupuesto se ha vuelto a activar.'
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
                    La auto-subida está en PAUSA. Pulsa para reactivar la sincronización automática de respaldos.
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
                name={activeTasksCount > 0 ? 'shield-checkmark' : 'shield-outline'}
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
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Presupuesto de Almacenamiento:</Text>
              <Text style={{ color: Accent, fontSize: 13, fontWeight: '700' }}>
                {storageBudgetMB} MB
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

        {/* Section 3: RESTAURACIÓN DESDE DROPBOX (SNAPSHOTS) */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RESTAURAR DESDE DROPBOX</Text>
            <Pressable
              onPress={() => refreshRemoteSnapshots()}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}
            >
              <Ionicons name="refresh" size={16} color={Accent} />
              <Text style={{ color: Accent, fontSize: 12, fontWeight: '600' }}>Actualizar</Text>
            </Pressable>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
            Lista los respaldos timestamped (texto + imágenes pareados) actualmente en tu Dropbox:
          </Text>

          {snapshotError && (
            <Text style={{ color: '#FF3B30', fontSize: 12, marginBottom: 6 }}>
              {snapshotError}
            </Text>
          )}

          {/* Date-range filter for the restore list */}
          <SnapshotDateFilter
            from={filterFrom}
            to={filterTo}
            onChange={(next) => {
              setFilterFrom(next.from);
              setFilterTo(next.to);
            }}
            colors={colors}
          />

          <View style={{ gap: 10 }}>
            {remoteSnapshots.length === 0 && !snapshotError ? (
              <View style={[styles.slotCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="cloud-offline-outline" size={18} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    No hay respaldos visibles. Conecta tu cuenta o pulsa "Actualizar".
                  </Text>
                </View>
              </View>
            ) : filteredSnapshots.length === 0 ? (
              <View style={[styles.slotCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="filter-outline" size={18} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }}>
                    No hay respaldos en el rango seleccionado. Ajusta las fechas o pulsa "Limpiar filtro".
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {/* Result count while filtering */}
                {filterActive && (
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                    Mostrando {filteredSnapshots.length} de {remoteSnapshots.length} respaldo(s)
                  </Text>
                )}
                {filteredSnapshots.map((item) => (
                <View
                  key={item.key}
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
                      {item.isPair ? `Respaldo del ${item.label}` : item.timestamp > 0 ? `Respaldo del ${item.label}` : `Respaldo (legacy: ${item.label})`}
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
                          {item.label}
                          {item.isPair ? '' : ' (legacy)'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Info: size + paired */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                      {item.isPair ? 'Texto + Imágenes' : 'Sólo texto'}
                    </Text>
                    {item.size > 0 && (
                      <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                        {(item.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    )}
                  </View>

                  {/* Bottom: Filename */}
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }} numberOfLines={1}>
                      {item.textFile}{item.imagesFile ? ` + ${item.imagesFile}` : ''}
                    </Text>

                    {/* Actions: Restore + Delete */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                      <Pressable
                        onPress={() => handleRestoreSnapshot(item)}
                        disabled={downloadingKey !== null || deletingKey !== null}
                        style={[
                          styles.restoreBtn,
                          { backgroundColor: item.isLatest ? Accent : colors.backgroundSelected },
                        ]}
                      >
                        {downloadingKey === item.key ? (
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

                      <Pressable
                        onPress={() => handleDeleteSnapshot(item)}
                        disabled={deletingKey !== null || downloadingKey !== null}
                        style={[
                          styles.restoreBtn,
                          { backgroundColor: deletingKey === item.key ? '#FF3B30' : 'rgba(255, 59, 48, 0.12)' },
                        ]}
                      >
                        {deletingKey === item.key ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Ionicons name="trash-outline" size={15} color="#FF3B30" />
                            <Text style={[styles.restoreBtnText, { color: '#FF3B30' }]}>
                              Borrar
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
                </>
            )}
          </View>

          {/* Storage Budget control */}
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, marginTop: 12 }]}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Presupuesto de Almacenamiento</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
              Límite máximo de espacio usado en Dropbox. Cuando se supere, se eliminarán los respaldos más antiguos.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <TextInput
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="numeric"
                placeholder="1500"
                style={[
                  styles.budgetInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>MB</Text>
              <Pressable
                onPress={handleSetStorageBudget}
                style={[styles.creditApplyBtn, { backgroundColor: Accent }]}
              >
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Guardar</Text>
              </Pressable>
            </View>
          </View>

          {/* Auto-Sync Cooldown control */}
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, marginTop: 12 }]}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Cooldown de Sincronización</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
              Tiempo mínimo que debe transcurrir desde la última subida automática a Dropbox.
            </Text>
            <View style={[styles.btnRow, { marginTop: 8 }]}>
              {[
                { minutes: 30, label: '30 min' },
                { minutes: 60, label: '1 hora' },
                { minutes: 90, label: '1.5 horas' },
              ].map((opt) => {
                const active = cooldownMinutes === opt.minutes;
                return (
                  <Pressable
                    key={opt.minutes}
                    onPress={() => handleSetCooldownMinutes(opt.minutes)}
                    style={[
                      styles.smallBtn,
                      {
                        backgroundColor: active ? 'rgba(0, 97, 255, 0.2)' : colors.background,
                        borderWidth: 1,
                        borderColor: active ? Accent : colors.backgroundSelected,
                      },
                    ]}
                  >
                    <Ionicons name="time-outline" size={16} color={active ? Accent : colors.textSecondary} />
                    <Text style={[styles.smallBtnText, { color: active ? Accent : colors.textSecondary }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
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
                <Text style={[styles.debugKey, { color: colors.textSecondary }]}>dropboxStorageBudgetMB</Text>
                <Text style={[styles.debugVal, { color: Accent }]}>
                  {storageBudgetMB} MB
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
                <Text style={[styles.debugKey, { color: colors.textSecondary }]}>Refresh Token Configurado</Text>
                <Text style={[styles.debugVal, { color: store.userSettings.dropboxRefreshToken ? '#34C759' : '#FF9500' }]}>
                  {store.userSettings.dropboxRefreshToken ? 'Sí (Auto-renovación)' : 'No (Manual)'}
                </Text>
              </View>

              <View style={[styles.debugItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.debugKey, { color: colors.textSecondary }]}>Antigüedad del Access Token</Text>
                <Text style={[styles.debugVal, { color: isTokenOlderThan4Hours ? '#FF9500' : '#34C759' }]}>
                  {tokenFetchedAt > 0 ? `${timeSinceTokenFetchHours}h (${isTokenOlderThan4Hours ? 'Caducado >4h' : '< 4h Válido'})` : 'Sin registro'}
                </Text>
              </View>

              <View style={[styles.debugItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.debugKey, { color: colors.textSecondary }]}>Intervalo temporizador</Text>
                <Text style={[styles.debugVal, { color: colors.text }]}>
                  Cada 30 min (1.800.000 ms)
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
            </View>
          </View>
        </View>

        {/* Section 5: MANUAL FORCE UPLOAD BUTTON */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUBIDA MANUAL DE EMERGENCIA</Text>

          <View style={styles.actionsContainer}>
            <Pressable
              onPress={handleManualUpload}
              disabled={uploading || downloadingKey !== null}
              style={[styles.actionBtn, { backgroundColor: Accent }]}
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
          <Ionicons name="information-circle-outline" size={22} color={Accent} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: 'bold' }}>
              ¿Cómo funciona el sistema de rotación por presupuesto?
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
              Cada subida (automática o manual) genera una "foto" completa de tu base de datos: un archivo de texto JSON con todos tus datos y un archivo de imágenes con las fotos de tus tareas. Cada foto lleva una marca de tiempo (timestamp) en su nombre, así que los respaldos son ilimitados y siempre únicos.
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
              Para controlar el almacenamiento en Dropbox, se aplica el presupuesto que configures aquí (en MB): tras cada subida, si el total de tus respaldos supera ese tamaño, se borran automáticamente las fotos más antiguas (junto con sus imágenes) hasta que el espacio esté por debajo del límite. Así el sistema guarda para siempre cada subida mientras quepa dentro del presupuesto, y rota (borra) solo las más antiguas cuando el tamaño se excede.
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
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
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
  budgetInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  creditApplyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
