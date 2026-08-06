import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore, ItemType, Priority, Task, EnergyType, getLocalDateStr } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

export default function TasksScreen() {
  const store = useRememberStore();
  const router = useRouter();
  
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  // Filters
  const [filterPriorities, setFilterPriorities] = useState<Priority[]>([]);
  const [filterGoalId, setFilterGoalId] = useState<string>('ALL');
  const [filterWeightIds, setFilterWeightIds] = useState<string[]>([]);
  const [filterEnergyTypes, setFilterEnergyTypes] = useState<EnergyType[]>([]);
  const [filterDateRange, setFilterDateRange] = useState<'ALL' | 'TODAY_OVERDUE' | 'WEEK' | 'MONTH' | 'FUTURE' | 'UNSCHEDULED'>('ALL');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'PENDING' | 'COMPLETED' | 'ARCHIVED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    // 1. Closest completion date (earliest dueDate first; undated tasks go to the end)
    // 2. Priority (HIGH -> MEDIUM -> LOW)
    // 3. Newest first (createdAt)
    return list.sort((a, b) => {
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

      const weights = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const wA = weights[a.priority] || 2;
      const wB = weights[b.priority] || 2;
      if (wA !== wB) return wB - wA;
      
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [store.items, store.hourWeights, filterPriorities, filterGoalId, filterWeightIds, filterEnergyTypes, filterDateRange, taskStatusFilter, searchQuery]);

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
      item.priority === Priority.HIGH ? '#FF3B30' : item.priority === Priority.MEDIUM ? '#FF9500' : '#34C759';

    const isSelected = selectedIds.includes(item.id);

    return (
      <Pressable
        onLongPress={() => handleToggleSelect(item.id)}
        onPress={() => {
          if (selectedIds.length > 0) {
            handleToggleSelect(item.id);
          } else {
            setExpandedTaskId(isExpanded ? null : item.id);
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
                  {item.priority}
                </Text>
              </Pressable>

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

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        {/* Status Filter */}
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
          {([Priority.HIGH, Priority.MEDIUM, Priority.LOW] as Priority[]).map((p) => {
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
                <Text style={[styles.filterChipText, { color: isActive && selectedIds.length === 0 ? '#fff' : colors.text }]}>{p}</Text>
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

      <FlatList
        data={tasksList}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        extraData={selectedIds}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkbox-outline" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No se encontraron tareas.</Text>
          </View>
        }
      />
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
});
