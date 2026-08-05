import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  useColorScheme,
  SafeAreaView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useRememberStore, ItemType, Priority, ActivityCategory, getLocalDateStr } from '@/hooks/use-remember-store';
import { Colors, Spacing } from '@/constants/theme';

export default function ItemEditorScreen() {
  const store = useRememberStore();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; type?: string; goalId?: string; phaseId?: string }>();
  
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const isEditing = !!params.id;
  const editingItem = isEditing ? store.items.find((i) => i.id === params.id) : null;

  // Form State
  const [itemType, setItemType] = useState<ItemType>(ItemType.TASK);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [favourite, setFavourite] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  // Task Specific State
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [taskStartDate, setTaskStartDate] = useState<string>('');
  const [taskDueDate, setTaskDueDate] = useState<string>('');

  // Reminder Specific State
  const [chosenDates, setChosenDates] = useState<string[]>([]);
  const [chosenHour, setChosenHour] = useState(12);
  const [chosenMinute, setChosenMinute] = useState(0);
  const [autoArchive, setAutoArchive] = useState(true);

  // Activity Specific State
  const [activityCategory, setActivityCategory] = useState<string>('OTHER');

  // Calendar State
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Load editing item if exists
  useEffect(() => {
    if (editingItem) {
      setItemType(editingItem.type);
      setTitle(editingItem.title);
      setDescription(editingItem.description || '');
      setFavourite(editingItem.favourite);
      setTagsInput(editingItem.tags ? editingItem.tags.join(', ') : '');

      if (editingItem.type === ItemType.TASK) {
        const task = editingItem as any;
        setPriority(task.priority || Priority.MEDIUM);
        setEstimatedHours(task.estimatedHours ? String(task.estimatedHours) : '');
        setSelectedGoalId(task.goalId || '');
        setSelectedPhaseId(task.phaseId || '');
        setSelectedSlotId(task.timeSlotId || '');
        setTaskStartDate(task.startDate || '');
        setTaskDueDate(task.dueDate || '');
      } else if (editingItem.type === ItemType.REMINDER) {
        const rem = editingItem as any;
        setAutoArchive(rem.autoArchive !== false);
        const trigger = rem.remindAt || {};
        const rDates = trigger.dates && trigger.dates.length > 0
          ? trigger.dates
          : (trigger.date ? [trigger.date] : []);
        setChosenDates(rDates);
        
        if (trigger.time) {
          const [h, min] = trigger.time.split(':').map(Number);
          setChosenHour(h);
          setChosenMinute(min);
        }
        if (rDates.length > 0) {
          const [y, m] = rDates[0].split('-').map(Number);
          setCalendarMonth(new Date(y, m - 1, 1));
        }
      } else if (editingItem.type === ItemType.ACTIVITY) {
        const act = editingItem as any;
        setActivityCategory(act.category || 'OTHER');
      }
    } else {
      // Setup default creation values
      if (params.type) {
        setItemType(params.type as ItemType);
      }
      if (params.goalId) {
        setSelectedGoalId(params.goalId);
        setItemType(ItemType.TASK);
      }
      if (params.phaseId) {
        setSelectedPhaseId(params.phaseId);
      }
      // Set today for task dates or reminder dates by default
      const todayStr = getLocalDateStr();
      setTaskStartDate(todayStr);
      setTaskDueDate(todayStr);
      setChosenDates([todayStr]);
    }
  }, [editingItem, params.id, params.type, params.goalId, params.phaseId]);

  // Load phases when goal changes
  const goalPhases = useMemo(() => {
    if (!selectedGoalId) return [];
    const goal = store.goals.find((g) => g.id === selectedGoalId);
    return goal ? [...goal.phases].sort((a, b) => a.order - b.order) : [];
  }, [selectedGoalId, store.goals]);

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6; // Monday = 0, Sunday = 6

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDay = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, prevDay);
      days.push({ dayNum: prevDay, dateStr: getLocalDateStr(prevDate), isCurrentMonth: false });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const curDate = new Date(year, month, i);
      days.push({ dayNum: i, dateStr: getLocalDateStr(curDate), isCurrentMonth: true });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({ dayNum: i, dateStr: getLocalDateStr(nextDate), isCurrentMonth: false });
    }
    return days;
  };

  const daysInMonth = useMemo(() => getDaysInMonth(calendarMonth), [calendarMonth]);

  const changeMonth = (offset: number) => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1));
  };

  const handleToggleDate = (dateStr: string) => {
    if (itemType === ItemType.REMINDER) {
      setChosenDates((prev) => {
        if (prev.includes(dateStr)) {
          return prev.length > 1 ? prev.filter((d) => d !== dateStr) : prev;
        }
        return [...prev, dateStr].sort();
      });
    } else {
      // For tasks, toggle start/due date
      if (!taskStartDate || (taskStartDate && taskDueDate)) {
        setTaskStartDate(dateStr);
        setTaskDueDate('');
      } else {
        if (dateStr < taskStartDate) {
          setTaskStartDate(dateStr);
          setTaskDueDate('');
        } else {
          setTaskDueDate(dateStr);
        }
      }
    }
  };

  const getMonthNameSpanish = (date: Date): string => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Save changes
  const handleSave = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert('Título requerido', 'Por favor ingresa un título para el item.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '');

    const hoursNum = estimatedHours.trim() ? parseFloat(estimatedHours.replace(',', '.')) : undefined;

    try {
      if (isEditing && editingItem) {
        // Update item fields based on type
        const commonUpdates = {
          title: cleanTitle,
          description: description.trim() || undefined,
          favourite,
          tags,
        };

        if (itemType === ItemType.TASK) {
          await store.updateItem(editingItem.id, {
            ...commonUpdates,
            startDate: taskStartDate || undefined,
            dueDate: taskDueDate || taskStartDate || undefined,
            estimatedHours: hoursNum,
            priority,
            goalId: selectedGoalId || undefined,
            phaseId: selectedPhaseId || undefined,
            timeSlotId: selectedSlotId || undefined,
          } as any);
        } else if (itemType === ItemType.REMINDER) {
          const formattedHour = chosenHour.toString().padStart(2, '0');
          const formattedMin = chosenMinute.toString().padStart(2, '0');
          const timeStr = `${formattedHour}:${formattedMin}`;

          await store.updateItem(editingItem.id, {
            ...commonUpdates,
            autoArchive,
            remindAt: {
              type: ReminderTriggerType.DATE_TIME,
              date: chosenDates[0] || '',
              time: timeStr,
              dates: chosenDates,
            },
          } as any);
        } else if (itemType === ItemType.ACTIVITY) {
          await store.updateItem(editingItem.id, {
            ...commonUpdates,
            category: activityCategory,
          } as any);
        }
      } else {
        // Create new item
        if (itemType === ItemType.TASK) {
          await store.createTask(
            cleanTitle,
            description.trim(),
            taskStartDate || undefined,
            taskDueDate || taskStartDate || undefined,
            hoursNum,
            priority,
            selectedGoalId || undefined,
            selectedPhaseId || undefined,
            selectedSlotId || undefined
          );
        } else if (itemType === ItemType.REMINDER) {
          const formattedHour = chosenHour.toString().padStart(2, '0');
          const formattedMin = chosenMinute.toString().padStart(2, '0');
          const timeStr = `${formattedHour}:${formattedMin}`;

          await store.createReminder(
            cleanTitle,
            description.trim(),
            chosenDates[0],
            timeStr,
            chosenDates,
            autoArchive
          );
        } else if (itemType === ItemType.ACTIVITY) {
          await store.createActivity(
            cleanTitle,
            activityCategory,
            description.trim(),
            tags,
            favourite
          );
        }
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', `No se pudo guardar el item: ${e.message}`);
    }
  };

  // Styling helpers
  const getThemeColor = () => {
    if (itemType === ItemType.TASK) return '#FF9500'; // Orange
    if (itemType === ItemType.REMINDER) return '#007AFF'; // Blue
    return '#5856D6'; // Indigo
  };

  const themeColor = getThemeColor();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? 'Editar' : 'Nuevo'} {itemType === ItemType.TASK ? 'Tarea' : itemType === ItemType.REMINDER ? 'Recordatorio' : 'Actividad'}
        </Text>
        <Pressable onPress={handleSave} style={styles.headerButton}>
          <Ionicons name="checkmark-done" size={24} color={themeColor} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Type Selector (only on create) */}
        {!isEditing && (
          <View style={styles.typeContainer}>
            <Pressable
              onPress={() => setItemType(ItemType.TASK)}
              style={[
                styles.typeTab,
                { backgroundColor: colors.backgroundElement },
                itemType === ItemType.TASK && { backgroundColor: 'rgba(255, 149, 0, 0.15)', borderColor: '#FF9500', borderWidth: 1.5 },
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={itemType === ItemType.TASK ? '#FF9500' : colors.textSecondary} />
              <Text style={[styles.typeText, { color: itemType === ItemType.TASK ? '#FF9500' : colors.textSecondary }]}>Tarea</Text>
            </Pressable>

            <Pressable
              onPress={() => setItemType(ItemType.REMINDER)}
              style={[
                styles.typeTab,
                { backgroundColor: colors.backgroundElement },
                itemType === ItemType.REMINDER && { backgroundColor: 'rgba(0, 122, 255, 0.15)', borderColor: '#007AFF', borderWidth: 1.5 },
              ]}
            >
              <Ionicons name="notifications-outline" size={20} color={itemType === ItemType.REMINDER ? '#007AFF' : colors.textSecondary} />
              <Text style={[styles.typeText, { color: itemType === ItemType.REMINDER ? '#007AFF' : colors.textSecondary }]}>Alarma</Text>
            </Pressable>

            <Pressable
              onPress={() => setItemType(ItemType.ACTIVITY)}
              style={[
                styles.typeTab,
                { backgroundColor: colors.backgroundElement },
                itemType === ItemType.ACTIVITY && { backgroundColor: 'rgba(88, 86, 214, 0.15)', borderColor: '#5856D6', borderWidth: 1.5 },
              ]}
            >
              <Ionicons name="sparkles-outline" size={20} color={itemType === ItemType.ACTIVITY ? '#5856D6' : colors.textSecondary} />
              <Text style={[styles.typeText, { color: itemType === ItemType.ACTIVITY ? '#5856D6' : colors.textSecondary }]}>Ocio</Text>
            </Pressable>
          </View>
        )}

        {/* Core details card */}
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Título</Text>
          <TextInput
            placeholder="¿Qué quieres hacer o recordar?"
            placeholderTextColor={colors.textSecondary + '80'}
            value={title}
            onChangeText={setTitle}
            style={[styles.textInput, { color: colors.text }]}
          />

          <View style={[styles.separator, { backgroundColor: colors.backgroundSelected }]} />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Descripción (Opcional)</Text>
          <TextInput
            placeholder="Añade notas, ideas o detalles aquí..."
            placeholderTextColor={colors.textSecondary + '80'}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={[styles.textInput, { color: colors.text, minHeight: 60, textAlignVertical: 'top' }]}
          />
        </View>

        {/* Task details */}
        {itemType === ItemType.TASK && (
          <>
            {/* Priority & Time Card */}
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Prioridad</Text>
                  <View style={styles.priorityRow}>
                    {([Priority.LOW, Priority.MEDIUM, Priority.HIGH] as Priority[]).map((p) => (
                      <Pressable
                        key={p}
                        onPress={() => setPriority(p)}
                        style={[
                          styles.priorityButton,
                          priority === p && {
                            backgroundColor: p === Priority.HIGH ? '#FF3B30' : p === Priority.MEDIUM ? '#FF9500' : '#34C759',
                          },
                          priority !== p && { backgroundColor: colors.backgroundSelected },
                        ]}
                      >
                        <Text style={[styles.priorityText, { color: priority === p ? '#fff' : colors.text }]}>
                          {p === Priority.HIGH ? 'Alta' : p === Priority.MEDIUM ? 'Media' : 'Baja'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={{ width: 100, marginLeft: 16 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Horas Est.</Text>
                  <TextInput
                    placeholder="Horas"
                    placeholderTextColor={colors.textSecondary + '80'}
                    value={estimatedHours}
                    onChangeText={setEstimatedHours}
                    keyboardType="numeric"
                    style={[styles.textInput, { color: colors.text, textAlign: 'center' }]}
                  />
                </View>
              </View>

              <View style={[styles.separator, { backgroundColor: colors.backgroundSelected }]} />

              {/* Goal & Phase Pickers */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Asociar a un Objetivo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                <Pressable
                  onPress={() => { setSelectedGoalId(''); setSelectedPhaseId(''); }}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.backgroundSelected },
                    selectedGoalId === '' && { backgroundColor: themeColor },
                  ]}
                >
                  <Text style={[styles.chipText, { color: selectedGoalId === '' ? '#fff' : colors.text }]}>Ninguno</Text>
                </Pressable>
                {store.goals.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => { setSelectedGoalId(g.id); setSelectedPhaseId(''); }}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.backgroundSelected },
                      selectedGoalId === g.id && { backgroundColor: themeColor },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: selectedGoalId === g.id ? '#fff' : colors.text }]}>{g.title}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {selectedGoalId !== '' && goalPhases.length > 0 && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Fase del Roadmap</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    {goalPhases.map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => setSelectedPhaseId(p.id)}
                        style={[
                          styles.chip,
                          { backgroundColor: colors.backgroundSelected },
                          selectedPhaseId === p.id && { backgroundColor: themeColor },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: selectedPhaseId === p.id ? '#fff' : colors.text }]}>{p.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}

              <View style={[styles.separator, { backgroundColor: colors.backgroundSelected }]} />

              {/* Time Slots */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Franja Horaria de Ejecución</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                <Pressable
                  onPress={() => setSelectedSlotId('')}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.backgroundSelected },
                    selectedSlotId === '' && { backgroundColor: themeColor },
                  ]}
                >
                  <Text style={[styles.chipText, { color: selectedSlotId === '' ? '#fff' : colors.text }]}>Ninguna</Text>
                </Pressable>
                {store.timeSlots.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => setSelectedSlotId(s.id)}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.backgroundSelected },
                      selectedSlotId === s.id && { backgroundColor: themeColor },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: selectedSlotId === s.id ? '#fff' : colors.text }]}>
                      {s.name} ({s.startTime}-{s.endTime})
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Date Selection Card */}
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Rango de Fechas</Text>
              <Text style={{ color: colors.text, fontSize: 13, marginBottom: 8 }}>
                {taskStartDate ? `Inicio: ${taskStartDate}` : 'Selecciona fecha de inicio'}
                {taskDueDate ? ` | Vencimiento: ${taskDueDate}` : ''}
              </Text>

              {renderCalendar()}
            </View>
          </>
        )}

        {/* Reminder details */}
        {itemType === ItemType.REMINDER && (
          <>
            {/* Hour Selection Card */}
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Hora de Alarma</Text>
              <View style={styles.timePickerContainer}>
                <View style={styles.timeColumn}>
                  <Pressable onPress={() => setChosenHour((h) => (h + 1) % 24)}>
                    <Ionicons name="chevron-up" size={24} color={colors.text} />
                  </Pressable>
                  <Text style={[styles.timeText, { color: colors.text }]}>{chosenHour.toString().padStart(2, '0')}</Text>
                  <Pressable onPress={() => setChosenHour((h) => (h - 1 + 24) % 24)}>
                    <Ionicons name="chevron-down" size={24} color={colors.text} />
                  </Pressable>
                </View>
                <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>
                <View style={styles.timeColumn}>
                  <Pressable onPress={() => setChosenMinute((m) => (m + 5) % 60)}>
                    <Ionicons name="chevron-up" size={24} color={colors.text} />
                  </Pressable>
                  <Text style={[styles.timeText, { color: colors.text }]}>{chosenMinute.toString().padStart(2, '0')}</Text>
                  <Pressable onPress={() => setChosenMinute((m) => (m - 5 + 60) % 60)}>
                    <Ionicons name="chevron-down" size={24} color={colors.text} />
                  </Pressable>
                </View>
              </View>

              <View style={[styles.separator, { backgroundColor: colors.backgroundSelected }]} />

              <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
                <View>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>Archivado automático</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Archivar después de sonar</Text>
                </View>
                <Switch
                  value={autoArchive}
                  onValueChange={setAutoArchive}
                  trackColor={{ false: colors.backgroundSelected, true: themeColor }}
                />
              </View>
            </View>

            {/* Multiple dates picker card */}
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Fechas Programadas</Text>
              <Text style={{ color: colors.text, fontSize: 13, marginBottom: 8 }}>
                {chosenDates.length === 0 ? 'Sin fechas' : `${chosenDates.length} día(s) programado(s)`}
              </Text>

              {renderCalendar()}
            </View>
          </>
        )}

        {/* Activity details */}
        {itemType === ItemType.ACTIVITY && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Categoría de Ocio</Text>
            <View style={styles.categoryGrid}>
              {store.activityCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setActivityCategory(cat.id)}
                  style={[
                    styles.categoryButton,
                    { backgroundColor: colors.backgroundSelected },
                    activityCategory === cat.id && { backgroundColor: themeColor },
                  ]}
                >
                  <Text style={[styles.categoryText, { color: activityCategory === cat.id ? '#fff' : colors.text }]}>
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Tags and Favourite Card */}
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
            <View>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Destacado / Favorito</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Mostrar en accesos rápidos</Text>
            </View>
            <Pressable onPress={() => setFavourite(!favourite)}>
              <Ionicons
                name={favourite ? 'star' : 'star-outline'}
                size={28}
                color={favourite ? '#FFCC00' : colors.textSecondary}
              />
            </Pressable>
          </View>

          <View style={[styles.separator, { backgroundColor: colors.backgroundSelected }]} />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Etiquetas (Separadas por comas)</Text>
          <TextInput
            placeholder="salud, estudio, compras..."
            placeholderTextColor={colors.textSecondary + '80'}
            value={tagsInput}
            onChangeText={setTagsInput}
            style={[styles.textInput, { color: colors.text }]}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );


  function renderCalendar() {
    return (
      <View style={styles.calendarContainer}>
        {/* Month Header */}
        <View style={styles.calendarHeader}>
          <Pressable onPress={() => changeMonth(-1)} style={styles.calendarNavBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.calendarMonthTitle, { color: colors.text }]}>
            {getMonthNameSpanish(calendarMonth)}
          </Text>
          <Pressable onPress={() => changeMonth(1)} style={styles.calendarNavBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Days of Week */}
        <View style={styles.weekDaysRow}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => (
            <Text key={idx} style={[styles.weekDayText, { color: colors.textSecondary }]}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {daysInMonth.map((item, idx) => {
            const isSelected = itemType === ItemType.REMINDER
              ? chosenDates.includes(item.dateStr)
              : (taskStartDate === item.dateStr || taskDueDate === item.dateStr || (taskStartDate && taskDueDate && item.dateStr > taskStartDate && item.dateStr < taskDueDate));

            const isRangeMid = itemType === ItemType.TASK && taskStartDate && taskDueDate && item.dateStr > taskStartDate && item.dateStr < taskDueDate;

            return (
              <Pressable
                key={idx}
                onPress={() => handleToggleDate(item.dateStr)}
                style={[
                  styles.gridDayButton,
                  isSelected && { backgroundColor: themeColor },
                  isRangeMid && { backgroundColor: themeColor + '30' },
                  !item.isCurrentMonth && { opacity: 0.3 },
                ]}
              >
                <Text
                  style={[
                    styles.gridDayText,
                    { color: colors.text },
                    isSelected && { color: '#fff', fontWeight: 'bold' },
                  ]}
                >
                  {item.dayNum}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
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
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    fontSize: 16,
    paddingVertical: 4,
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calendarContainer: {
    marginTop: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarNavBtn: {
    padding: 6,
  },
  calendarMonthTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridDayButton: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  gridDayText: {
    fontSize: 13,
  },
});
