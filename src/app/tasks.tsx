import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  useColorScheme,
  TextInput,
  ScrollView,
  Animated,
  PanResponder,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore, ItemType, Priority, Task, EnergyType, getLocalDateStr, TaskState } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';
import { ScoreEngine } from '@/engines/ScoreEngine';
import { useRecommendationService } from '@/services/RecommendationService';

const speak = (text: string) => {
  try {
    const SpeechModule = require('expo-speech');
    if (SpeechModule && SpeechModule.speak) {
      SpeechModule.speak(text, { language: 'es-ES' });
      return;
    }
  } catch (e) {
    // Ignored, fallback below
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Web SpeechSynthesis failed:', e);
    }
  }
};

interface EditableProgressBarProps {
  task: Task;
  colors: any;
  hourWeights: any[];
  onUpdate: (progress: number) => void;
}

const EditableProgressBar: React.FC<EditableProgressBarProps> = ({ task, colors, hourWeights, onUpdate }) => {
  const [containerWidth, setContainerWidth] = useState(0);

  const taskProgress = task.progress !== undefined && task.progress !== null
    ? task.progress 
    : (task.estimatedHours && task.estimatedHours > 0
       ? Math.min(100, Math.round(((task.workedTime || 0) / (task.estimatedHours * 60)) * 100))
       : 0);

  const handlePress = (event: any) => {
    event.stopPropagation();
    if (containerWidth <= 0) return;
    const x = event.nativeEvent.locationX;
    const percentage = Math.min(100, Math.max(0, Math.round((x / containerWidth) * 100)));
    onUpdate(percentage);
  };

  return (
    <View style={{ marginTop: 8, gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}>Progreso</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 9, opacity: 0.7 }}>
            ({task.workedTime || 0}m de {Math.round((task.estimatedHours || 0) * 60)}m est.)
          </Text>
        </View>
        <Text style={{ color: '#34C759', fontSize: 11, fontWeight: '700' }}>{taskProgress}%</Text>
      </View>
      
      <Pressable
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onPress={handlePress}
        style={{
          height: 14,
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <View style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.backgroundSelected,
          width: '100%',
          overflow: 'hidden',
        }}>
          <View style={{
            height: '100%',
            width: `${taskProgress}%`,
            backgroundColor: '#34C759',
            borderRadius: 4
          }} />
        </View>
      </Pressable>
    </View>
  );
};

export default function TasksScreen() {
  const store = useRememberStore();
  const router = useRouter();
  console.log('[TasksScreen] userSettings:', JSON.stringify(store.userSettings));
  
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const { recommendations, triggerRecalculate } = useRecommendationService();

  // Calendar Widget State
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
  const [calendarSearchQuery, setCalendarSearchQuery] = useState('');
  const [selectedTaskForSlot, setSelectedTaskForSlot] = useState<Task | null>(null);

  // Local state for dragging tasks
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const dragPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [slotLayouts, setSlotLayouts] = useState<Record<string, { y: number, height: number }>>({});
  const slotsContainerRef = useRef<View>(null);
  const [slotsContainerY, setSlotsContainerY] = useState(0);

  // Task options and roadmap modal state
  const [selectedTaskOptions, setSelectedTaskOptions] = useState<Task | null>(null);
  const [showProgressRoadmap, setShowProgressRoadmap] = useState<Task | null>(null);

  const todayStr = getLocalDateStr();

  const handleToggleSlotReminders = () => {
    const isEnabled = store.userSettings?.notificationsEnabled;
    Alert.alert(
      'Configuración de Recordatorios',
      `Las notificaciones para tus bloques de trabajo hoy están actualmente ${isEnabled ? 'ACTIVADAS' : 'DESACTIVADAS'}.\n\n¿Quieres cambiar esta configuración?`,
      [
        {
          text: isEnabled ? 'Desactivar recordatorios' : 'Activar recordatorios',
          onPress: async () => {
            await store.updateUserSettings({ notificationsEnabled: !isEnabled });
            Alert.alert('Guardado', `Recordatorios ${!isEnabled ? 'activados' : 'desactivadas'} para hoy.`);
          }
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const handleAssignToSlot = async (taskId: string, slotId: string) => {
    await store.updateItem(taskId, { timeSlotId: slotId, dueDate: todayStr });
    triggerRecalculate();
  };

  const handleUnassignFromSlot = async (taskId: string) => {
    await store.updateItem(taskId, { timeSlotId: undefined });
    triggerRecalculate();
  };

  // Filter tasks for available unassigned shelf
  const unassignedTasks = useMemo(() => {
    return store.getTasks().filter(t => !t.completed && !t.archived && !t.trash && !t.timeSlotId);
  }, [store.items]);

  const filteredUnassignedTasks = useMemo(() => {
    return unassignedTasks.filter(t => t.title.toLowerCase().includes(calendarSearchQuery.toLowerCase()));
  }, [unassignedTasks, calendarSearchQuery]);

  // Setup PanResponder for dragging a task from the shelf
  const createPanResponder = (task: Task) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        setDraggingTask(task);
        dragPosition.setValue({
          x: gestureState.x0 - 75,
          y: gestureState.y0 - 25
        });
        // Measure absolute slot container position on layout when drag begins
        slotsContainerRef.current?.measureInWindow((x, y) => {
          setSlotsContainerY(y);
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        dragPosition.setValue({
          x: gestureState.moveX - 75,
          y: gestureState.moveY - 25
        });
      },
      onPanResponderRelease: async (evt, gestureState) => {
        const relativeY = gestureState.moveY - 15 - slotsContainerY;
        let matchedSlotId: string | null = null;
        
        for (const [slotId, layout] of Object.entries(slotLayouts)) {
          if (relativeY >= layout.y && relativeY <= layout.y + layout.height) {
            matchedSlotId = slotId;
            break;
          }
        }
        
        if (matchedSlotId) {
          await handleAssignToSlot(task.id, matchedSlotId);
          speak(`Tarea asignada a la franja horaria.`);
        }
        
        setDraggingTask(null);
      },
      onPanResponderTerminate: () => {
        setDraggingTask(null);
      }
    });
  };

  const renderCalendarWidget = () => {
    return (
      <View style={[styles.calendarWidgetCard, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.calendarWidgetHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.calendarHeaderIcon, { backgroundColor: 'rgba(255, 45, 85, 0.15)' }]}>
              <Ionicons name="calendar" size={18} color="#FF2D55" />
            </View>
            <View>
              <Text style={[styles.calendarWidgetTitle, { color: colors.text }]}>Horario de Hoy</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Organiza tus bloques de trabajo</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable 
              onPress={() => router.push('/slots')} 
              style={[styles.calendarHeaderBtn, { backgroundColor: colors.backgroundSelected }]}
              android_ripple={{ color: colors.backgroundSelected }}
            >
              <Ionicons name="settings-outline" size={16} color={colors.text} />
            </Pressable>
            
            <Pressable 
              onPress={handleToggleSlotReminders} 
              style={[styles.calendarHeaderBtn, { backgroundColor: colors.backgroundSelected }]}
              android_ripple={{ color: colors.backgroundSelected }}
            >
              <Ionicons 
                name={store.userSettings?.notificationsEnabled ? "notifications" : "notifications-off-outline"} 
                size={16} 
                color={store.userSettings?.notificationsEnabled ? "#FF9500" : colors.textSecondary} 
              />
            </Pressable>
            <Pressable 
              onPress={() => setIsCalendarExpanded(!isCalendarExpanded)} 
              style={[styles.calendarHeaderBtn, { backgroundColor: colors.backgroundSelected }]}
              android_ripple={{ color: colors.backgroundSelected }}
            >
              <Ionicons name={isCalendarExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {isCalendarExpanded && (
          <View style={{ paddingHorizontal: 14, paddingBottom: 16 }}>
            {selectedTaskForSlot && (
              <View style={[styles.tapSelectionBanner, { backgroundColor: 'rgba(255, 149, 0, 0.15)', borderColor: '#FF9500' }]}>
                <Ionicons name="information-circle-outline" size={16} color="#FF9500" />
                <Text style={{ color: colors.text, fontSize: 12, flex: 1, fontWeight: '500' }}>
                  Seleccionado: <Text style={{ fontWeight: 'bold' }}>"{selectedTaskForSlot.title}"</Text>. Toca un bloque para asignarla.
                </Text>
                <Pressable onPress={() => setSelectedTaskForSlot(null)} style={{ padding: 2 }}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            )}

            <Text style={[styles.calendarSubTitle, { color: colors.textSecondary }]}>BLOQUES DE TRABAJO</Text>
            {store.timeSlots.length === 0 ? (
              <View style={styles.calendarEmptySlots}>
                <Ionicons name="hourglass-outline" size={32} color={colors.textSecondary} style={{ opacity: 0.4 }} />
                <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginVertical: 6 }}>
                  No tienes franjas horarias configuradas.
                </Text>
                <Pressable 
                  onPress={() => router.push('/slots')} 
                  style={styles.calendarConfigBtn}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Configurar Franjas</Text>
                </Pressable>
              </View>
            ) : (
              <View ref={slotsContainerRef} style={{ gap: 12, marginVertical: 8 }}>
                {store.timeSlots.map((slot, index) => {
                  const slotTasks = store.getTasks().filter(t => !t.archived && !t.trash && t.timeSlotId === slot.id);
                  const colorsPalette = ['#007AFF', '#34C759', '#FF9500', '#5856D6', '#FF2D55', '#AF52DE'];
                  const slotColor = colorsPalette[index % colorsPalette.length];

                  return (
                    <View 
                      key={slot.id} 
                      style={styles.calendarRow}
                      onLayout={(e) => {
                        const { y, height } = e.nativeEvent.layout;
                        setSlotLayouts(prev => ({ ...prev, [slot.id]: { y, height } }));
                      }}
                    >
                      <View style={styles.timeColumn}>
                        <Text style={[styles.timeLabelText, { color: colors.textSecondary }]}>{slot.startTime}</Text>
                        <View style={[styles.timeLabelLine, { backgroundColor: colors.backgroundSelected }]} />
                      </View>

                      <Pressable
                        onPress={async () => {
                          if (selectedTaskForSlot) {
                            await handleAssignToSlot(selectedTaskForSlot.id, slot.id);
                            setSelectedTaskForSlot(null);
                          }
                        }}
                        style={[
                          styles.slotBoxCard,
                          { 
                            backgroundColor: colors.background, 
                            borderColor: selectedTaskForSlot ? '#FF9500' : colors.backgroundSelected,
                            borderLeftColor: slotColor,
                          },
                          selectedTaskForSlot && { borderStyle: 'dashed', borderWidth: 1.5 }
                        ]}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.slotNameText, { color: colors.text }]}>{slot.name}</Text>
                          <Text style={{ fontSize: 11, color: slotColor, fontWeight: '700' }}>
                            {slot.startTime} - {slot.endTime}
                          </Text>
                        </View>

                        <View style={{ marginTop: 6, gap: 6 }}>
                          {slotTasks.length === 0 ? (
                            <Text style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' }}>
                              {selectedTaskForSlot ? '+ Toca para asignar aquí' : 'Sin tareas asignadas'}
                            </Text>
                          ) : (
                            slotTasks.map(task => (
                              <View 
                                key={task.id} 
                                style={[styles.calendarTaskChip, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}
                              >
                                <Pressable 
                                  onPress={() => store.toggleItemCompleted(task.id)}
                                  style={{ padding: 2 }}
                                >
                                  <Ionicons 
                                    name={task.completed ? "checkmark-circle" : "ellipse-outline"} 
                                    size={14} 
                                    color={task.completed ? "#34C759" : colors.textSecondary} 
                                  />
                                </Pressable>
                                <Pressable
                                  onPress={() => {
                                    Alert.alert(
                                      'Iniciar Sesión',
                                      `¿Deseas iniciar una sesión de enfoque de 30 minutos para "${task.title}"?`,
                                      [
                                        { text: 'Cancelar', style: 'cancel' },
                                        { 
                                          text: 'Iniciar 30 min', 
                                          onPress: () => router.push({ pathname: '/session', params: { taskId: task.id, duration: '30' } }) 
                                        }
                                      ]
                                    );
                                  }}
                                  style={{ flex: 1, paddingVertical: 2 }}
                                >
                                  <Text 
                                    numberOfLines={1}
                                    style={[
                                      styles.calendarTaskChipText, 
                                      { color: colors.text },
                                      task.completed && { textDecorationLine: 'line-through', opacity: 0.6 }
                                    ]}
                                  >
                                    {task.title}
                                  </Text>
                                </Pressable>
                                <Pressable 
                                  onPress={() => handleUnassignFromSlot(task.id)}
                                  style={{ padding: 4, marginLeft: 'auto' }}
                                >
                                  <Ionicons name="close-circle-outline" size={14} color="#FF3B30" />
                                </Pressable>
                              </View>
                            ))
                          )}
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={[styles.separator, { backgroundColor: colors.backgroundSelected, marginVertical: 12 }]} />
            
            <Text style={[styles.calendarSubTitle, { color: colors.textSecondary, marginBottom: 6 }]}>
              TAREAS DISPONIBLES ({unassignedTasks.length})
            </Text>
            
            <View style={[styles.shelfSearchContainer, { backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}>
              <Ionicons name="search-outline" size={14} color={colors.textSecondary} />
              <TextInput
                placeholder="Buscar tarea para programar..."
                placeholderTextColor={colors.textSecondary + '70'}
                value={calendarSearchQuery}
                onChangeText={setCalendarSearchQuery}
                style={[styles.shelfSearchInput, { color: colors.text }]}
              />
            </View>

            {filteredUnassignedTasks.length === 0 ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' }}>
                  {unassignedTasks.length === 0 ? 'No hay tareas sin asignar.' : 'Ninguna coincide con la búsqueda.'}
                </Text>
              </View>
            ) : (
              <ScrollView 
                nestedScrollEnabled={true}
                style={{ maxHeight: 185 }}
                contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 8 }}
              >
                {filteredUnassignedTasks.map(task => {
                  const isSelected = selectedTaskForSlot?.id === task.id;
                  const responder = createPanResponder(task);
                  
                  return (
                    <Animated.View
                      key={task.id}
                      {...responder.panHandlers}
                      style={[
                        styles.shelfTaskCard,
                        { 
                          backgroundColor: colors.background,
                          borderColor: isSelected ? '#FF9500' : colors.backgroundSelected 
                        },
                        isSelected && { borderWidth: 1.5 }
                      ]}
                    >
                      <Pressable
                        onPress={() => {
                          if (isSelected) {
                            setSelectedTaskForSlot(null);
                          } else {
                            setSelectedTaskForSlot(task);
                          }
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      >
                        <Ionicons name="grid-outline" size={12} color={colors.textSecondary} style={{ opacity: 0.7 }} />
                        <Text numberOfLines={1} style={[styles.shelfTaskText, { color: colors.text }]}>
                          {task.title}
                        </Text>
                        <Pressable
                          onPress={() => {
                            if (store.timeSlots.length === 0) {
                              Alert.alert('Sin franjas', 'Configura franjas horarias primero.');
                              return;
                            }
                            Alert.alert(
                              'Asignar Tarea',
                              `Selecciona una franja horaria para "${task.title}":`,
                              [
                                ...store.timeSlots.map(slot => ({
                                  text: slot.name,
                                  onPress: () => handleAssignToSlot(task.id, slot.id)
                                })),
                                { text: 'Cancelar', style: 'cancel' }
                              ]
                            );
                          }}
                          style={{ padding: 2 }}
                        >
                          <Ionicons name="chevron-down-circle-outline" size={14} color="#FF9500" />
                        </Pressable>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    );
  };

  // Filters
  const [filterPriorities, setFilterPriorities] = useState<Priority[]>([]);
  const [filterGoalId, setFilterGoalId] = useState<string>('ALL');
  const [filterWeightIds, setFilterWeightIds] = useState<string[]>([]);
  const [filterEnergyTypes, setFilterEnergyTypes] = useState<EnergyType[]>([]);
  const [filterDateRange, setFilterDateRange] = useState<'ALL' | 'TODAY_OVERDUE' | 'WEEK' | 'MONTH' | 'FUTURE' | 'UNSCHEDULED'>('ALL');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'PENDING' | 'COMPLETED' | 'ARCHIVED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'default' | 'score'>('default');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (sortBy !== 'default') count++;
    if (filterDateRange !== 'ALL') count++;
    if (filterPriorities.length > 0) count++;
    if (filterWeightIds.length > 0) count++;
    if (filterEnergyTypes.length > 0) count++;
    return count;
  }, [sortBy, filterDateRange, filterPriorities, filterWeightIds, filterEnergyTypes]);

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Comments/Detail expansion
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const tasksList = useMemo(() => {
    let list = store.items.filter((i) => i.type === ItemType.TASK && !i.trash) as Task[];

    if (taskStatusFilter === 'PENDING') {
      list = list.filter((t) => !t.completed && !t.archived);
    } else if (taskStatusFilter === 'COMPLETED') {
      list = list.filter((t) => t.completed && !t.archived);
    } else if (taskStatusFilter === 'ARCHIVED') {
      list = list.filter((t) => t.archived);
    }

    if (filterPriorities.length > 0) {
      list = list.filter((t) => filterPriorities.includes(t.priority));
    }

    if (filterGoalId !== 'ALL') {
      list = list.filter((t) => t.goalId === filterGoalId);
    }

    if (filterWeightIds.length > 0) {
      list = list.filter((t) => {
        if (!t.estimatedHours || t.estimatedHours <= 0) return false;
        const sortedWeights = [...store.hourWeights].sort((a, b) => b.minHours - a.minHours);
        const matched = sortedWeights.find((w) => t.estimatedHours! >= w.minHours);
        const labelId = matched ? matched.id : (sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1].id : null);
        return labelId ? filterWeightIds.includes(labelId) : false;
      });
    }

    if (filterEnergyTypes.length > 0) {
      list = list.filter((t) => t.energyType && filterEnergyTypes.includes(t.energyType));
    }

    if (filterDateRange === 'TODAY_OVERDUE') {
      const todayStr = getLocalDateStr(new Date());
      list = list.filter((t) => t.dueDate && t.dueDate <= todayStr);
    } else if (filterDateRange === 'WEEK') {
      const today = new Date();
      const todayStr = getLocalDateStr(today);
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      const nextWeekStr = getLocalDateStr(nextWeek);
      
      list = list.filter((t) => t.dueDate && t.dueDate >= todayStr && t.dueDate <= nextWeekStr);
    } else if (filterDateRange === 'MONTH') {
      const today = new Date();
      const todayStr = getLocalDateStr(today);
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 30);
      const nextMonthStr = getLocalDateStr(nextMonth);
      
      list = list.filter((t) => t.dueDate && t.dueDate >= todayStr && t.dueDate <= nextMonthStr);
    } else if (filterDateRange === 'FUTURE') {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 30);
      const nextMonthStr = getLocalDateStr(nextMonth);
      
      list = list.filter((t) => t.dueDate && t.dueDate > nextMonthStr);
    } else if (filterDateRange === 'UNSCHEDULED') {
      list = list.filter((t) => !t.dueDate);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => 
        t.title.toLowerCase().includes(q) || 
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Sort by:
    // 1. If sortBy === 'score', sort by score descending
    // 2. Closest completion date (earliest dueDate first; undated tasks go to the end)
    // 3. Priority (HIGH -> MEDIUM -> LOW)
    // 4. Newest first (createdAt)
    return list.sort((a, b) => {
      if (sortBy === 'score') {
        const scoreA = ScoreEngine.calculateScore(a, store.hourWeights, store.userSettings?.scoreFormula);
        const scoreB = ScoreEngine.calculateScore(b, store.hourWeights, store.userSettings?.scoreFormula);
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
      }

      const dateA = a.dueDate || '';
      const dateB = b.dueDate || '';

      if (dateA && dateB) {
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
      } else if (dateA) {
        return -1;
      } else if (dateB) {
        return 1;
      }

      const weights = { [Priority.URGENT]: 4, [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
      const wA = weights[a.priority] || 2;
      const wB = weights[b.priority] || 2;
      if (wA !== wB) return wB - wA;
      
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [store.items, store.hourWeights, store.userSettings, filterPriorities, filterGoalId, filterWeightIds, filterEnergyTypes, filterDateRange, taskStatusFilter, searchQuery, sortBy]);

  const handleBulkDelete = () => {
    Alert.alert(
      'Mover a la papelera',
      `¿Deseas mover ${selectedIds.length} tareas a la papelera?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover',
          style: 'destructive',
          onPress: async () => {
            await store.updateItems(selectedIds, {
              trash: true,
              deletedAt: new Date().toISOString(),
            });
            setSelectedIds([]);
          },
        },
      ]
    );
  };

  const handleAddComment = async (taskId: string) => {
    const text = commentInputs[taskId]?.trim();
    if (!text) return;
    
    await store.addComment(taskId, text);
    setCommentInputs((prev) => ({ ...prev, [taskId]: '' }));
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Mover a la Papelera',
      `¿Deseas mover la tarea "${task.title}" a la papelera?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover',
          style: 'destructive',
          onPress: async () => {
            await store.deleteItem(task.id);
          },
        },
      ]
    );
  };

  const handleArchiveTask = async (task: Task) => {
    await store.archiveItem(task.id);
    Alert.alert('Archivada', `Se archivó la tarea "${task.title}".`);
  };

  const handleUnarchiveTask = async (task: Task) => {
    await store.unarchiveItem(task.id);
    Alert.alert('Desarchivada', `Se desarchivó la tarea "${task.title}".`);
  };

  const handleChangePriority = (task: Task) => {
    Alert.alert(
      'Cambiar Prioridad',
      `Selecciona la nueva prioridad para "${task.title}":`,
      [
        {
          text: 'Urgente (URGENT)',
          onPress: async () => {
            await store.updateItem(task.id, { priority: Priority.URGENT });
          },
        },
        {
          text: 'Alta (HIGH)',
          onPress: async () => {
            await store.updateItem(task.id, { priority: Priority.HIGH });
          },
        },
        {
          text: 'Media (MEDIUM)',
          onPress: async () => {
            await store.updateItem(task.id, { priority: Priority.MEDIUM });
          },
        },
        {
          text: 'Baja (LOW)',
          onPress: async () => {
            await store.updateItem(task.id, { priority: Priority.LOW });
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const renderDateBadge = (task: Task) => {
    if (!task.dueDate) return null;

    const todayStr = getLocalDateStr(new Date());
    let badgeText = '';
    let isOverdue = false;
    let isToday = false;

    const formatShortDate = (dateStr: string) => {
      if (dateStr === todayStr) return 'Hoy';
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dateStr === getLocalDateStr(tomorrow)) return 'Mañana';
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (dateStr === getLocalDateStr(yesterday)) return 'Ayer';

      const [y, m, d] = dateStr.split('-');
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthLabel = months[parseInt(m, 10) - 1] || m;
      return `${parseInt(d, 10)} ${monthLabel}`;
    };

    isOverdue = task.dueDate < todayStr && !task.completed;
    isToday = task.dueDate === todayStr;
    badgeText = formatShortDate(task.dueDate);

    const badgeBgColor = isOverdue 
      ? 'rgba(255, 59, 48, 0.15)' 
      : isToday 
        ? 'rgba(255, 149, 0, 0.15)' 
        : 'rgba(52, 199, 89, 0.12)';
        
    const badgeTextColor = isOverdue 
      ? '#FF3B30' 
      : isToday 
        ? '#FF9500' 
        : '#34C759';

    return (
      <View style={[styles.metaBadge, { backgroundColor: badgeBgColor }]}>
        <Text style={{ color: badgeTextColor, fontSize: 10, fontWeight: '700' }}>
          {isOverdue ? '⚠️ Finalización vencida: ' : '🏁 Finalización: '}{badgeText}
        </Text>
      </View>
    );
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const isExpanded = expandedTaskId === item.id;
    const goal = store.goals.find((g) => g.id === item.goalId);
    const phase = goal?.phases.find((p) => p.id === item.phaseId);

    const priorityColor =
      item.priority === Priority.URGENT ? '#C20000' : item.priority === Priority.HIGH ? '#FF3B30' : item.priority === Priority.MEDIUM ? '#FF9500' : '#34C759';

    const isSelected = selectedIds.includes(item.id);

    return (
      <Pressable
        onLongPress={() => handleToggleSelect(item.id)}
        onPress={() => {
          if (selectedIds.length > 0) {
            handleToggleSelect(item.id);
          } else {
            setSelectedTaskOptions(item);
          }
        }}
        style={[
          styles.taskCard,
          { backgroundColor: colors.backgroundElement },
          isSelected && { borderColor: '#FF9500', borderWidth: 1.5 },
        ]}
      >
        <View style={styles.cardMain}>
          {selectedIds.length > 0 ? (
            <View style={styles.checkboxContainer}>
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={24}
                color={isSelected ? '#FF9500' : colors.textSecondary}
              />
            </View>
          ) : (
            <Pressable
              onPress={async (e) => {
                e.stopPropagation();
                await store.toggleItemCompleted(item.id);
              }}
              style={styles.checkboxContainer}
            >
              <Ionicons
                name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={item.completed ? '#FF9500' : colors.textSecondary}
              />
            </Pressable>
          )}

          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text
              style={[
                styles.taskTitle,
                { color: colors.text },
                item.completed && { textDecorationLine: 'line-through', opacity: 0.6 },
              ]}
            >
              {item.title}
            </Text>
            
            <View style={styles.tagRow}>
              <Pressable
                onPress={(e) => {
                  if (selectedIds.length > 0) return;
                  e.stopPropagation();
                  handleChangePriority(item);
                }}
                style={({ pressed }) => [
                  styles.priorityBadge,
                  { backgroundColor: priorityColor + '20', opacity: pressed && selectedIds.length === 0 ? 0.6 : 1 },
                ]}
                disabled={selectedIds.length > 0}
              >
                <Text style={{ color: priorityColor, fontSize: 10, fontWeight: '700' }}>
                  {item.priority === Priority.URGENT ? 'URGENTE' : item.priority.toUpperCase()}
                </Text>
              </Pressable>

              <View style={[styles.metaBadge, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                <Text style={{ color: scheme === 'dark' ? '#FFD700' : '#D4AF37', fontSize: 10, fontWeight: '800' }}>
                  ⭐ Score: {ScoreEngine.calculateScore(item, store.hourWeights, store.userSettings?.scoreFormula)}
                </Text>
              </View>

              {renderDateBadge(item)}

              {item.energyType ? (
                <View style={[styles.metaBadge, { backgroundColor: 'rgba(88, 86, 214, 0.1)' }]}>
                  <Text style={{ color: '#5856D6', fontSize: 10, fontWeight: '700' }}>
                    ⚡ {
                      item.energyType === EnergyType.CREATIVE ? 'Creativa' :
                      item.energyType === EnergyType.ANALYTICAL ? 'Analítica' :
                      item.energyType === EnergyType.ADMINISTRATIVE ? 'Admin' :
                      item.energyType === EnergyType.SOCIAL ? 'Social' :
                      item.energyType === EnergyType.PHYSICAL ? 'Física' :
                      'Aprendizaje'
                    }
                  </Text>
                </View>
              ) : null}

              {item.estimatedHours ? (
                <>
                  <View style={[styles.metaBadge, { backgroundColor: colors.backgroundSelected }]}>
                    <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}>
                      ⌛ {item.estimatedHours}h
                    </Text>
                  </View>
                  {(() => {
                    const sortedWeights = [...(store.hourWeights || [])].sort((a, b) => b.minHours - a.minHours);
                    const matched = sortedWeights.find((w) => item.estimatedHours! >= w.minHours);
                    const label = matched ? matched.name : (sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1].name : null);
                    if (!label) return null;
                    return (
                      <View style={[styles.metaBadge, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                        <Text style={{ color: '#007AFF', fontSize: 10, fontWeight: '700' }}>
                          {label}
                        </Text>
                      </View>
                    );
                  })()}
                </>
              ) : null}

              {goal ? (
                <View style={[styles.metaBadge, { backgroundColor: 'rgba(255, 45, 85, 0.1)' }]}>
                  <Text style={{ color: '#FF2D55', fontSize: 10, fontWeight: '600' }}>
                    🎯 {goal.title}
                  </Text>
                </View>
              ) : null}

            </View>
            
            <EditableProgressBar
              task={item}
              colors={colors}
              hourWeights={store.hourWeights || []}
              onUpdate={async (newProgress) => {
                await store.updateItems([item.id], {
                  progress: newProgress,
                  taskState: newProgress === 100 ? TaskState.COMPLETED : item.taskState
                });
              }}
            />
          </View>

          <View style={styles.cardActions}>
            {selectedIds.length === 0 && (
              <>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push({ pathname: '/editor', params: { id: item.id } });
                  }}
                  style={styles.actionBtn}
                >
                  <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                </Pressable>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setExpandedTaskId(isExpanded ? null : item.id);
                  }}
                  style={styles.actionBtn}
                >
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                </Pressable>
              </>
            )}
          </View>
        </View>

        {isExpanded && (
          <View style={[styles.cardDetails, { borderTopColor: colors.backgroundSelected }]}>
            {item.description ? (
              <Text style={[styles.descText, { color: colors.textSecondary }]}>{item.description}</Text>
            ) : null}

            {item.startDate || item.dueDate ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
                📅 Rango: {item.startDate || '?'} a {item.dueDate || '?'}
              </Text>
            ) : null}



            {/* Utility buttons for Item Lifecycle */}
            <View style={styles.utilityRow}>
              {item.archived ? (
                <Pressable
                  onPress={() => handleUnarchiveTask(item)}
                  style={[styles.utilityBtn, { backgroundColor: colors.backgroundSelected }]}
                >
                  <Ionicons name="archive" size={16} color="#FF9500" />
                  <Text style={[styles.utilityBtnText, { color: '#FF9500' }]}>Desarchivar</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => handleArchiveTask(item)}
                  style={[styles.utilityBtn, { backgroundColor: colors.backgroundSelected }]}
                >
                  <Ionicons name="archive-outline" size={16} color={colors.text} />
                  <Text style={[styles.utilityBtnText, { color: colors.text }]}>Archivar</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => handleDeleteTask(item)}
                style={[styles.utilityBtn, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
              >
                <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                <Text style={[styles.utilityBtnText, { color: '#FF3B30' }]}>Papelera</Text>
              </Pressable>
            </View>

            <View style={[styles.separator, { backgroundColor: colors.backgroundSelected }]} />

            {/* Comments Thread (WhatsApp-style commenting thread requested in specifications) */}
            <Text style={[styles.commentsHeader, { color: colors.text }]}>Comentarios / Notas</Text>
            {(item.comments || []).length > 0 ? (
              <View style={styles.commentsList}>
                {item.comments.map((comment) => (
                  <View key={comment.id} style={[styles.commentBubble, { backgroundColor: colors.backgroundSelected }]}>
                    <Text style={{ color: colors.text, fontSize: 13 }}>{comment.text}</Text>
                    <View style={[styles.row, { justifyContent: 'space-between', marginTop: 4 }]}>
                      <Text style={{ color: colors.textSecondary, fontSize: 9 }}>{comment.createdAt}</Text>
                      <Pressable onPress={() => store.deleteComment(item.id, comment.id)}>
                        <Text style={{ color: '#FF3B30', fontSize: 10 }}>Eliminar</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.noCommentsText, { color: colors.textSecondary }]}>No hay comentarios aún.</Text>
            )}

            <View style={styles.commentInputRow}>
              <TextInput
                placeholder="Escribe un comentario..."
                placeholderTextColor={colors.textSecondary + '80'}
                value={commentInputs[item.id] || ''}
                onChangeText={(text) => setCommentInputs((prev) => ({ ...prev, [item.id]: text }))}
                style={[styles.commentInput, { color: colors.text, backgroundColor: colors.backgroundSelected }]}
              />
              <Pressable onPress={() => handleAddComment(item.id)} style={[styles.commentSendBtn, { backgroundColor: '#FF9500' }]}>
                <Ionicons name="send" size={14} color="#fff" />
              </Pressable>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {selectedIds.length > 0 ? (
        <View style={[styles.header, { borderBottomColor: colors.backgroundElement, backgroundColor: colors.backgroundElement }]}>
          <Pressable onPress={() => setSelectedIds([])} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{selectedIds.length} seleccionadas</Text>
          <Pressable onPress={handleBulkDelete} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.header, { borderBottomColor: colors.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Tareas</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/editor', params: { type: ItemType.TASK } })}
            style={styles.headerButton}
          >
            <Ionicons name="add" size={26} color="#FF9500" />
          </Pressable>
        </View>
      )}

      {/* Search Bar */}
      <View style={[styles.searchBarContainer, { borderBottomColor: colors.backgroundSelected }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar tareas por nombre..."
          placeholderTextColor={colors.textSecondary + '80'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: colors.text, backgroundColor: colors.backgroundElement }]}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Debug Info */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 4, backgroundColor: colors.backgroundElement, borderBottomWidth: 1, borderBottomColor: colors.backgroundSelected }}>
        <Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: 'monospace' }} numberOfLines={1}>
          Formula: {store.userSettings?.scoreFormula || 'default (undefined)'}
        </Text>
      </View>

      {/* Status Filter Tabs (Always Visible) */}
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setTaskStatusFilter('PENDING')}
          style={[styles.tabBtn, taskStatusFilter === 'PENDING' && { borderBottomColor: '#FF9500', borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabText, { color: taskStatusFilter === 'PENDING' ? '#FF9500' : colors.textSecondary }]}>Pendientes</Text>
        </Pressable>
        <Pressable
          onPress={() => setTaskStatusFilter('COMPLETED')}
          style={[styles.tabBtn, taskStatusFilter === 'COMPLETED' && { borderBottomColor: '#FF9500', borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabText, { color: taskStatusFilter === 'COMPLETED' ? '#FF9500' : colors.textSecondary }]}>Completadas</Text>
        </Pressable>
        <Pressable
          onPress={() => setTaskStatusFilter('ARCHIVED')}
          style={[styles.tabBtn, taskStatusFilter === 'ARCHIVED' && { borderBottomColor: '#FF9500', borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabText, { color: taskStatusFilter === 'ARCHIVED' ? '#FF9500' : colors.textSecondary }]}>Archivadas</Text>
        </Pressable>
      </View>

      {/* Collapsible Filters Header */}
      <Pressable 
        onPress={() => setIsFiltersExpanded(!isFiltersExpanded)} 
        style={[styles.filtersCollapsibleHeader, { backgroundColor: colors.backgroundElement, borderBottomColor: colors.backgroundSelected }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="funnel-outline" size={15} color={colors.textSecondary} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Filtros y Ordenación</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </View>
        <Ionicons name={isFiltersExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
      </Pressable>

      {isFiltersExpanded && (
        <View style={[styles.filterSection, { backgroundColor: colors.backgroundElement }]}>

        {/* Sort Selector */}
        {selectedIds.length === 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 12, gap: 8 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Ordenar por:</Text>
            <Pressable
              onPress={() => setSortBy('default')}
              style={[
                styles.filterChip,
                sortBy === 'default' ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement },
                { marginVertical: 0, marginTop: 0 }
              ]}
            >
              <Text style={[styles.filterChipText, { color: sortBy === 'default' ? '#fff' : colors.text }]}>Fecha y Prioridad</Text>
            </Pressable>
            <Pressable
              onPress={() => setSortBy('score')}
              style={[
                styles.filterChip,
                sortBy === 'score' ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement },
                { marginVertical: 0, marginTop: 0 }
              ]}
            >
              <Text style={[styles.filterChipText, { color: sortBy === 'score' ? '#fff' : colors.text }]}>⭐ Mayor Score</Text>
            </Pressable>
          </View>
        )}

        {/* Date Filter */}
        {selectedIds.length === 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalFilters} style={{ marginTop: 8 }}>
            <Pressable
              onPress={() => setFilterDateRange('ALL')}
              style={[styles.filterChip, filterDateRange === 'ALL' ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement }]}
            >
              <Text style={[styles.filterChipText, { color: filterDateRange === 'ALL' ? '#fff' : colors.text }]}>Cualquier finalización</Text>
            </Pressable>
            <Pressable
              onPress={() => setFilterDateRange('TODAY_OVERDUE')}
              style={[styles.filterChip, filterDateRange === 'TODAY_OVERDUE' ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement }]}
            >
              <Text style={[styles.filterChipText, { color: filterDateRange === 'TODAY_OVERDUE' ? '#fff' : colors.text }]}>🏁 Hoy y Atrasadas</Text>
            </Pressable>
            <Pressable
              onPress={() => setFilterDateRange('WEEK')}
              style={[styles.filterChip, filterDateRange === 'WEEK' ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement }]}
            >
              <Text style={[styles.filterChipText, { color: filterDateRange === 'WEEK' ? '#fff' : colors.text }]}>🗓️ Esta semana</Text>
            </Pressable>
            <Pressable
              onPress={() => setFilterDateRange('MONTH')}
              style={[styles.filterChip, filterDateRange === 'MONTH' ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement }]}
            >
              <Text style={[styles.filterChipText, { color: filterDateRange === 'MONTH' ? '#fff' : colors.text }]}>📅 Este mes</Text>
            </Pressable>
            <Pressable
              onPress={() => setFilterDateRange('FUTURE')}
              style={[styles.filterChip, filterDateRange === 'FUTURE' ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement }]}
            >
              <Text style={[styles.filterChipText, { color: filterDateRange === 'FUTURE' ? '#fff' : colors.text }]}>🚀 Más adelante</Text>
            </Pressable>
            <Pressable
              onPress={() => setFilterDateRange('UNSCHEDULED')}
              style={[styles.filterChip, filterDateRange === 'UNSCHEDULED' ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement }]}
            >
              <Text style={[styles.filterChipText, { color: filterDateRange === 'UNSCHEDULED' ? '#fff' : colors.text }]}>❓ Sin fecha</Text>
            </Pressable>
          </ScrollView>
        )}

        {/* Bulk Configuration Mode Indicator */}
        {selectedIds.length > 0 && (
          <View style={[styles.bulkEditBanner, { backgroundColor: colors.backgroundSelected, borderColor: '#FF9500' }]}>
            <Ionicons name="information-circle-outline" size={18} color="#FF9500" />
            <Text style={[styles.bulkEditText, { color: colors.text }]}>
              Configuración masiva activa: Toca una prioridad, peso o energía de abajo para asignarlo a las tareas seleccionadas.
            </Text>
          </View>
        )}

        {/* Priority Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalFilters}>
          <Pressable
            onPress={() => {
              if (selectedIds.length > 0) return;
              setFilterPriorities([]);
            }}
            style={[
              styles.filterChip,
              selectedIds.length > 0 && { opacity: 0.5 },
              filterPriorities.length === 0 && selectedIds.length === 0 ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement }
            ]}
            disabled={selectedIds.length > 0}
          >
            <Text style={[styles.filterChipText, { color: filterPriorities.length === 0 && selectedIds.length === 0 ? '#fff' : colors.text }]}>Todas</Text>
          </Pressable>
          {([Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW] as Priority[]).map((p) => {
            const isActive = filterPriorities.includes(p);
            return (
              <Pressable
                key={p}
                onPress={() => {
                  if (selectedIds.length > 0) {
                    Alert.alert(
                      'Cambiar Prioridad',
                      `¿Deseas cambiar la prioridad de las ${selectedIds.length} tareas seleccionadas a "${p}"?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Confirmar',
                          onPress: async () => {
                            await store.updateItems(selectedIds, { priority: p });
                            setSelectedIds([]);
                          },
                        },
                      ]
                    );
                  } else {
                    if (isActive) {
                      setFilterPriorities(filterPriorities.filter((x) => x !== p));
                    } else {
                      setFilterPriorities([...filterPriorities, p]);
                    }
                  }
                }}
                style={[
                  styles.filterChip,
                  isActive && selectedIds.length === 0 ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement },
                ]}
              >
                <Text style={[styles.filterChipText, { color: isActive && selectedIds.length === 0 ? '#fff' : colors.text }]}>
                  {p === Priority.URGENT ? 'URGENTE' : p.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Weight Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalFilters} style={{ marginTop: -2 }}>
          <Pressable
            onPress={() => {
              if (selectedIds.length > 0) return;
              setFilterWeightIds([]);
            }}
            style={[
              styles.filterChip,
              selectedIds.length > 0 && { opacity: 0.5 },
              filterWeightIds.length === 0 && selectedIds.length === 0 ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement }
            ]}
            disabled={selectedIds.length > 0}
          >
            <Text style={[styles.filterChipText, { color: filterWeightIds.length === 0 && selectedIds.length === 0 ? '#fff' : colors.text }]}>Todos los pesos</Text>
          </Pressable>
          {store.hourWeights.map((w) => {
            const isActive = filterWeightIds.includes(w.id);
            return (
              <Pressable
                key={w.id}
                onPress={() => {
                  if (selectedIds.length > 0) {
                    Alert.alert(
                      'Cambiar Peso/Horas',
                      `¿Deseas cambiar el peso de las ${selectedIds.length} tareas seleccionadas a "${w.name}" (${w.minHours}h)?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Confirmar',
                          onPress: async () => {
                            await store.updateItems(selectedIds, { estimatedHours: w.minHours });
                            setSelectedIds([]);
                          },
                        },
                      ]
                    );
                  } else {
                    if (isActive) {
                      setFilterWeightIds(filterWeightIds.filter((x) => x !== w.id));
                    } else {
                      setFilterWeightIds([...filterWeightIds, w.id]);
                    }
                  }
                }}
                style={[
                  styles.filterChip,
                  isActive && selectedIds.length === 0 ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement }
                ]}
              >
                <Text style={[styles.filterChipText, { color: isActive && selectedIds.length === 0 ? '#fff' : colors.text }]}>{w.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Energy Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalFilters} style={{ marginTop: -2, marginBottom: 6 }}>
          <Pressable
            onPress={() => {
              if (selectedIds.length > 0) return;
              setFilterEnergyTypes([]);
            }}
            style={[
              styles.filterChip,
              selectedIds.length > 0 && { opacity: 0.5 },
              filterEnergyTypes.length === 0 && selectedIds.length === 0 ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement }
            ]}
            disabled={selectedIds.length > 0}
          >
            <Text style={[styles.filterChipText, { color: filterEnergyTypes.length === 0 && selectedIds.length === 0 ? '#fff' : colors.text }]}>Todas las energías</Text>
          </Pressable>
          {([
            EnergyType.CREATIVE,
            EnergyType.ANALYTICAL,
            EnergyType.ADMINISTRATIVE,
            EnergyType.SOCIAL,
            EnergyType.PHYSICAL,
            EnergyType.LEARNING,
          ] as EnergyType[]).map((eType) => {
            const isActive = filterEnergyTypes.includes(eType);
            const label = 
              eType === EnergyType.CREATIVE ? '🎨 Creativa' :
              eType === EnergyType.ANALYTICAL ? '🧠 Analítica' :
              eType === EnergyType.ADMINISTRATIVE ? '📁 Admin' :
              eType === EnergyType.SOCIAL ? '💬 Social' :
              eType === EnergyType.PHYSICAL ? '🏋️ Física' :
              '📖 Aprendizaje';

            return (
              <Pressable
                key={eType}
                onPress={() => {
                  if (selectedIds.length > 0) {
                    Alert.alert(
                      'Cambiar Categoría de Energía',
                      `¿Deseas cambiar la categoría de energía de las ${selectedIds.length} tareas seleccionadas a "${label}"?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Confirmar',
                          onPress: async () => {
                            await store.updateItems(selectedIds, { energyType: eType });
                            setSelectedIds([]);
                          },
                        },
                      ]
                    );
                  } else {
                    if (isActive) {
                      setFilterEnergyTypes(filterEnergyTypes.filter((x) => x !== eType));
                    } else {
                      setFilterEnergyTypes([...filterEnergyTypes, eType]);
                    }
                  }
                }}
                style={[
                  styles.filterChip,
                  isActive && selectedIds.length === 0 ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement },
                ]}
              >
                <Text style={[styles.filterChipText, { color: isActive && selectedIds.length === 0 ? '#fff' : colors.text }]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      )}

      <FlatList
        data={tasksList}
        ListHeaderComponent={renderCalendarWidget()}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        extraData={[selectedIds, store.userSettings, isCalendarExpanded, calendarSearchQuery, selectedTaskForSlot, draggingTask, slotLayouts]}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkbox-outline" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No se encontraron tareas.</Text>
          </View>
        }
      />

      {draggingTask && (
        <Animated.View
          style={[
            styles.floatingDragItem,
            {
              backgroundColor: colors.backgroundElement,
              borderColor: '#FF9500',
              borderWidth: 1.5,
              transform: dragPosition.getTranslateTransform()
            }
          ]}
        >
          <Ionicons name="grid-outline" size={14} color={colors.textSecondary} />
          <Text numberOfLines={1} style={styles.floatingDragText}>{draggingTask.title}</Text>
        </Animated.View>
      )}
      {/* TASK OPTIONS MODAL */}
      <Modal
        visible={selectedTaskOptions !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedTaskOptions(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setSelectedTaskOptions(null)}
        >
          <View 
            style={[styles.optionsModalContent, { backgroundColor: colors.backgroundElement }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderLine} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedTaskOptions?.title}
            </Text>
            
            <View style={{ gap: 12, marginTop: 16 }}>
              <Pressable
                onPress={() => {
                  const t = selectedTaskOptions;
                  setSelectedTaskOptions(null);
                  if (t) {
                    router.push({
                      pathname: '/session',
                      params: { taskId: t.id, duration: '30' }
                    });
                  }
                }}
                style={[styles.modalOptionBtn, { backgroundColor: colors.background }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(52, 120, 246, 0.15)' }]}>
                  <Ionicons name="play" size={22} color="#007AFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Iniciar Enfoque (30m)</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Comienza una sesión de enfoque de 30 minutos para esta tarea</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  const t = selectedTaskOptions;
                  setSelectedTaskOptions(null);
                  if (t) {
                    router.push({ pathname: '/editor', params: { id: t.id } });
                  }
                }}
                style={[styles.modalOptionBtn, { backgroundColor: colors.background }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
                  <Ionicons name="create" size={22} color="#FF9500" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Editar Tarea</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Modifica título, prioridad, horas o fecha</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  const t = selectedTaskOptions;
                  setSelectedTaskOptions(null);
                  if (t) {
                    setShowProgressRoadmap(t);
                  }
                }}
                style={[styles.modalOptionBtn, { backgroundColor: colors.background }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
                  <Ionicons name="analytics" size={22} color="#34C759" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Ver Progreso & Roadmap</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Revisa el historial de hitos y sesiones de enfoque</Text>
                </View>
              </Pressable>
            </View>

            <Pressable 
              onPress={() => setSelectedTaskOptions(null)}
              style={[styles.modalCloseBtn, { backgroundColor: colors.backgroundSelected }]}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* PROGRESS & ROADMAP MODAL */}
      <Modal
        visible={showProgressRoadmap !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProgressRoadmap(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowProgressRoadmap(null)}
        >
          <View 
            style={[styles.roadmapModalContent, { backgroundColor: colors.backgroundElement }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderLine} />
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 4 }]}>
              📈 Progreso de Tarea
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 12 }}>
              {showProgressRoadmap?.title}
            </Text>

            {showProgressRoadmap && (
              <ScrollView style={{ flex: 1, width: '100%' }} showsVerticalScrollIndicator={false}>
                {/* Current progress section */}
                <View style={{ marginBottom: 20 }}>
                  <EditableProgressBar
                    task={showProgressRoadmap}
                    colors={colors}
                    hourWeights={store.hourWeights || []}
                    onUpdate={async (newProgress) => {
                      await store.updateItems([showProgressRoadmap.id], {
                        progress: newProgress,
                        taskState: newProgress === 100 ? TaskState.COMPLETED : showProgressRoadmap.taskState
                      });
                      setShowProgressRoadmap(prev => prev ? { ...prev, progress: newProgress } : null);
                    }}
                  />
                </View>

                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 8, marginBottom: 12 }}>
                  🗺️ Roadmap de Pasos Concretos
                </Text>

                {(() => {
                  const taskSessions = store.sessions
                    .filter(s => s.taskId === showProgressRoadmap.id && s.endTime)
                    .sort((a, b) => new Date(a.endTime!).getTime() - new Date(b.endTime!).getTime()); // Chronological order!
                  console.log('[Roadmap] Task sessions for task:', showProgressRoadmap.id, JSON.stringify(taskSessions));

                  if (taskSessions.length === 0) {
                    return (
                      <View style={{ paddingVertical: 20, alignItems: 'center', backgroundColor: colors.background, borderRadius: 12 }}>
                        <Ionicons name="trail-sign-outline" size={32} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
                        <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', paddingHorizontal: 16 }}>
                          Aún no has registrado sesiones para esta tarea. El roadmap se construirá a medida que completes sesiones.
                        </Text>
                      </View>
                    );
                  }

                  return (
                    <View style={{ paddingLeft: 8 }}>
                      {taskSessions.map((session, index) => {
                        const dateStr = new Date(session.endTime!).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <View key={session.id} style={{ flexDirection: 'row', minHeight: 60 }}>
                            {/* Timeline Graphic */}
                            <View style={{ alignItems: 'center', marginRight: 12 }}>
                              <View style={{ 
                                width: 14, 
                                height: 14, 
                                borderRadius: 7, 
                                backgroundColor: '#34C759',
                                borderWidth: 2,
                                borderColor: colors.backgroundElement,
                                zIndex: 1 
                              }} />
                              {index < taskSessions.length - 1 && (
                                <View style={{ 
                                  flex: 1, 
                                  width: 2, 
                                  backgroundColor: colors.backgroundSelected,
                                  marginVertical: -2
                                }} />
                              )}
                            </View>

                            {/* Timeline content details */}
                            <View style={{ flex: 1, paddingBottom: 16, marginBottom: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700' }}>
                                  📅 {dateStr} • ⌛ {session.realDuration} min
                                </Text>
                                {session.progress !== undefined && session.progress !== null && (
                                  <View style={{ backgroundColor: 'rgba(52, 199, 89, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ color: '#34C759', fontSize: 9, fontWeight: '800' }}>
                                      📈 {session.progress}%
                                    </Text>
                                  </View>
                                )}
                              </View>
                              {session.nextStep ? (
                                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 6 }}>
                                  🎯 Paso: "{session.nextStep}"
                                </Text>
                              ) : (
                                <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic', marginTop: 6 }}>
                                  (Sesión completada sin especificar hito)
                                </Text>
                              )}
                              {session.notes ? (
                                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, fontStyle: 'italic', backgroundColor: colors.background, padding: 6, borderRadius: 8 }}>
                                  📝 Nota: {session.notes}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}
              </ScrollView>
            )}

            <Pressable 
              onPress={() => setShowProgressRoadmap(null)}
              style={[styles.modalCloseBtn, { backgroundColor: colors.backgroundSelected, marginTop: 16 }]}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cerrar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
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
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  filterSection: {
    paddingVertical: 8,
    gap: 8,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  horizontalFilters: {
    paddingHorizontal: 16,
    paddingVertical: 3,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  taskCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  checkboxContainer: {
    padding: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 8,
  },
  cardDetails: {
    padding: 14,
    borderTopWidth: 1,
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  utilityRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  utilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  utilityBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    marginVertical: 10,
  },
  commentsHeader: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  commentsList: {
    gap: 6,
    marginBottom: 10,
  },
  commentBubble: {
    padding: 8,
    borderRadius: 10,
  },
  row: {
    flexDirection: 'row',
  },
  noCommentsText: {
    fontSize: 12,
    marginBottom: 10,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchIcon: {
    marginRight: -26,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    paddingLeft: 32,
    paddingRight: 32,
    fontSize: 14,
  },
  searchClearBtn: {
    marginLeft: -26,
    zIndex: 1,
    padding: 4,
  },
  bulkEditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  bulkEditText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  // Calendar Widget Styles
  calendarWidgetCard: {
    borderRadius: 20,
    paddingTop: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  calendarWidgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  calendarHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarWidgetTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  calendarHeaderBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapSelectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  calendarSubTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 6,
  },
  calendarEmptySlots: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarConfigBtn: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 6,
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  timeColumn: {
    width: 48,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  timeLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeLabelLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
    borderRadius: 1,
  },
  slotBoxCard: {
    flex: 1,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 65,
  },
  slotNameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  calendarTaskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 6,
  },
  calendarTaskChipText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  shelfSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
    marginBottom: 8,
  },
  shelfSearchInput: {
    fontSize: 12,
    flex: 1,
    padding: 0,
  },
  shelfTaskCard: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: 'center',
  },
  shelfTaskText: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 130,
  },
  floatingDragItem: {
    position: 'absolute',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 99999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  floatingDragText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 160,
  },
  filtersCollapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    width: '100%',
  },
  roadmapModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeaderLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalCloseBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
});
