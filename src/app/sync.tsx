import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  useColorScheme,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { useRememberStore, Task } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

const getDefaultServerUrl = (): string => {
  try {
    const hostUri = Constants.expoConfig?.hostUri || '';
    if (hostUri && /^\d+\.\d+\.\d+\.\d+/.test(hostUri)) {
      const host = hostUri.split(':')[0];
      if (host) return `http://${host}:3001`;
    }
  } catch (e) {
    // ignore
  }
  return 'http://192.168.1.100:3001';
};

export default function SyncScreen() {
  const store = useRememberStore();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const [serverUrl, setServerUrl] = useState(getDefaultServerUrl);
  const [syncLoading, setSyncLoading] = useState(false);
  const [previousIps, setPreviousIps] = useState<string[]>([]);

  // Connection state (mobile stays connected so the computer can request data)
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const storeRef = useRef(store);
  storeRef.current = store;

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);

  const handleOpenScanner = async () => {
    if (!permission) {
      Alert.alert('Cámara no disponible', 'La cámara no está lista o no está disponible en este dispositivo.');
      return;
    }
    if (!permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Permiso Denegado', 'Se necesita acceso a la cámara para escanear el código QR.');
        return;
      }
    }
    setIsScanning(true);
  };

  // Load saved serverUrl and history on mount
  useEffect(() => {
    (async () => {
      try {
        const savedUrl = await AsyncStorage.getItem('rube_sync_server_url');
        if (savedUrl) {
          setServerUrl(savedUrl);
        }
        const savedIps = await AsyncStorage.getItem('rube_sync_previous_ips');
        if (savedIps) {
          setPreviousIps(JSON.parse(savedIps));
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const saveIpToHistory = async (ip: string) => {
    try {
      const saved = await AsyncStorage.getItem('rube_sync_previous_ips');
      let list: string[] = saved ? JSON.parse(saved) : [];
      const cleanIp = ip.trim();
      if (!cleanIp) return;
      // Remove if exists to move to top
      list = list.filter(item => item !== cleanIp);
      list.unshift(cleanIp);
      list = list.slice(0, 5); // Max 5 history items
      setPreviousIps(list);
      await AsyncStorage.setItem('rube_sync_previous_ips', JSON.stringify(list));
    } catch (e) {
      console.warn('Error saving IP to history:', e);
    }
  };

  // While connected, poll the server:
  // 1. Check if the computer asks for data.
  // 2. Check if the computer has sent outgoing data to load.
  useEffect(() => {
    if (!connected) return;
    const baseUrl = serverUrl.trim().replace(/\/+$/, '');
    if (!baseUrl) return;

    let alertReqShown = false;
    let alertOutShown = false;
    let isPolling = false;

    const checkRequests = async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        // 1. Check if PC wants to receive mobile data
        if (!alertReqShown && !alertOutShown) {
          const res = await fetch(`${baseUrl}/api/request`);
          const data = await res.json().catch(() => ({}));
          if (data.request) {
            alertReqShown = true;
            Alert.alert(
              'Solicitud del ordenador',
              'El ordenador quiere recibir tus datos de RubeRemember. ¿Permitir el envío?',
              [
                {
                  text: 'Rechazar',
                  style: 'cancel',
                  onPress: () => {
                    alertReqShown = false;
                  },
                },
                {
                  text: 'Permitir y Enviar',
                  onPress: async () => {
                    try {
                      const json = await storeRef.current.exportBackupData();
                      await fetch(`${baseUrl}/api/backup`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: json,
                      });
                    } catch (e) {
                      console.error(e);
                      Alert.alert('Error', 'No se pudieron enviar los datos al ordenador.');
                    } finally {
                      alertReqShown = false;
                    }
                  },
                },
              ],
              { cancelable: false }
            );
          }
        }

        // 2. Check if PC sent data for mobile
        if (!alertOutShown && !alertReqShown) {
          const res = await fetch(`${baseUrl}/api/outgoing`);
          const data = await res.json().catch(() => ({}));
          if (data && data.data) {
            alertOutShown = true;
            const incomingDb = data.data;
            const itemCount = Array.isArray(incomingDb.items) ? incomingDb.items.length : 0;

            Alert.alert(
              '⚠️ SOLICITUD DE SOBRESCRITURA DEL ORDENADOR',
              `El ordenador ha enviado una copia de su base de datos (${itemCount} elementos).\n\nATENCIÓN: Si autorizas esta operación, la base de datos actual del móvil se SOBRESCRIBIRÁ con la información recibida del ordenador.\n\n¿Deseas autorizar expresamente esta importación?`,
              [
                {
                  text: 'Rechazar (Recomendado)',
                  style: 'cancel',
                  onPress: () => {
                    alertOutShown = false;
                  },
                },
                {
                  text: 'Autorizar y Sobrescribir',
                  style: 'destructive',
                  onPress: async () => {
                    setSyncLoading(true);
                    try {
                      // Compare tasks before overwriting
                      const currentTasks = storeRef.current.items.filter(item => item.type === 'TASK') as Task[];
                      const incomingTasks = (incomingDb.items || []).filter((item: any) => item.type === 'TASK') as Task[];

                      const modifiedTitles: string[] = [];

                      // Additions and edits
                      for (const incomingTask of incomingTasks) {
                        const localTask = currentTasks.find(t => t.id === incomingTask.id);
                        if (!localTask) {
                          modifiedTitles.push(`➕ ${incomingTask.title} (Nueva)`);
                        } else {
                          const isDifferent =
                            localTask.title !== incomingTask.title ||
                            localTask.completed !== incomingTask.completed ||
                            localTask.progress !== incomingTask.progress ||
                            localTask.priority !== incomingTask.priority ||
                            localTask.description !== incomingTask.description ||
                            localTask.dueDate !== incomingTask.dueDate ||
                            localTask.startDate !== incomingTask.startDate;

                          if (isDifferent) {
                            let changes = [];
                            if (localTask.completed !== incomingTask.completed) {
                              changes.push(incomingTask.completed ? 'Completada' : 'Reabierta');
                            }
                            if (localTask.title !== incomingTask.title) {
                              changes.push('Título editado');
                            }
                            if (localTask.progress !== incomingTask.progress) {
                              changes.push(`Progreso: ${incomingTask.progress || 0}%`);
                            }
                            const changeStr = changes.length > 0 ? ` (${changes.join(', ')})` : ' (Editada)';
                            modifiedTitles.push(`✏️ ${incomingTask.title}${changeStr}`);
                          }
                        }
                      }

                      // Deletions
                      for (const localTask of currentTasks) {
                        const incomingTask = incomingTasks.find(t => t.id === localTask.id);
                        if (!incomingTask) {
                          modifiedTitles.push(`🗑️ ${localTask.title} (Eliminada)`);
                        }
                      }

                      const result = await storeRef.current.importBackupData(JSON.stringify(incomingDb));
                      if (result.success) {
                        const message = modifiedTitles.length > 0
                          ? `Datos del ordenador importados correctamente.\n\nTareas modificadas:\n${modifiedTitles.join('\n')}`
                          : 'Datos del ordenador importados correctamente (sin cambios detectados en tareas).';
                        Alert.alert('Sincronización Completada', message);
                      } else {
                        Alert.alert('Error', 'No se pudieron importar los datos: ' + result.errors.join(', '));
                      }
                    } catch (err) {
                      console.error(err);
                      Alert.alert('Error', 'Error al procesar la importación.');
                    } finally {
                      setSyncLoading(false);
                      alertOutShown = false;
                    }
                  },
                },
              ],
              { cancelable: false }
            );
          }
        }
      } catch (e) {
        // Keep checking silently
      } finally {
        isPolling = false;
      }
    };

    checkRequests();
    const id = setInterval(checkRequests, 3000);
    return () => clearInterval(id);
  }, [connected, serverUrl]);

  const handleConnect = async () => {
    const baseUrl = serverUrl.trim().replace(/\/+$/, '');
    if (!baseUrl) {
      Alert.alert('Error', 'Introduce la dirección del ordenador (ej: http://192.168.1.10:3001).');
      return;
    }
    setIsConnecting(true);
    try {
      // Save manually configured server URL
      await AsyncStorage.setItem('rube_sync_server_url', baseUrl);
      await saveIpToHistory(baseUrl);

      const res = await fetch(baseUrl + '/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setConnected(true);
        Alert.alert('Conectado', 'Conectado al servidor del ordenador. Ya puedes recibir peticiones de datos.');
      } else {
        Alert.alert('Error', 'El servidor no aceptó la conexión.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo conectar con el ordenador. Comprueba la dirección y la red Wi-Fi.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const baseUrl = serverUrl.trim().replace(/\/+$/, '');
      if (baseUrl) {
        await fetch(baseUrl + '/api/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      // ignore
    }
    setConnected(false);
  };

  const handleSendToComputer = async () => {
    try {
      setSyncLoading(true);
      const baseUrl = serverUrl.trim().replace(/\/+$/, '');
      if (!baseUrl) {
        setSyncLoading(false);
        Alert.alert('Error', 'Introduce la dirección del ordenador (ej: http://192.168.1.10:3001).');
        return;
      }

      // Save manually configured server URL
      await AsyncStorage.setItem('rube_sync_server_url', baseUrl);
      await saveIpToHistory(baseUrl);

      const json = await store.exportBackupData();
      const res = await fetch(baseUrl + '/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: json,
      });
      const data = await res.json().catch(() => ({}));
      setSyncLoading(false);

      if (data.ok) {
        Alert.alert(
          'Enviado',
          `Base de datos enviada a ${baseUrl}.`
        );
      } else {
        Alert.alert('Error', 'El servidor no confirmó la recepción: ' + (data.error || ''));
      }
    } catch (e) {
      setSyncLoading(false);
      console.error(e);
      Alert.alert(
        'Error',
        'No se pudo conectar con el ordenador. Comprueba que ambos estén en la misma red Wi-Fi y que la app web esté abierta.'
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.backgroundSelected }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Sincronización Local</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          {/* Local network sync */}
          <View style={styles.syncSection}>
            <View style={styles.syncHeader}>
              <Ionicons name="swap-horizontal" size={22} color="#34C759" />
              <Text style={[styles.syncTitle, { color: colors.text }]}>Sincronización por Red Local</Text>
            </View>
            <Text style={[styles.syncDescription, { color: colors.textSecondary }]}>
              Envía o recibe el JSON completo entre el móvil y el ordenador usando el servidor localhost de la app web.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Dirección del ordenador</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.serverInput, { backgroundColor: colors.background, borderColor: colors.backgroundSelected, color: colors.text, flex: 1, marginBottom: 0 }]}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.1.10:3001"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Pressable
                onPress={handleOpenScanner}
                style={[styles.scanBtn, { backgroundColor: colors.backgroundSelected, borderColor: colors.backgroundSelected }]}
              >
                <Ionicons name="qr-code-outline" size={22} color="#FF9500" />
              </Pressable>
            </View>

            {previousIps.length > 0 && (
              <View style={styles.previousIpsContainer}>
                <Text style={[styles.previousIpsLabel, { color: colors.textSecondary }]}>IPs conectadas anteriormente (toca para seleccionar):</Text>
                <View style={styles.ipsRow}>
                  {previousIps.map((ip, idx) => (
                    <Pressable
                      key={idx}
                      style={[styles.ipPill, { backgroundColor: colors.backgroundSelected, borderColor: colors.backgroundSelected }]}
                      onPress={() => setServerUrl(ip)}
                    >
                      <Text style={[styles.ipPillText, { color: colors.text }]}>{ip.replace(/^https?:\/\//, '')}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Connection status: mobile stays connected so the computer can request data */}
            <View
              style={[
                styles.connectionBox,
                {
                  backgroundColor: connected ? 'rgba(52,199,89,0.12)' : colors.background,
                  borderColor: connected ? '#34C759' : colors.backgroundSelected,
                },
              ]}
            >
              <View style={styles.connectionRow}>
                <View style={[styles.connectionDot, { backgroundColor: connected ? '#34C759' : colors.textSecondary }]} />
                <Text style={[styles.connectionText, { color: connected ? '#34C759' : colors.textSecondary }]}>
                  {connected ? 'Conectado al servidor del ordenador' : 'Desconectado'}
                </Text>
              </View>
              <Text style={[styles.connectionHint, { color: colors.textSecondary }]}>
                {connected
                  ? 'El ordenador ya puede solicitar tus datos con el botón "Solicitar datos" de la app web. Se te pedirá confirmación antes de enviarlos.'
                  : 'Conéctate para que el ordenador pueda solicitar tu información.'}
              </Text>
              {isConnecting ? (
                <ActivityIndicator size="small" color="#34C759" style={styles.loader} />
              ) : connected ? (
                <Pressable
                  onPress={handleDisconnect}
                  style={[styles.actionBtn, { backgroundColor: colors.backgroundSelected, borderWidth: 1, borderColor: '#FF3B30' }]}
                >
                  <Ionicons name="link-outline" size={20} color="#FF3B30" />
                  <Text style={[styles.actionBtnText, { color: '#FF3B30' }]}>Desconectar</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleConnect}
                  style={[styles.actionBtn, { backgroundColor: '#0A84FF' }]}
                >
                  <Ionicons name="link-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Conectar al servidor</Text>
                </Pressable>
              )}
            </View>

            {syncLoading ? (
              <ActivityIndicator size="small" color="#34C759" style={styles.loader} />
            ) : (
              <Pressable
                onPress={handleSendToComputer}
                style={[styles.actionBtn, { backgroundColor: '#34C759', width: '100%' }]}
              >
                <Ionicons name="arrow-up-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Enviar al Ordenador</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal
        visible={isScanning}
        animationType="slide"
        onRequestClose={() => setIsScanning(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
          {/* Header overlay */}
          <View style={styles.scannerHeader}>
            <Pressable onPress={() => setIsScanning(false)} style={styles.scannerCloseBtn}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.scannerHeaderTitle}>Escanear Código QR</Text>
            <View style={{ width: 40 }} />
          </View>

          {permission?.granted ? (
            <View style={styles.cameraContainer}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={({ data }) => {
                  if (data) {
                    setServerUrl(data);
                    setIsScanning(false);
                    Alert.alert('Código QR Escaneado', `Dirección configurada a:\n${data}`);
                  }
                }}
              />
              {/* Target finder guide overlay */}
              <View style={styles.overlayContainer}>
                <View style={styles.finderFrame} />
                <Text style={styles.scannerHint}>Apunta con la cámara al código QR de la web</Text>
              </View>
            </View>
          ) : (
            <View style={styles.permissionContainer}>
              <Ionicons name="camera-outline" size={60} color="#FFFFFF" style={{ marginBottom: 20 }} />
              <Text style={styles.permissionText}>Se necesita permiso de la cámara para escanear el código QR.</Text>
              <Pressable
                onPress={async () => {
                  const res = await requestPermission();
                  if (res.granted) {
                    setIsScanning(true);
                  } else {
                    Alert.alert('Permiso Denegado', 'No se puede escanear sin acceso a la cámara.');
                  }
                }}
                style={[styles.actionBtn, { backgroundColor: '#0A84FF', marginTop: 20 }]}
              >
                <Text style={styles.actionBtnText}>Conceder Permiso</Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </Modal>
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  loader: {
    marginVertical: 20,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  syncSection: {
    width: '100%',
    alignItems: 'center',
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  syncTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  syncDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  serverInput: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  previousIpsContainer: {
    width: '100%',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  previousIpsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  ipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ipPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ipPillText: {
    fontSize: 13,
  },
  connectionBox: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  connectionHint: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  scanBtn: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#000000',
  },
  scannerCloseBtn: {
    padding: 8,
  },
  scannerHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  finderFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#FF9500',
    backgroundColor: 'transparent',
    borderRadius: 16,
    marginBottom: 24,
  },
  scannerHint: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#000000',
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
});
