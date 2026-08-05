import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore, HourWeight, CustomCategory } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

export default function SettingsScreen() {
  const store = useRememberStore();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  // Modal State for Adding/Editing Weight
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWeight, setEditingWeight] = useState<HourWeight | null>(null);
  const [weightName, setWeightName] = useState('');
  const [minHoursStr, setMinHoursStr] = useState('');

  // Modal State for Adding/Editing Activity Category
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<CustomCategory | null>(null);
  const [catName, setCatName] = useState('');

  const openAddModal = () => {
    setEditingWeight(null);
    setWeightName('');
    setMinHoursStr('');
    setModalVisible(true);
  };

  const openEditModal = (weight: HourWeight) => {
    setEditingWeight(weight);
    setWeightName(weight.name);
    setMinHoursStr(String(weight.minHours));
    setModalVisible(true);
  };

  const handleSaveWeight = async () => {
    const name = weightName.trim();
    if (!name) {
      Alert.alert('Nombre vacío', 'Por favor ingresa un nombre para la etiqueta (ej. 🌙 Luna).');
      return;
    }

    const minHours = parseFloat(minHoursStr.trim());
    if (isNaN(minHours) || minHours < 0) {
      Alert.alert('Horas inválidas', 'Por favor ingresa un número de horas mínimo válido (mayor o igual a 0).');
      return;
    }

    try {
      if (editingWeight) {
        await store.updateHourWeight(editingWeight.id, name, minHours);
      } else {
        await store.addHourWeight(name, minHours);
      }
      setModalVisible(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo guardar el peso de horas.');
    }
  };

  const handleDeleteWeight = (weight: HourWeight) => {
    Alert.alert(
      'Eliminar Etiqueta',
      `¿Estás seguro de que quieres eliminar la clasificación "${weight.name}"? Las tareas asociadas se reclasificarán automáticamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await store.deleteHourWeight(weight.id);
          },
        },
      ]
    );
  };

  const openAddCatModal = () => {
    setEditingCat(null);
    setCatName('');
    setCatModalVisible(true);
  };

  const openEditCatModal = (cat: CustomCategory) => {
    if (cat.id === 'OTHER') {
      Alert.alert('Acción no permitiva', 'La categoría de sistema "Otro" no se puede modificar.');
      return;
    }
    setEditingCat(cat);
    setCatName(cat.name);
    setCatModalVisible(true);
  };

  const handleSaveCat = async () => {
    const name = catName.trim();
    if (!name) {
      Alert.alert('Nombre vacío', 'Por favor ingresa un nombre para la categoría (ej. 🎮 Videojuegos).');
      return;
    }

    try {
      if (editingCat) {
        await store.updateActivityCategory(editingCat.id, name);
      } else {
        await store.addActivityCategory(name);
      }
      setCatModalVisible(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo guardar la categoría.');
    }
  };

  const handleDeleteCat = (cat: CustomCategory) => {
    if (cat.id === 'OTHER') {
      Alert.alert('Acción no permitida', 'La categoría de sistema "Otro" no se puede eliminar.');
      return;
    }
    Alert.alert(
      'Eliminar Categoría',
      `¿Estás seguro de que quieres eliminar la categoría "${cat.name}"? Las actividades asociadas se moverán a "Otro".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await store.deleteActivityCategory(cat.id);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.backgroundSelected }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Configuración</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Section 1: Backup & Recovery */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DATOS Y RESPALDOS</Text>
          <Pressable
            onPress={() => router.push('/backup')}
            style={[styles.menuItem, { backgroundColor: colors.backgroundElement }]}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
                <Ionicons name="cloud-upload-outline" size={20} color="#FF9500" />
              </View>
              <View>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Copia de Seguridad</Text>
                <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                  Exportar e importar datos en formato JSON
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Section 2: Hour Weights Classification */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PESO DE HORAS (ETIQUETAS)</Text>
            <Pressable onPress={openAddModal} style={styles.addBtn}>
              <Ionicons name="add-circle" size={24} color="#FF9500" />
              <Text style={styles.addBtnText}>Añadir</Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Configura las etiquetas de clasificación que se asignan automáticamente a las tareas según la cantidad de horas estimadas.
          </Text>

          <View style={styles.weightsList}>
            {store.hourWeights.length === 0 ? (
              <View style={[styles.emptyWeights, { backgroundColor: colors.backgroundElement }]}>
                <Ionicons name="timer-outline" size={32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No hay rangos de peso configurados.</Text>
              </View>
            ) : (
              store.hourWeights.map((w, index) => {
                // Find next weight to show range nicely (e.g. 1-5h)
                const nextWeight = store.hourWeights[index + 1];
                const rangeText = nextWeight
                  ? `Mínimo: ${w.minHours}h (Rango: ${w.minHours} a <${nextWeight.minHours}h)`
                  : `Mínimo: ${w.minHours}h (Rango: ≥ ${w.minHours}h)`;

                return (
                  <View key={w.id} style={[styles.weightCard, { backgroundColor: colors.backgroundElement }]}>
                    <View style={styles.weightCardLeft}>
                      <Text style={[styles.weightName, { color: colors.text }]}>{w.name}</Text>
                      <Text style={[styles.weightRange, { color: colors.textSecondary }]}>{rangeText}</Text>
                    </View>
                    <View style={styles.weightCardActions}>
                      <Pressable onPress={() => openEditModal(w)} style={styles.actionIconButton}>
                        <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteWeight(w)} style={styles.actionIconButton}>
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Section 3: Leisure Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CATEGORÍAS DE OCIO</Text>
            <Pressable onPress={openAddCatModal} style={styles.addBtn}>
              <Ionicons name="add-circle" size={24} color="#5856D6" />
              <Text style={[styles.addBtnText, { color: '#5856D6' }]}>Añadir</Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Administra tus categorías personalizadas para organizar tus actividades y recomendaciones de ocio.
          </Text>

          <View style={styles.weightsList}>
            {store.activityCategories.length === 0 ? (
              <View style={[styles.emptyWeights, { backgroundColor: colors.backgroundElement }]}>
                <Ionicons name="folder-open-outline" size={32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No tienes categorías personalizadas.</Text>
              </View>
            ) : (
              store.activityCategories.map((cat) => (
                <View key={cat.id} style={[styles.weightCard, { backgroundColor: colors.backgroundElement }]}>
                  <View style={styles.weightCardLeft}>
                    <Text style={[styles.weightName, { color: colors.text }]}>{cat.name}</Text>
                  </View>
                  <View style={styles.weightCardActions}>
                    {cat.id !== 'OTHER' ? (
                      <>
                        <Pressable onPress={() => openEditCatModal(cat)} style={styles.actionIconButton}>
                          <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteCat(cat)} style={styles.actionIconButton}>
                          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        </Pressable>
                      </>
                    ) : (
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontStyle: 'italic' }}>Sistema</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingWeight ? 'Editar Clasificación' : 'Nueva Clasificación'}
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Nombre de la Etiqueta</Text>
              <TextInput
                value={weightName}
                onChangeText={setWeightName}
                placeholder="ej. 🌙 Luna, 🌍 Terra, ☀️ Sol, Rápida"
                placeholderTextColor={colors.textSecondary + '80'}
                style={[styles.modalInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Horas Mínimas</Text>
              <TextInput
                value={minHoursStr}
                onChangeText={setMinHoursStr}
                keyboardType="numeric"
                placeholder="ej. 1, 5, 10"
                placeholderTextColor={colors.textSecondary + '80'}
                style={[styles.modalInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={[styles.modalBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveWeight}
                style={[styles.modalBtn, { backgroundColor: '#FF9500' }]}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add/Edit Category Modal */}
      <Modal
        visible={catModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCatModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Nombre de la Categoría</Text>
              <TextInput
                value={catName}
                onChangeText={setCatName}
                placeholder="ej. 🎮 Videojuegos, 🍕 Comida, Cine"
                placeholderTextColor={colors.textSecondary + '80'}
                style={[styles.modalInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setCatModalVisible(false)}
                style={[styles.modalBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveCat}
                style={[styles.modalBtn, { backgroundColor: '#5856D6' }]}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    padding: 20,
    gap: 28,
  },
  section: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  menuItemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  weightsList: {
    gap: 10,
  },
  weightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  weightCardLeft: {
    flex: 1,
    gap: 4,
  },
  weightName: {
    fontSize: 16,
    fontWeight: '700',
  },
  weightRange: {
    fontSize: 12,
  },
  weightCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconButton: {
    padding: 6,
  },
  emptyWeights: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
