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

import { useRememberStore, ItemType, Priority, Task } from '@/hooks/use-remember-store';
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
  const [showCompleted, setShowCompleted] = useState(false);
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
    let list = store.getTasks();
    if (!showCompleted) {
      list = list.filter((t) => !t.completed);
    } else {
      list = list.filter((t) => t.completed);
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => 
        t.title.toLowerCase().includes(q) || 
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Sort by priority (HIGH -> MEDIUM -> LOW) then date
    return list.sort((a, b) => {
      const weights = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const wA = weights[a.priority] || 2;
      const wB = weights[b.priority] || 2;
      if (wA !== wB) return wB - wA;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [store.items, store.hourWeights, filterPriorities, filterGoalId, filterWeightIds, showCompleted, searchQuery]);

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
            for (const id of selectedIds) {
              await store.deleteItem(id);
            }
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
            <Pressable
              onPress={() => handleToggleSelect(item.id)}
              style={styles.checkboxContainer}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={24}
                color={isSelected ? '#FF9500' : colors.textSecondary}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={async () => {
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
                onPress={() => handleChangePriority(item)}
                style={({ pressed }) => [
                  styles.priorityBadge,
                  { backgroundColor: priorityColor + '20', opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={{ color: priorityColor, fontSize: 10, fontWeight: '700' }}>
                  {item.priority}
                </Text>
              </Pressable>

              {item.estimatedHours ? (
                <>
                  <View style={[styles.metaBadge, { backgroundColor: colors.backgroundSelected }]}>
                    <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}>
                      ⌛ {item.estimatedHours}h
                    </Text>
                  </View>
                  {(() => {
                    const sortedWeights = [...store.hourWeights].sort((a, b) => b.minHours - a.minHours);
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
            <Pressable
              onPress={() => router.push({ pathname: '/editor', params: { id: item.id } })}
              style={styles.actionBtn}
            >
              <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => setExpandedTaskId(isExpanded ? null : item.id)}
              style={styles.actionBtn}
            >
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            </Pressable>
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
              <Pressable
                onPress={() => handleArchiveTask(item)}
                style={[styles.utilityBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                <Ionicons name="archive-outline" size={16} color={colors.text} />
                <Text style={[styles.utilityBtnText, { color: colors.text }]}>Archivar</Text>
              </Pressable>
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
            onPress={() => setShowCompleted(false)}
            style={[styles.tabBtn, !showCompleted && { borderBottomColor: '#FF9500', borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: !showCompleted ? '#FF9500' : colors.textSecondary }]}>Pendientes</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowCompleted(true)}
            style={[styles.tabBtn, showCompleted && { borderBottomColor: '#FF9500', borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: showCompleted ? '#FF9500' : colors.textSecondary }]}>Completadas</Text>
          </Pressable>
        </View>

        {/* Priority Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalFilters}>
          <Pressable
            onPress={() => setFilterPriorities([])}
            style={[
              styles.filterChip,
              filterPriorities.length === 0 ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement }
            ]}
          >
            <Text style={[styles.filterChipText, { color: filterPriorities.length === 0 ? '#fff' : colors.text }]}>Todas</Text>
          </Pressable>
          {([Priority.HIGH, Priority.MEDIUM, Priority.LOW] as Priority[]).map((p) => {
            const isActive = filterPriorities.includes(p);
            return (
              <Pressable
                key={p}
                onPress={() => {
                  if (isActive) {
                    setFilterPriorities(filterPriorities.filter((x) => x !== p));
                  } else {
                    setFilterPriorities([...filterPriorities, p]);
                  }
                }}
                style={[
                  styles.filterChip,
                  isActive ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement },
                ]}
              >
                <Text style={[styles.filterChipText, { color: isActive ? '#fff' : colors.text }]}>{p}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Weight Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalFilters} style={{ marginTop: -2 }}>
          <Pressable
            onPress={() => setFilterWeightIds([])}
            style={[
              styles.filterChip,
              filterWeightIds.length === 0 ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement }
            ]}
          >
            <Text style={[styles.filterChipText, { color: filterWeightIds.length === 0 ? '#fff' : colors.text }]}>Todos los pesos</Text>
          </Pressable>
          {store.hourWeights.map((w) => {
            const isActive = filterWeightIds.includes(w.id);
            return (
              <Pressable
                key={w.id}
                onPress={() => {
                  if (isActive) {
                    setFilterWeightIds(filterWeightIds.filter((x) => x !== w.id));
                  } else {
                    setFilterWeightIds([...filterWeightIds, w.id]);
                  }
                }}
                style={[
                  styles.filterChip,
                  isActive ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.backgroundElement }
                ]}
              >
                <Text style={[styles.filterChipText, { color: isActive ? '#fff' : colors.text }]}>{w.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={tasksList}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
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
});
