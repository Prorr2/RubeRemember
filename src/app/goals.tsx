import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRememberStore, Goal, Phase, Reminder } from '../hooks/use-remember-store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Calendar date-input picker
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

function DateCalendarInput({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: string; // "YYYY-MM-DD"
  onChange: (v: string) => void;
  colors: typeof Colors.dark;
}) {
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const initialDate = value ? new Date(value) : new Date();
  const [currentMonthDate, setCurrentMonthDate] = useState(initialDate);

  useEffect(() => {
    if (value) {
      setCurrentMonthDate(new Date(value));
    }
  }, [value]);

  const changeMonth = (offset: number) => {
    const next = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + offset, 1);
    setCurrentMonthDate(next);
  };

  const handleDaySelect = (dateStr: string) => {
    onChange(dateStr);
    setIsCalendarVisible(false);
  };

  const formatDisplay = (dStr: string) => {
    if (!dStr) return 'Seleccionar';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  };

  const daysGrid = getDaysInMonth(currentMonthDate);
  const dayHeaders = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const todayStr = getLocalDateStr();

  return (
    <View style={{ flex: 1 }}>
      <Text style={[formStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      
      <Pressable
        onPress={() => setIsCalendarVisible(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderRadius: 10,
          borderColor: colors.backgroundSelected,
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: colors.backgroundElement,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
          {formatDisplay(value)}
        </Text>
        <Ionicons name="calendar-outline" size={16} color="#FF2D55" />
      </Pressable>

      <Modal visible={isCalendarVisible} transparent animationType="fade" onRequestClose={() => setIsCalendarVisible(false)}>
        <Pressable onPress={() => setIsCalendarVisible(false)} style={calModalStyles.overlay}>
          <Pressable onPress={e => e.stopPropagation()} style={[calModalStyles.container, { backgroundColor: colors.background }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>{label}</Text>
              <Pressable onPress={() => setIsCalendarVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Pressable onPress={() => changeMonth(-1)} style={{ padding: 6 }}>
                <Ionicons name="chevron-back" size={18} color="#FF2D55" />
              </Pressable>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>
                {getMonthNameSpanish(currentMonthDate)}
              </Text>
              <Pressable onPress={() => changeMonth(1)} style={{ padding: 6 }}>
                <Ionicons name="chevron-forward" size={18} color="#FF2D55" />
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
              {daysGrid.map((day, idx) => {
                const isSelected = day.dateStr === value;
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
                      backgroundColor: isSelected ? '#FF2D55' : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected || isToday ? 'bold' : 'normal',
                        color: isSelected
                          ? '#fff'
                          : !day.isCurrentMonth
                            ? colors.textSecondary
                            : isToday
                              ? '#FF2D55'
                              : colors.text,
                        opacity: !day.isCurrentMonth ? 0.35 : 1,
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

const formStyles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
});

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

export default function GoalsScreen() {
  const router = useRouter();
  const store = useRememberStore();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  // Goal Form State
  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalStart, setGoalStart] = useState('2026-07-26');
  const [goalEnd, setGoalEnd] = useState('2026-12-31');

  // Phase Form State
  const [isPhaseModalVisible, setIsPhaseModalVisible] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [targetGoalId, setTargetGoalId] = useState<string>('');
  const [phaseName, setPhaseName] = useState('');
  const [phaseDesc, setPhaseDesc] = useState('');

  // Quick Task Creator state
  const [quickTaskText, setQuickTaskText] = useState('');
  const [quickTaskPhaseId, setQuickTaskPhaseId] = useState<string | null>(null);

  // Format YYYY-MM-DD to DD/MM/YYYY
  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return '-';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  };

  const handleOpenNewGoal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setEditingGoal(null);
    setGoalTitle('');
    setGoalDesc('');
    setGoalStart(todayStr);
    setGoalEnd(todayStr);
    setIsGoalModalVisible(true);
  };

  const handleOpenEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalTitle(goal.title);
    setGoalDesc(goal.description);
    setGoalStart(goal.startDate);
    setGoalEnd(goal.endDate);
    setIsGoalModalVisible(true);
  };

  const handleSaveGoal = async () => {
    if (!goalTitle.trim()) {
      Alert.alert('Error', 'El título del objetivo no puede estar vacío.');
      return;
    }
    if (editingGoal) {
      await store.updateGoal(editingGoal.id, goalTitle.trim(), goalDesc.trim(), goalStart, goalEnd);
    } else {
      await store.addGoal(goalTitle.trim(), goalDesc.trim(), goalStart, goalEnd);
    }
    setIsGoalModalVisible(false);
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert(
      'Eliminar Objetivo',
      '¿Estás seguro de que quieres eliminar este objetivo? Los recordatorios asociados ya no tendrán este objetivo asignado, pero no se borrarán.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await store.deleteGoal(goalId);
            if (expandedGoalId === goalId) setExpandedGoalId(null);
          },
        },
      ]
    );
  };

  // Phase operations
  const handleOpenNewPhase = (goalId: string) => {
    setTargetGoalId(goalId);
    setEditingPhase(null);
    setPhaseName('');
    setPhaseDesc('');
    setIsPhaseModalVisible(true);
  };

  const handleOpenEditPhase = (goalId: string, phase: Phase) => {
    setTargetGoalId(goalId);
    setEditingPhase(phase);
    setPhaseName(phase.name);
    setPhaseDesc(phase.description);
    setIsPhaseModalVisible(true);
  };

  const handleSavePhase = async () => {
    if (!phaseName.trim()) {
      Alert.alert('Error', 'El nombre de la fase no puede estar vacío.');
      return;
    }
    if (editingPhase) {
      await store.updatePhase(targetGoalId, editingPhase.id, phaseName.trim(), phaseDesc.trim());
    } else {
      await store.addPhase(targetGoalId, phaseName.trim(), phaseDesc.trim());
    }
    setIsPhaseModalVisible(false);
  };

  const handleDeletePhase = (goalId: string, phaseId: string) => {
    Alert.alert(
      'Eliminar Fase',
      '¿Estás seguro de que quieres eliminar esta fase?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await store.deletePhase(goalId, phaseId);
          },
        },
      ]
    );
  };

  const handleMovePhase = async (goal: Goal, phase: Phase, direction: 'up' | 'down') => {
    const currentIndex = goal.phases.findIndex((p) => p.id === phase.id);
    if (currentIndex === -1) return;
    
    const newPhases = [...goal.phases].sort((a, b) => a.order - b.order);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= newPhases.length) return;

    // Swap elements
    const temp = newPhases[currentIndex];
    newPhases[currentIndex] = newPhases[targetIndex];
    newPhases[targetIndex] = temp;

    await store.reorderPhases(goal.id, newPhases);
  };

  const handleAddQuickTask = async (phaseId: string, goalId: string) => {
    if (!quickTaskText.trim()) return;
    // Add task as a dateless reminder associated with goal & phase
    await store.addReminder(quickTaskText.trim(), '', '', undefined, goalId, phaseId);
    setQuickTaskText('');
    setQuickTaskPhaseId(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: colors.backgroundSelected }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Objetivos y Roadmaps</Text>
        <Pressable onPress={handleOpenNewGoal} style={styles.headerAddBtn}>
          <Ionicons name="add-circle" size={28} color="#FF2D55" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {store.goals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="ribbon-outline" size={80} color="#FF2D55" style={{ opacity: 0.8, marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Define tus Objetivos</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Organiza tus proyectos, propósitos de año nuevo o metas en roadmaps estructurados por fases, y asocia tareas de recordatorios a ellos.
            </Text>
            <Pressable onPress={handleOpenNewGoal} style={[styles.btn, { backgroundColor: '#FF2D55', marginTop: 16 }]}>
              <Text style={styles.btnText}>Crear Primer Objetivo</Text>
            </Pressable>
          </View>
        ) : (
          store.goals.map((goal) => {
            const goalReminders = store.reminders.filter((r) => r.goalId === goal.id);
            const completedCount = goalReminders.filter((r) => r.completed).length;
            const totalCount = goalReminders.length;
            const progress = totalCount > 0 ? completedCount / totalCount : 0;
            const isExpanded = expandedGoalId === goal.id;

            return (
              <View
                key={goal.id}
                style={[
                  styles.goalCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: isExpanded ? '#FF2D55' : colors.backgroundSelected,
                  },
                ]}
              >
                {/* Header of Goal Card */}
                <Pressable
                  onPress={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                  style={styles.goalCardHeader}
                >
                  <View style={{ flexDirection: 'row', flex: 1, alignItems: 'flex-start', gap: 8 }}>
                    <Pressable
                      onPress={() => store.toggleGoalCompleted(goal.id)}
                      style={{ marginTop: 2 }}
                    >
                      <Ionicons
                        name={goal.completed ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={goal.completed ? '#34C759' : '#FF2D55'}
                      />
                    </Pressable>

                    <View style={{ flex: 1, gap: 4 }}>
                      <Text
                        style={[
                          styles.goalTitleText,
                          { color: colors.text },
                          goal.completed && { textDecorationLine: 'line-through', opacity: 0.6 }
                        ]}
                      >
                        {goal.title}
                      </Text>
                      {goal.description ? (
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.goalDescText,
                            { color: colors.textSecondary },
                            goal.completed && { opacity: 0.6 }
                          ]}
                        >
                          {goal.description}
                        </Text>
                      ) : null}
                      <View style={styles.goalDatesRow}>
                        <Ionicons name="calendar-outline" size={12} color="#FF2D55" />
                        <Text style={[styles.goalDatesText, { color: colors.textSecondary }, goal.completed && { opacity: 0.6 }]}>
                          {formatDisplayDate(goal.startDate)} — {formatDisplayDate(goal.endDate)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                    {totalCount > 0 && (
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#FF2D55' }}>
                        {totalCount} {totalCount === 1 ? 'Tarea' : 'Tareas'}
                      </Text>
                    )}
                  </View>
                </Pressable>

                {/* Actions row for Goal */}
                <View style={[styles.goalActionsRow, { borderTopColor: colors.backgroundSelected }]}>
                  <Pressable onPress={() => handleOpenEditGoal(goal)} style={styles.goalActionBtn}>
                    <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.goalActionText, { color: colors.textSecondary }]}>Editar</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDeleteGoal(goal.id)} style={styles.goalActionBtn}>
                    <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                    <Text style={[styles.goalActionText, { color: '#FF3B30' }]}>Eliminar</Text>
                  </Pressable>
                </View>

                {/* Expanded Roadmap / Phases details */}
                {isExpanded ? (
                  <View style={[styles.phasesSection, { borderTopColor: colors.backgroundSelected }]}>
                    <View style={styles.phasesHeaderRow}>
                      <Text style={[styles.phasesTitleLabel, { color: colors.text }]}>Roadmap de Fases</Text>
                      <Pressable
                        onPress={() => handleOpenNewPhase(goal.id)}
                        style={styles.addPhaseSmallBtn}
                      >
                        <Ionicons name="add-circle-outline" size={16} color="#FF2D55" />
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#FF2D55' }}>Añadir Fase</Text>
                      </Pressable>
                    </View>

                    {goal.phases.length === 0 ? (
                      <View style={[styles.emptyPhasesCard, { borderColor: colors.backgroundSelected }]}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
                          Aún no has definido fases en este objetivo. Divide el objetivo en hitos/etapas y asocia tareas.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.phasesListContainer}>
                        {goal.phases
                          .sort((a, b) => a.order - b.order)
                          .map((phase, index) => {
                            const phaseReminders = goalReminders.filter((r) => r.phaseId === phase.id);
                            const isAddingTask = quickTaskPhaseId === phase.id;

                            return (
                              <View key={phase.id} style={styles.phaseItemWrapper}>
                                {/* Step connector lines */}
                                <View style={styles.stepIndicatorCol}>
                                  <View style={[styles.stepDot, { backgroundColor: '#FF2D55' }]} />
                                  {index < goal.phases.length - 1 ? (
                                    <View style={[styles.stepLine, { backgroundColor: colors.backgroundSelected }]} />
                                  ) : null}
                                </View>

                                <View style={styles.phaseCardContent}>
                                  {/* Title & Phase Controls */}
                                  <View style={styles.phaseHeader}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.phaseNameText, { color: colors.text }]}>
                                        {index + 1}. {phase.name}
                                      </Text>
                                      {phase.description ? (
                                        <Text style={[styles.phaseDescTextContent, { color: colors.textSecondary }]}>
                                          {phase.description}
                                        </Text>
                                      ) : null}
                                    </View>

                                    {/* Reordering / Edit Controls */}
                                    <View style={styles.phaseControlsRow}>
                                      <Pressable
                                        disabled={index === 0}
                                        onPress={() => handleMovePhase(goal, phase, 'up')}
                                        style={{ opacity: index === 0 ? 0.3 : 1 }}
                                      >
                                        <Ionicons name="chevron-up-circle-outline" size={18} color={colors.textSecondary} />
                                      </Pressable>
                                      <Pressable
                                        disabled={index === goal.phases.length - 1}
                                        onPress={() => handleMovePhase(goal, phase, 'down')}
                                        style={{ opacity: index === goal.phases.length - 1 ? 0.3 : 1 }}
                                      >
                                        <Ionicons name="chevron-down-circle-outline" size={18} color={colors.textSecondary} />
                                      </Pressable>
                                      <Pressable onPress={() => handleOpenEditPhase(goal.id, phase)}>
                                        <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
                                      </Pressable>
                                      <Pressable onPress={() => handleDeletePhase(goal.id, phase.id)}>
                                        <Ionicons name="trash-outline" size={15} color="#FF3B30" />
                                      </Pressable>
                                    </View>
                                  </View>

                                  {/* Reminders List inside Phase */}
                                  <View style={styles.phaseRemindersList}>
                                    {phaseReminders.map((reminder) => (
                                      <View
                                        key={reminder.id}
                                        style={[
                                          styles.reminderItemRow,
                                          { backgroundColor: colors.backgroundSelected }
                                        ]}
                                      >
                                        <Pressable
                                          onPress={() => store.toggleReminderCompleted(reminder.id)}
                                          style={styles.completedCheckbox}
                                        >
                                          <Ionicons
                                            name={reminder.completed ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={18}
                                            color={reminder.completed ? '#34C759' : colors.textSecondary}
                                          />
                                        </Pressable>
                                        <Text
                                          style={[
                                            styles.reminderItemText,
                                            {
                                              color: colors.text,
                                              textDecorationLine: reminder.completed ? 'line-through' : 'none',
                                              opacity: reminder.completed ? 0.6 : 1,
                                            }
                                          ]}
                                        >
                                          {reminder.text}
                                        </Text>
                                        {reminder.date ? (
                                          <Text style={[styles.reminderItemDate, { color: colors.textSecondary }]}>
                                            {formatDisplayDate(reminder.date)}
                                          </Text>
                                        ) : (
                                          <Text style={{ fontSize: 9, color: '#30B0C7', fontWeight: 'bold' }}>Idea</Text>
                                        )}
                                      </View>
                                    ))}
                                  </View>

                                  {/* Quick task creator */}
                                  {isAddingTask ? (
                                    <View style={styles.quickTaskBox}>
                                      <TextInput
                                        style={[styles.quickTaskInput, { color: colors.text, backgroundColor: colors.backgroundSelected }]}
                                        placeholder="Añadir tarea a esta fase..."
                                        placeholderTextColor={colors.textSecondary}
                                        value={quickTaskText}
                                        onChangeText={setQuickTaskText}
                                        autoFocus
                                      />
                                      <View style={{ flexDirection: 'row', gap: 6 }}>
                                        <Pressable
                                          onPress={() => handleAddQuickTask(phase.id, goal.id)}
                                          style={[styles.quickTaskBtn, { backgroundColor: '#FF2D55' }]}
                                        >
                                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>Agregar</Text>
                                        </Pressable>
                                        <Pressable
                                          onPress={() => setQuickTaskPhaseId(null)}
                                          style={[styles.quickTaskBtn, { backgroundColor: colors.backgroundSelected }]}
                                        >
                                          <Text style={{ color: colors.text, fontSize: 11 }}>Cancelar</Text>
                                        </Pressable>
                                      </View>
                                    </View>
                                  ) : (
                                    <Pressable
                                      onPress={() => {
                                        setQuickTaskPhaseId(phase.id);
                                        setQuickTaskText('');
                                      }}
                                      style={styles.addReminderPlaceholderBtn}
                                    >
                                      <Ionicons name="add" size={14} color={colors.textSecondary} />
                                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>Crear tarea aquí</Text>
                                    </Pressable>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ───────────────────────────────────────────────────────────────────────
          GOAL EDIT/CREATE MODAL
          ─────────────────────────────────────────────────────────────────────── */}
      <Modal visible={isGoalModalVisible} transparent animationType="fade" onRequestClose={() => setIsGoalModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={modalStyles.overlay}>
          <View style={[modalStyles.container, { backgroundColor: colors.background }]}>
            <Text style={[modalStyles.title, { color: colors.text }]}>
              {editingGoal ? 'Editar Objetivo' : 'Nuevo Objetivo'}
            </Text>

            {/* Title */}
            <Text style={[formStyles.label, { color: colors.textSecondary, marginTop: 12 }]}>Título</Text>
            <TextInput
              style={[modalStyles.textInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}
              value={goalTitle}
              onChangeText={setGoalTitle}
              placeholder="Ej. Aprender React Native"
              placeholderTextColor={colors.textSecondary}
            />

            {/* Description */}
            <Text style={[formStyles.label, { color: colors.textSecondary, marginTop: 12 }]}>Descripción</Text>
            <TextInput
              style={[modalStyles.textInput, { height: 60, textAlignVertical: 'top', color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}
              value={goalDesc}
              onChangeText={setGoalDesc}
              placeholder="Descripción del objetivo..."
              placeholderTextColor={colors.textSecondary}
              multiline
            />

            {/* Dates row */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 16 }}>
              <DateCalendarInput
                label="Fecha de Inicio"
                value={goalStart}
                onChange={setGoalStart}
                colors={colors}
              />
              <DateCalendarInput
                label="Fecha de Fin"
                value={goalEnd}
                onChange={setGoalEnd}
                colors={colors}
              />
            </View>

            {/* Modal Actions */}
            <View style={modalStyles.actionsRow}>
              <Pressable
                onPress={() => setIsGoalModalVisible(false)}
                style={[modalStyles.btn, { borderColor: colors.textSecondary, borderWidth: 1 }]}
              >
                <Text style={[modalStyles.btnText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleSaveGoal} style={[modalStyles.btn, { backgroundColor: '#FF2D55' }]}>
                <Text style={[modalStyles.btnText, { color: '#FFFFFF', fontWeight: 'bold' }]}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ───────────────────────────────────────────────────────────────────────
          PHASE EDIT/CREATE MODAL
          ─────────────────────────────────────────────────────────────────────── */}
      <Modal visible={isPhaseModalVisible} transparent animationType="fade" onRequestClose={() => setIsPhaseModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={modalStyles.overlay}>
          <View style={[modalStyles.container, { backgroundColor: colors.background }]}>
            <Text style={[modalStyles.title, { color: colors.text }]}>
              {editingPhase ? 'Editar Fase' : 'Nueva Fase'}
            </Text>

            {/* Name */}
            <Text style={[formStyles.label, { color: colors.textSecondary, marginTop: 12 }]}>Nombre de la Fase</Text>
            <TextInput
              style={[modalStyles.textInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}
              value={phaseName}
              onChangeText={setPhaseName}
              placeholder="Ej. Configuración inicial"
              placeholderTextColor={colors.textSecondary}
            />

            {/* Description */}
            <Text style={[formStyles.label, { color: colors.textSecondary, marginTop: 12 }]}>Descripción</Text>
            <TextInput
              style={[modalStyles.textInput, { height: 60, textAlignVertical: 'top', color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}
              value={phaseDesc}
              onChangeText={setPhaseDesc}
              placeholder="Ej. Instalar SDKs y arrancar repositorio..."
              placeholderTextColor={colors.textSecondary}
              multiline
            />

            {/* Modal Actions */}
            <View style={[modalStyles.actionsRow, { marginTop: 16 }]}>
              <Pressable
                onPress={() => setIsPhaseModalVisible(false)}
                style={[modalStyles.btn, { borderColor: colors.textSecondary, borderWidth: 1 }]}
              >
                <Text style={[modalStyles.btnText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleSavePhase} style={[modalStyles.btn, { backgroundColor: '#FF2D55' }]}>
                <Text style={[modalStyles.btnText, { color: '#FFFFFF', fontWeight: 'bold' }]}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 24) + 6,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBackBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  headerAddBtn: { padding: 4 },
  scrollContent: { paddingVertical: 16, paddingHorizontal: 16, gap: 16 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18, opacity: 0.8 },
  btn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  goalCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', padding: 14, gap: 10 },
  goalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalTitleText: { fontSize: 16, fontWeight: 'bold' },
  goalDescText: { fontSize: 12, lineHeight: 16 },
  goalDatesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  goalDatesText: { fontSize: 11, fontWeight: '500' },
  progressBarWrapper: { gap: 4, marginTop: 2 },
  progressBarBG: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 10, fontWeight: '600' },
  goalActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, borderTopWidth: 1, paddingTop: 10 },
  goalActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  goalActionText: { fontSize: 11, fontWeight: 'bold' },
  phasesSection: { borderTopWidth: 1, paddingTop: 12, gap: 12 },
  phasesHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  phasesTitleLabel: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  addPhaseSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyPhasesCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, padding: 12 },
  phasesListContainer: { marginTop: 4 },
  phaseItemWrapper: { flexDirection: 'row', minHeight: 80 },
  stepIndicatorCol: { width: 24, alignItems: 'center', paddingVertical: 4 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepLine: { width: 2, flex: 1, marginVertical: 4 },
  phaseCardContent: { flex: 1, paddingLeft: 8, paddingBottom: 16, gap: 8 },
  phaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  phaseNameText: { fontSize: 14, fontWeight: '700' },
  phaseDescTextContent: { fontSize: 11, lineHeight: 14, marginTop: 2 },
  phaseControlsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6 },
  phaseRemindersList: { gap: 6 },
  reminderItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8 },
  completedCheckbox: { padding: 2 },
  reminderItemText: { flex: 1, fontSize: 12, fontWeight: '500' },
  reminderItemDate: { fontSize: 9, fontWeight: 'bold' },
  quickTaskBox: { gap: 8, padding: 8, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.02)' },
  quickTaskInput: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, fontSize: 12 },
  quickTaskBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, alignSelf: 'flex-start' },
  addReminderPlaceholderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { width: '100%', maxWidth: 360, borderRadius: 16, padding: 20, gap: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 13 },
});
