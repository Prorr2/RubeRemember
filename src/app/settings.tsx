import React, { useState, useEffect } from 'react';
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

import { useRememberStore, HourWeight, CustomCategory, TaskCategory, VoiceKeywords, DEFAULT_VOICE_KEYWORDS } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';
import { useSettingsService } from '@/services/SettingsService';
import { ScoreEngine } from '@/engines/ScoreEngine';

export default function SettingsScreen() {
  const store = useRememberStore();
  const router = useRouter();
  const settingsService = useSettingsService();

  // Local states for inputs to avoid premature updates during typing
  const [localFormula, setLocalFormula] = useState(store.userSettings.scoreFormula || '((hours * (priorityWeight * priorityWeight)) / daysRemaining) / 1000');
  const [localMaxFocus, setLocalMaxFocus] = useState(String(store.userSettings.maxFocusTasks));
  const [localCooldown, setLocalCooldown] = useState(String(store.userSettings.defaultCooldown));
  const [localLuna, setLocalLuna] = useState(String(store.userSettings.lunaDuration));
  const [localTerra, setLocalTerra] = useState(String(store.userSettings.terraDuration));
  const [localSol, setLocalSol] = useState(String(store.userSettings.solDuration));
  const [localAstra, setLocalAstra] = useState(String(store.userSettings.astraDuration));
  
  const [localSleepStart, setLocalSleepStart] = useState(store.userSettings.sleepSchedule?.start || '23:00');
  const [localSleepEnd, setLocalSleepEnd] = useState(store.userSettings.sleepSchedule?.end || '07:00');
  
  const [localWorkStart, setLocalWorkStart] = useState(store.userSettings.workingHours?.start || '09:00');
  const [localWorkEnd, setLocalWorkEnd] = useState(store.userSettings.workingHours?.end || '18:00');

  const [localVoiceType, setLocalVoiceType] = useState('');
  const [localVoiceTitle, setLocalVoiceTitle] = useState('');
  const [localVoiceDesc, setLocalVoiceDesc] = useState('');
  const [localVoicePrio, setLocalVoicePrio] = useState('');
  const [localVoiceWeight, setLocalVoiceWeight] = useState('');
  const [localVoiceHours, setLocalVoiceHours] = useState('');
  const [localVoiceDate, setLocalVoiceDate] = useState('');
  const [localVoiceTime, setLocalVoiceTime] = useState('');
  const [localVoiceEnergy, setLocalVoiceEnergy] = useState('');
  const [localVoiceSlot, setLocalVoiceSlot] = useState('');
  const [localVoiceGoal, setLocalVoiceGoal] = useState('');
  const [localVoiceFavourite, setLocalVoiceFavourite] = useState('');
  const [localVoiceQueryLists, setLocalVoiceQueryLists] = useState('');
  const [localVoiceQueryListItems, setLocalVoiceQueryListItems] = useState('');
  const [localVoiceAddListItem, setLocalVoiceAddListItem] = useState('');

  // Sync local states if store.userSettings changes externally
  useEffect(() => {
    setLocalFormula(store.userSettings.scoreFormula || '((hours * (priorityWeight * priorityWeight)) / daysRemaining) / 1000');
    setLocalMaxFocus(String(store.userSettings.maxFocusTasks));
    setLocalCooldown(String(store.userSettings.defaultCooldown));
    setLocalLuna(String(store.userSettings.lunaDuration));
    setLocalTerra(String(store.userSettings.terraDuration));
    setLocalSol(String(store.userSettings.solDuration));
    setLocalAstra(String(store.userSettings.astraDuration));
    setLocalSleepStart(store.userSettings.sleepSchedule?.start || '23:00');
    setLocalSleepEnd(store.userSettings.sleepSchedule?.end || '07:00');
    setLocalWorkStart(store.userSettings.workingHours?.start || '09:00');
    setLocalWorkEnd(store.userSettings.workingHours?.end || '18:00');

    const vk = store.userSettings?.voiceKeywords || DEFAULT_VOICE_KEYWORDS || {
      type: [], title: [], description: [], priority: [], weight: [], hours: [], date: [], time: [], energy: [], slot: [], goal: [], favourite: [], queryLists: [], queryListItems: [], addListItem: []
    };
    setLocalVoiceType((vk.type || []).join(', '));
    setLocalVoiceTitle((vk.title || []).join(', '));
    setLocalVoiceDesc((vk.description || []).join(', '));
    setLocalVoicePrio((vk.priority || []).join(', '));
    setLocalVoiceWeight((vk.weight || []).join(', '));
    setLocalVoiceHours((vk.hours || []).join(', '));
    setLocalVoiceDate((vk.date || []).join(', '));
    setLocalVoiceTime((vk.time || []).join(', '));
    setLocalVoiceEnergy((vk.energy || []).join(', '));
    setLocalVoiceSlot((vk.slot || []).join(', '));
    setLocalVoiceGoal((vk.goal || []).join(', '));
    setLocalVoiceFavourite((vk.favourite || []).join(', '));
    setLocalVoiceQueryLists((vk.queryLists || []).join(', '));
    setLocalVoiceQueryListItems((vk.queryListItems || []).join(', '));
    setLocalVoiceAddListItem((vk.addListItem || []).join(', '));
  }, [store.userSettings]);

  const handleUpdateKeywords = async (field: keyof VoiceKeywords, value: string) => {
    const list = value
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const currentKeywords = store.userSettings?.voiceKeywords || DEFAULT_VOICE_KEYWORDS || {
      type: [], title: [], description: [], priority: [], weight: [], hours: [], date: [], time: [], energy: [], slot: [], goal: [], favourite: [], queryLists: [], queryListItems: [], addListItem: []
    };
    const updatedKeywords = {
      ...currentKeywords,
      [field]: list
    };

    try {
      await settingsService.updateSettings({
        voiceKeywords: updatedKeywords
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudieron guardar las palabras clave.');
    }
  };

  const moveItem = async (listName: 'preferredOrderEnergy' | 'preferredOrderWeight', index: number, direction: 'up' | 'down') => {
    const currentList = [...(store.userSettings[listName] || [])];
    if (direction === 'up' && index > 0) {
      const temp = currentList[index];
      currentList[index] = currentList[index - 1];
      currentList[index - 1] = temp;
    } else if (direction === 'down' && index < currentList.length - 1) {
      const temp = currentList[index];
      currentList[index] = currentList[index + 1];
      currentList[index + 1] = temp;
    }
    await settingsService.updateSettings({ [listName]: currentList });
  };

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

  // Modal State for Adding/Editing Task Category
  const [taskCatModalVisible, setTaskCatModalVisible] = useState(false);
  const [editingTaskCat, setEditingTaskCat] = useState<TaskCategory | null>(null);
  const [taskCatName, setTaskCatName] = useState('');
  const [taskCatEmoji, setTaskCatEmoji] = useState('📁');

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

  const openAddTaskCatModal = () => {
    setEditingTaskCat(null);
    setTaskCatName('');
    setTaskCatEmoji('📁');
    setTaskCatModalVisible(true);
  };

  const openEditTaskCatModal = (cat: TaskCategory) => {
    setEditingTaskCat(cat);
    setTaskCatName(cat.name);
    setTaskCatEmoji(cat.emoji || '📁');
    setTaskCatModalVisible(true);
  };

  const handleSaveTaskCat = async () => {
    const name = taskCatName.trim();
    const emoji = taskCatEmoji.trim();
    if (!name) {
      Alert.alert('Nombre vacío', 'Por favor ingresa un nombre para la categoría de tarea.');
      return;
    }
    if (!emoji) {
      Alert.alert('Emoji requerido', 'Debes elegir o ingresar un emoji obligatorio para la categoría de tarea.');
      return;
    }

    try {
      if (editingTaskCat) {
        await store.updateTaskCategory(editingTaskCat.id, name, emoji);
      } else {
        await store.addTaskCategory(name, emoji);
      }
      setTaskCatModalVisible(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo guardar la categoría de tarea.');
    }
  };

  const handleDeleteTaskCat = (cat: TaskCategory) => {
    Alert.alert(
      'Eliminar Categoría de Tarea',
      `¿Estás seguro de que quieres eliminar la categoría "${cat.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await store.deleteTaskCategory(cat.id);
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
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

          <Pressable
            onPress={() => router.push('/dropbox')}
            style={[styles.menuItem, { backgroundColor: colors.backgroundElement, marginTop: 8 }]}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 97, 255, 0.15)' }]}>
                <Ionicons name="cloud-done-outline" size={20} color="#0061FF" />
              </View>
              <View>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Dropbox y Estado de la BD</Text>
                <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                  {store.userSettings.dropboxAccessToken
                    ? `Auto-subida activa • ${store.userSettings.lastDropboxUploadStatus || 'Listo'}`
                    : 'Configurar token de Dropbox y ver estado'}
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

        {/* Section: Task Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CATEGORÍAS DE TAREA</Text>
            <Pressable onPress={openAddTaskCatModal} style={styles.addBtn}>
              <Ionicons name="add-circle" size={24} color="#34C759" />
              <Text style={[styles.addBtnText, { color: '#34C759' }]}>Añadir</Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Administra categorías personalizadas para clasificar tus tareas cuando no se asignan a un objetivo.
          </Text>

          <View style={styles.weightsList}>
            {store.taskCategories.length === 0 ? (
              <View style={[styles.emptyWeights, { backgroundColor: colors.backgroundElement }]}>
                <Ionicons name="folder-open-outline" size={32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No tienes categorías de tarea.</Text>
              </View>
            ) : (
              store.taskCategories.map((tcat) => (
                <View key={tcat.id} style={[styles.weightCard, { backgroundColor: colors.backgroundElement }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Text style={{ fontSize: 18 }}>{tcat.emoji}</Text>
                    <Text style={[styles.weightName, { color: colors.text }]}>{tcat.name}</Text>
                  </View>
                  <View style={styles.weightCardActions}>
                    <Pressable onPress={() => openEditTaskCatModal(tcat)} style={styles.actionIconButton}>
                      <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteTaskCat(tcat)} style={styles.actionIconButton}>
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Section 4: Algoritmo y Cognitive Engine */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ALGORITMO COGNITIVO</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Personaliza el comportamiento del RubeRemember Cognitive Engine para adaptarlo a tus ritmos de trabajo.
          </Text>

          <View style={[styles.cardGroup, { backgroundColor: colors.backgroundElement }]}>
            {/* Max Focus */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Máximo de tareas en Focus</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Límite para la auto-promoción y foco manual</Text>
              </View>
              <TextInput
                value={localMaxFocus}
                onChangeText={setLocalMaxFocus}
                onBlur={async () => {
                  const num = parseInt(localMaxFocus, 10);
                  if (!isNaN(num) && num > 0) {
                    await settingsService.updateSettings({ maxFocusTasks: num });
                  } else {
                    setLocalMaxFocus(String(store.userSettings.maxFocusTasks));
                  }
                }}
                keyboardType="number-pad"
                style={[styles.smallInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Cooldown */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Duración Cooldown (minutos)</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Tiempo de penalización al presionar "No ahora"</Text>
              </View>
              <TextInput
                value={localCooldown}
                onChangeText={setLocalCooldown}
                onBlur={async () => {
                  const num = parseInt(localCooldown, 10);
                  if (!isNaN(num) && num >= 0) {
                    await settingsService.updateSettings({ defaultCooldown: num });
                  } else {
                    setLocalCooldown(String(store.userSettings.defaultCooldown));
                  }
                }}
                keyboardType="number-pad"
                style={[styles.smallInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Notifications Enabled */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Notificaciones Activas</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Activar recordatorios y alertas inteligentes</Text>
              </View>
              <Pressable
                onPress={async () => {
                  await settingsService.updateSettings({ notificationsEnabled: !store.userSettings.notificationsEnabled });
                }}
                style={[styles.toggleBtn, { backgroundColor: store.userSettings.notificationsEnabled ? '#34C759' : colors.backgroundSelected }]}
              >
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                  {store.userSettings.notificationsEnabled ? 'SÍ' : 'NO'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Section: Fórmula Personalizada de Score */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FÓRMULA DE PRIORIZACIÓN DE TAREAS</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Personaliza matemáticamente cómo se calcula el score de prioridad de tus tareas pendientes.
          </Text>

          <View style={[styles.cardGroup, { backgroundColor: colors.backgroundElement, padding: 12 }]}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 6 }}>Fórmula Matemática:</Text>
            <TextInput
              value={localFormula}
              onChangeText={setLocalFormula}
              placeholder="Ej. (hours * (priorityWeight * priorityWeight)) / daysRemaining"
              placeholderTextColor={colors.textSecondary + '80'}
              multiline={true}
              style={[
                styles.fullWidthInput,
                {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: colors.backgroundSelected,
                  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                  fontSize: 13,
                  padding: 10,
                  minHeight: 50,
                  textAlignVertical: 'top',
                  borderRadius: 8,
                  borderWidth: 1,
                  marginBottom: 12,
                }
              ]}
            />

            {/* Variable help text card */}
            <View style={{ backgroundColor: colors.background, padding: 10, borderRadius: 8, gap: 4, marginBottom: 12 }}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>Variables Disponibles:</Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ color: '#FF9500', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}>hours</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'right', flex: 1, marginLeft: 8 }}>Horas estimadas (mín. 1)</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ color: '#FF9500', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}>priorityWeight</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'right', flex: 1, marginLeft: 8 }}>Peso prioridad (Baja:10, Med:30, Alta:60, Urg:100)</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ color: '#FF9500', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}>priority</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'right', flex: 1, marginLeft: 8 }}>Prioridad bruta (1=Baja a 4=Urgente)</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ color: '#FF9500', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}>daysRemaining</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'right', flex: 1, marginLeft: 8 }}>Días restantes ajustados (vencida:0.2, hoy:0.5, sin fecha:0.5)</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ color: '#FF9500', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}>diffDays</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'right', flex: 1, marginLeft: 8 }}>Días restantes reales (negativo si vencida)</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ color: '#FF9500', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}>focusLocked</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'right', flex: 1, marginLeft: 8 }}>1 si está en foco, 0 si no</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ color: '#FF9500', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}>daysSinceProgress</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'right', flex: 1, marginLeft: 8 }}>Días desde último avance</Text>
              </View>

              <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
                Operadores: +, -, *, /, %, ^ (potencia), (, )
              </Text>
            </View>

            <Pressable
              onPress={async () => {
                const validation = ScoreEngine.validateFormula(localFormula);
                if (!validation.isValid) {
                  Alert.alert('Fórmula no válida', validation.error || 'La fórmula ingresada no es válida.');
                  return;
                }
                try {
                  await settingsService.updateSettings({ scoreFormula: localFormula });
                  Alert.alert('Guardado', 'Fórmula de prioridad actualizada correctamente.');
                } catch (e) {
                  console.error(e);
                  Alert.alert('Error', 'No se pudo guardar la fórmula.');
                }
              }}
              style={[styles.saveButton, { backgroundColor: '#FF9500', marginTop: 4 }]}
            >
              <Text style={styles.saveButtonText}>Guardar Fórmula</Text>
            </Pressable>
          </View>
        </View>

        {/* Section 5: Duraciones de Bloques */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DURACIONES DE BLOQUES (MINUTOS)</Text>
          <View style={[styles.cardGroup, { backgroundColor: colors.backgroundElement }]}>
            {/* Luna */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>🌙 Bloque Luna (Completar)</Text>
              <TextInput
                value={localLuna}
                onChangeText={setLocalLuna}
                onBlur={async () => {
                  const num = parseInt(localLuna, 10);
                  if (!isNaN(num) && num > 0) {
                    await settingsService.updateSettings({ lunaDuration: num });
                  } else {
                    setLocalLuna(String(store.userSettings.lunaDuration));
                  }
                }}
                keyboardType="number-pad"
                style={[styles.smallInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Terra */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>🌍 Bloque Terra (Avanzar)</Text>
              <TextInput
                value={localTerra}
                onChangeText={setLocalTerra}
                onBlur={async () => {
                  const num = parseInt(localTerra, 10);
                  if (!isNaN(num) && num > 0) {
                    await settingsService.updateSettings({ terraDuration: num });
                  } else {
                    setLocalTerra(String(store.userSettings.terraDuration));
                  }
                }}
                keyboardType="number-pad"
                style={[styles.smallInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Sol */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>☀️ Bloque Sol (Hito)</Text>
              <TextInput
                value={localSol}
                onChangeText={setLocalSol}
                onBlur={async () => {
                  const num = parseInt(localSol, 10);
                  if (!isNaN(num) && num > 0) {
                    await settingsService.updateSettings({ solDuration: num });
                  } else {
                    setLocalSol(String(store.userSettings.solDuration));
                  }
                }}
                keyboardType="number-pad"
                style={[styles.smallInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Astra */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>⭐ Bloque Astra (Hábito)</Text>
              <TextInput
                value={localAstra}
                onChangeText={setLocalAstra}
                onBlur={async () => {
                  const num = parseInt(localAstra, 10);
                  if (!isNaN(num) && num > 0) {
                    await settingsService.updateSettings({ astraDuration: num });
                  } else {
                    setLocalAstra(String(store.userSettings.astraDuration));
                  }
                }}
                keyboardType="number-pad"
                style={[styles.smallInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>
          </View>
        </View>

        {/* Section 6: Horarios */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>HORARIOS Y DESCANSO</Text>
          <View style={[styles.cardGroup, { backgroundColor: colors.backgroundElement }]}>
            {/* Sleep Schedule */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Horario de Sueño / Descanso</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Inicio y Fin (HH:MM)</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <TextInput
                  value={localSleepStart}
                  onChangeText={setLocalSleepStart}
                  onBlur={async () => {
                    await settingsService.updateSettings({
                      sleepSchedule: { start: localSleepStart, end: localSleepEnd }
                    });
                  }}
                  style={[styles.timeInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
                />
                <Text style={{ color: colors.textSecondary }}>a</Text>
                <TextInput
                  value={localSleepEnd}
                  onChangeText={setLocalSleepEnd}
                  onBlur={async () => {
                    await settingsService.updateSettings({
                      sleepSchedule: { start: localSleepStart, end: localSleepEnd }
                    });
                  }}
                  style={[styles.timeInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
                />
              </View>
            </View>

            {/* Working Hours */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Horario Laboral / Enfoque</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Inicio y Fin (HH:MM)</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <TextInput
                  value={localWorkStart}
                  onChangeText={setLocalWorkStart}
                  onBlur={async () => {
                    await settingsService.updateSettings({
                      workingHours: { start: localWorkStart, end: localWorkEnd }
                    });
                  }}
                  style={[styles.timeInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
                />
                <Text style={{ color: colors.textSecondary }}>a</Text>
                <TextInput
                  value={localWorkEnd}
                  onChangeText={setLocalWorkEnd}
                  onBlur={async () => {
                    await settingsService.updateSettings({
                      workingHours: { start: localWorkStart, end: localWorkEnd }
                    });
                  }}
                  style={[styles.timeInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Section 7: Reordenamiento de Preferencias */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SECUENCIA PREFERIDA DE ENERGÍAS</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Ordena las energías según tu preferencia. El motor premiará las transiciones de flujo en este orden.
          </Text>
          <View style={[styles.cardGroup, { backgroundColor: colors.backgroundElement }]}>
            {(store.userSettings.preferredOrderEnergy || []).map((energy, idx) => (
              <View key={energy} style={[styles.reorderRow, { borderBottomWidth: idx < (store.userSettings.preferredOrderEnergy || []).length - 1 ? 1 : 0, borderBottomColor: colors.backgroundSelected }]}>
                <Text style={[styles.reorderText, { color: colors.text }]}>{energy}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    disabled={idx === 0}
                    onPress={() => moveItem('preferredOrderEnergy', idx, 'up')}
                    style={[styles.iconButton, { opacity: idx === 0 ? 0.3 : 1 }]}
                  >
                    <Ionicons name="arrow-up" size={18} color={colors.text} />
                  </Pressable>
                  <Pressable
                    disabled={idx === (store.userSettings.preferredOrderEnergy || []).length - 1}
                    onPress={() => moveItem('preferredOrderEnergy', idx, 'down')}
                    style={[styles.iconButton, { opacity: idx === (store.userSettings.preferredOrderEnergy || []).length - 1 ? 0.3 : 1 }]}
                  >
                    <Ionicons name="arrow-down" size={18} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SECUENCIA PREFERIDA DE PESOS</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Ordena las clasificaciones de peso recomendadas para guiar tu secuencia diaria de bloques.
          </Text>
          <View style={[styles.cardGroup, { backgroundColor: colors.backgroundElement }]}>
            {(store.userSettings.preferredOrderWeight || []).map((weight, idx) => (
              <View key={weight} style={[styles.reorderRow, { borderBottomWidth: idx < (store.userSettings.preferredOrderWeight || []).length - 1 ? 1 : 0, borderBottomColor: colors.backgroundSelected }]}>
                <Text style={[styles.reorderText, { color: colors.text }]}>{weight}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    disabled={idx === 0}
                    onPress={() => moveItem('preferredOrderWeight', idx, 'up')}
                    style={[styles.iconButton, { opacity: idx === 0 ? 0.3 : 1 }]}
                  >
                    <Ionicons name="arrow-up" size={18} color={colors.text} />
                  </Pressable>
                  <Pressable
                    disabled={idx === (store.userSettings.preferredOrderWeight || []).length - 1}
                    onPress={() => moveItem('preferredOrderWeight', idx, 'down')}
                    style={[styles.iconButton, { opacity: idx === (store.userSettings.preferredOrderWeight || []).length - 1 ? 0.3 : 1 }]}
                  >
                    <Ionicons name="arrow-down" size={18} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Section: Dictado de Voz Palabras Clave */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DICTADO DE VOZ (PALABRAS CLAVE)</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Configura las palabras clave que el asistente de voz busca para identificar cada campo. Separa los valores con comas (,).
          </Text>

          <View style={[styles.cardGroup, { backgroundColor: colors.backgroundElement }]}>
            {/* Tipo */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Tipo de Elemento (ej. crear, tipo)</Text>
              <TextInput
                value={localVoiceType}
                onChangeText={setLocalVoiceType}
                onBlur={() => handleUpdateKeywords('type', localVoiceType)}
                placeholder="crear, tipo"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Título */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Título / Nombre (ej. titulo, nombre)</Text>
              <TextInput
                value={localVoiceTitle}
                onChangeText={setLocalVoiceTitle}
                onBlur={() => handleUpdateKeywords('title', localVoiceTitle)}
                placeholder="titulo, nombre, tarea"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Descripción */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Descripción (ej. descripcion, nota)</Text>
              <TextInput
                value={localVoiceDesc}
                onChangeText={setLocalVoiceDesc}
                onBlur={() => handleUpdateKeywords('description', localVoiceDesc)}
                placeholder="descripcion, nota, detalle"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Prioridad */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Prioridad de Tarea (ej. prioridad, importancia)</Text>
              <TextInput
                value={localVoicePrio}
                onChangeText={setLocalVoicePrio}
                onBlur={() => handleUpdateKeywords('priority', localVoicePrio)}
                placeholder="prioridad, importancia"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Peso */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Peso / Bloque (ej. peso, bloque)</Text>
              <TextInput
                value={localVoiceWeight}
                onChangeText={setLocalVoiceWeight}
                onBlur={() => handleUpdateKeywords('weight', localVoiceWeight)}
                placeholder="peso, bloque, clasificacion"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Horas */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Horas Estimadas (ej. horas, duracion)</Text>
              <TextInput
                value={localVoiceHours}
                onChangeText={setLocalVoiceHours}
                onBlur={() => handleUpdateKeywords('hours', localVoiceHours)}
                placeholder="horas, duracion, tiempo"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Fecha */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Fecha / Día (ej. fecha, dia)</Text>
              <TextInput
                value={localVoiceDate}
                onChangeText={setLocalVoiceDate}
                onBlur={() => handleUpdateKeywords('date', localVoiceDate)}
                placeholder="fecha, dia, para el"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Hora */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Hora / Alarma (ej. hora, a las)</Text>
              <TextInput
                value={localVoiceTime}
                onChangeText={setLocalVoiceTime}
                onBlur={() => handleUpdateKeywords('time', localVoiceTime)}
                placeholder="hora, a las"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Energía */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Tipo de Energía (ej. energia, actitud)</Text>
              <TextInput
                value={localVoiceEnergy}
                onChangeText={setLocalVoiceEnergy}
                onBlur={() => handleUpdateKeywords('energy', localVoiceEnergy)}
                placeholder="energia, tipo de energia, actitud"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Franja Horaria */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Franja / Horario (ej. franja, horario)</Text>
              <TextInput
                value={localVoiceSlot}
                onChangeText={setLocalVoiceSlot}
                onBlur={() => handleUpdateKeywords('slot', localVoiceSlot)}
                placeholder="franja, horario, bloque de tiempo"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Meta */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Meta / Objetivo (ej. meta, objetivo)</Text>
              <TextInput
                value={localVoiceGoal}
                onChangeText={setLocalVoiceGoal}
                onBlur={() => handleUpdateKeywords('goal', localVoiceGoal)}
                placeholder="meta, objetivo"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Favorito */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Destacado / Favorito (ej. favorito, destacado)</Text>
              <TextInput
                value={localVoiceFavourite}
                onChangeText={setLocalVoiceFavourite}
                onBlur={() => handleUpdateKeywords('favourite', localVoiceFavourite)}
                placeholder="favorito, destacado, importante"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>
          </View>
        </View>

        {/* Section: Dictado de Voz - Comandos de Listas */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DICTADO DE VOZ - COMANDOS DE LISTAS</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Configura las palabras clave para realizar consultas y modificaciones sobre tus listas de control por voz. Separa los valores con comas (,).
          </Text>

          <View style={[styles.cardGroup, { backgroundColor: colors.backgroundElement }]}>
            {/* Consultar Listas */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Consultar Nombres de Listas (ej. nombre de todas las listas, mis listas)</Text>
              <TextInput
                value={localVoiceQueryLists}
                onChangeText={setLocalVoiceQueryLists}
                onBlur={() => handleUpdateKeywords('queryLists', localVoiceQueryLists)}
                placeholder="nombre de todas las listas, mis listas, que listas tengo"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Consultar Elementos de Lista */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Consultar Elementos de Lista (ej. ver lista, que tiene la lista)</Text>
              <TextInput
                value={localVoiceQueryListItems}
                onChangeText={setLocalVoiceQueryListItems}
                onBlur={() => handleUpdateKeywords('queryListItems', localVoiceQueryListItems)}
                placeholder="elementos de la lista, que tiene la lista, ver lista"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            {/* Añadir Elemento a Lista */}
            <View style={styles.settingCol}>
              <Text style={[styles.settingColLabel, { color: colors.text }]}>Añadir Elemento a Lista (ej. añade a la lista, añadir a la lista)</Text>
              <TextInput
                value={localVoiceAddListItem}
                onChangeText={setLocalVoiceAddListItem}
                onBlur={() => handleUpdateKeywords('addListItem', localVoiceAddListItem)}
                placeholder="añadir elemento a la lista, añade a la lista, agregar a la lista"
                placeholderTextColor={colors.textSecondary + '80'}
                multiline={true}
                style={[styles.fullWidthInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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

      {/* Add/Edit Task Category Modal */}
      <Modal
        visible={taskCatModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTaskCatModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingTaskCat ? 'Editar Categoría de Tarea' : 'Nueva Categoría de Tarea'}
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Emoji Obligatorio *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <TextInput
                  value={taskCatEmoji}
                  onChangeText={setTaskCatEmoji}
                  maxLength={4}
                  placeholder="📁"
                  placeholderTextColor={colors.textSecondary + '80'}
                  style={[styles.modalInput, { width: 60, textAlign: 'center', fontSize: 22, color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Nombre de la Categoría *</Text>
              <TextInput
                value={taskCatName}
                onChangeText={setTaskCatName}
                placeholder="ej. Trabajo, Personal, Salud..."
                placeholderTextColor={colors.textSecondary + '80'}
                style={[styles.modalInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setTaskCatModalVisible(false)}
                style={[styles.modalBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveTaskCat}
                style={[styles.modalBtn, { backgroundColor: '#34C759' }]}
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
  cardGroup: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  smallInput: {
    width: 80,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  timeInput: {
    width: 70,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 13,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  reorderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    padding: 6,
  },
  settingCol: {
    flexDirection: 'column',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  settingColLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  fullWidthInput: {
    minHeight: 60,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  saveButton: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
