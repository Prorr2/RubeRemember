import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  useColorScheme,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { useRememberStore } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

export default function BackupScreen() {
  const store = useRememberStore();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const [loading, setLoading] = useState(false);

  const handleExportBackup = async () => {
    setLoading(true);
    try {
      const backupStr = await store.exportBackupData();
      const fileUri = FileSystem.cacheDirectory + 'rube_remember_backup.json';
      
      await FileSystem.writeAsStringAsync(fileUri, backupStr, {
        encoding: 'utf8',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar Copia de Seguridad RubeRemember',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Error', 'El servicio de compartir no está disponible.');
      }
    } catch (e) {
      console.error(e);
      const errMsg = e instanceof Error ? e.message : String(e);
      Alert.alert('Error', `No se pudo exportar la copia de seguridad. Detalle: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setLoading(true);
      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'utf8',
      });

      setLoading(false);
      Alert.alert(
        'Confirmar Restauración',
        '¿Desea restaurar esta copia de seguridad? Esto sobrescribirá todos tus datos actuales de RubeRemember.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar y Sobrescribir',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              const resultObj = await store.importBackupData(fileContent);
              setLoading(false);
              if (resultObj.success) {
                Alert.alert('Éxito', 'La copia de seguridad se ha restaurado con éxito.', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                const errorsMsg = resultObj.errors ? resultObj.errors.join(', ') : 'Archivo inválido.';
                Alert.alert('Error', 'No se pudieron importar los datos: ' + errorsMsg);
              }
            },
          },
        ]
      );
    } catch (e) {
      setLoading(false);
      console.error(e);
      const errMsg = e instanceof Error ? e.message : String(e);
      Alert.alert('Error', `No se pudo importar la copia de seguridad. Detalle: ${errMsg}`);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.backgroundSelected }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Copia de Seguridad</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main Content */}
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-upload-outline" size={80} color="#FF9500" />
          </View>
          
          <Text style={[styles.title, { color: colors.text }]}>Resguardar tus Datos</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Exporta tus tareas, recordatorios, comentarios e ideas en un archivo JSON. Puedes guardarlo en la nube, enviarlo por chat o importarlo de vuelta en cualquier momento.
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#FF9500" style={styles.loader} />
          ) : (
            <View style={styles.btnGroup}>
              {/* Export */}
              <Pressable
                onPress={handleExportBackup}
                style={[styles.actionBtn, { backgroundColor: '#FF9500' }]}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Exportar a Archivo JSON</Text>
              </Pressable>

              {/* Import */}
              <Pressable
                onPress={handleImportBackup}
                style={[styles.actionBtn, { backgroundColor: colors.backgroundSelected, borderWidth: 1, borderColor: '#FF9500' }]}
              >
                <Ionicons name="cloud-download-outline" size={20} color="#FF9500" />
                <Text style={[styles.actionBtnText, { color: '#FF9500' }]}>Importar desde JSON</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
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
    flex: 1,
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
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 30,
  },
  loader: {
    marginVertical: 20,
  },
  btnGroup: {
    width: '100%',
    gap: 16,
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
});
