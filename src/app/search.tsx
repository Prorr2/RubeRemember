import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  SafeAreaView,
  useColorScheme,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore, Item, ItemType, Task, TaskState } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';
import { getTaskWeightLabel } from '@/engines/ScoreEngine';

export default function SearchScreen() {
  const store = useRememberStore();
  const router = useRouter();

  // Universal Modal States
  const [selectedTaskOptions, setSelectedTaskOptions] = useState<Task | null>(null);
  const [showProgressRoadmap, setShowProgressRoadmap] = useState<Task | null>(null);
  
  // Alarm Modal States
  const [alarmTask, setAlarmTask] = useState<Task | null>(null);
  const [alarmHour, setAlarmHour] = useState(new Date().getHours());
  const [alarmMinute, setAlarmMinute] = useState(new Date().getMinutes());

  // Roadmap Edit States
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editNextStep, setEditNextStep] = useState('');
  const [editProgress, setEditProgress] = useState('0');
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const handleScheduleSystemAlarm = async (taskTitle: string, hours: number, minutes: number) => {
    if (Platform.OS === 'android') {
      try {
        const IntentLauncher = require('expo-intent-launcher');
        await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
          extra: {
            'android.intent.extra.alarm.HOUR': hours,
            'android.intent.extra.alarm.MINUTES': minutes,
            'android.intent.extra.alarm.MESSAGE': taskTitle,
            'android.intent.extra.alarm.SKIP_UI': true,
          },
        });
        Alert.alert('Alarma Programada', `Se programó la alarma para hoy a las ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} para "${taskTitle}".`);
      } catch (err: any) {
        console.warn('Failed to start system alarm intent:', err);
        Alert.alert('Error', `No se pudo programar la alarma: ${err?.message || String(err)}`);
      }
    } else {
      Alert.alert('No soportado', 'La programación de alarmas del sistema con esta hora solo está soportada en Android.');
    }
  };

  const handleOpenAlarmDialog = (task: Task) => {
    const now = new Date();
    setAlarmHour(now.getHours());
    setAlarmMinute(now.getMinutes());
    setAlarmTask(task);
  };

  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todo' | 'tasks' | 'memos' | 'plans' | 'activities' | 'goals' | 'lists'>('todo');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Group search results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { tasks: [], activities: [], memos: [], plans: [], goals: [], lists: [] };

    const matchesText = (title: string = '', desc: string = '', tags: string[] = []) => {
      const titleMatch = title.toLowerCase().includes(q);
      const descMatch = (desc || '').toLowerCase().includes(q);
      const tagsMatch = (tags || []).some((t) => t.toLowerCase().includes(q));
      return titleMatch || descMatch || tagsMatch;
    };

    // 1. Filter Items from store
    const filteredItems = store.items.filter((item) => {
      if (item.trash) return false;
      if (item.archived && !includeArchived) return false;
      if (onlyFavorites && !item.favourite) return false;
      return matchesText(item.title, item.description, item.tags);
    });

    const tasks = filteredItems.filter((i) => i.type === ItemType.TASK);
    const activities = filteredItems.filter((i) => i.type === ItemType.ACTIVITY);
    const memos = filteredItems.filter((i) => i.type === ItemType.MEMO);
    const plans = filteredItems.filter((i) => i.type === ItemType.PLAN);

    // 2. Filter Goals
    const goals = store.goals.filter((g) => {
      if (onlyFavorites) return false;
      return g.title.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q));
    });

    // 3. Filter Lists
    const lists = store.lists.filter((l) => {
      if (onlyFavorites) return false;
      const listNameMatch = l.name.toLowerCase().includes(q);
      const itemMatch = l.items.some((it) => it.text.toLowerCase().includes(q));
      return listNameMatch || itemMatch;
    });

    return { tasks, activities, memos, plans, goals, lists };
  }, [query, store.items, store.goals, store.lists, onlyFavorites, includeArchived]);

  const hasResults =
    results.tasks.length > 0 ||
    results.activities.length > 0 ||
    results.memos.length > 0 ||
    results.plans.length > 0 ||
    results.goals.length > 0 ||
    results.lists.length > 0;

  const navigateToItem = (item: Item) => {
    if (item.type === ItemType.TASK) {
      setSelectedTaskOptions(item as Task);
    } else {
      router.push({
        pathname: '/editor',
        params: { id: item.id, type: item.type },
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Search Box */}
      <View style={[styles.header, { borderBottomColor: colors.backgroundSelected }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={[styles.searchBox, { backgroundColor: colors.backgroundElement }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder="Buscar en RubeRemember..."
            placeholderTextColor={colors.textSecondary + '80'}
            value={query}
            onChangeText={setQuery}
            autoFocus
            style={[styles.searchInput, { color: colors.text }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Horizontal Scroll */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'todo', label: 'Todo', icon: 'apps-outline' },
            { id: 'tasks', label: 'Tareas', icon: 'checkbox-outline' },
            { id: 'memos', label: 'Recordatorios', icon: 'bookmark-outline' },
            { id: 'plans', label: 'Planes', icon: 'compass-outline' },
            { id: 'activities', label: 'Ocio', icon: 'sparkles-outline' },
            { id: 'goals', label: 'Roadmaps', icon: 'trophy-outline' },
            { id: 'lists', label: 'Listas', icon: 'list-outline' },
          ].map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setActiveFilter(f.id as any)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.text : colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
              >
                <Ionicons name={f.icon as any} size={15} color={isActive ? colors.background : colors.text} />
                <Text style={[styles.filterChipText, { color: isActive ? colors.background : colors.text }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Advanced Toggles */}
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setOnlyFavorites(!onlyFavorites)}
          style={[
            styles.toggleChip,
            onlyFavorites && { backgroundColor: 'rgba(255, 45, 85, 0.15)', borderColor: '#FF2D55' },
          ]}
        >
          <Ionicons name="star" size={14} color={onlyFavorites ? '#FF2D55' : colors.textSecondary} />
          <Text style={[styles.toggleText, { color: onlyFavorites ? '#FF2D55' : colors.text }]}>
            Sólo Favoritos
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setIncludeArchived(!includeArchived)}
          style={[
            styles.toggleChip,
            includeArchived && { backgroundColor: 'rgba(0, 122, 255, 0.15)', borderColor: '#007AFF' },
          ]}
        >
          <Ionicons name="archive" size={14} color={includeArchived ? '#007AFF' : colors.textSecondary} />
          <Text style={[styles.toggleText, { color: includeArchived ? '#007AFF' : colors.text }]}>
            Incluir Archivados
          </Text>
        </Pressable>
      </View>

      {/* Results Container */}
      <ScrollView contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
        {!query.trim() ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              Escribe algo arriba para buscar en tu cerebro
            </Text>
          </View>
        ) : !hasResults ? (
          <View style={styles.emptyState}>
            <Ionicons name="warning-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No se encontraron resultados
            </Text>
          </View>
        ) : (
          <View style={{ gap: 24 }}>
            {/* TASKS */}
            {(activeFilter === 'todo' || activeFilter === 'tasks') && results.tasks.length > 0 && (
              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>TAREAS ({results.tasks.length})</Text>
                <View style={styles.groupContent}>
                  {results.tasks.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => navigateToItem(item)}
                      style={[styles.resultCard, { backgroundColor: colors.backgroundElement }]}
                    >
                      <View style={styles.resultHeader}>
                        <Ionicons name="checkbox" size={20} color="#FF9500" />
                        <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                      </View>
                      {item.description ? (
                        <Text style={[styles.resultDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* MEMOS */}
            {(activeFilter === 'todo' || activeFilter === 'memos') && results.memos.length > 0 && (
              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>RECORDATORIOS ({results.memos.length})</Text>
                <View style={styles.groupContent}>
                  {results.memos.map((item) => (
                    <Pressable
                       key={item.id}
                       onPress={() => navigateToItem(item)}
                       style={[styles.resultCard, { backgroundColor: colors.backgroundElement }]}
                    >
                      <View style={styles.resultHeader}>
                        <Ionicons name="bookmark" size={20} color="#00C7BE" />
                        <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                      </View>
                      {item.description ? (
                        <Text style={[styles.resultDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* PLANS */}
            {(activeFilter === 'todo' || activeFilter === 'plans') && results.plans.length > 0 && (
              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>PLANES ({results.plans.length})</Text>
                <View style={styles.groupContent}>
                  {results.plans.map((item) => (
                    <Pressable
                       key={item.id}
                       onPress={() => navigateToItem(item)}
                       style={[styles.resultCard, { backgroundColor: colors.backgroundElement }]}
                    >
                      <View style={styles.resultHeader}>
                        <Ionicons name="compass" size={20} color="#BF5AF2" />
                        <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                      </View>
                      {item.description ? (
                        <Text style={[styles.resultDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* ACTIVITIES */}
            {(activeFilter === 'todo' || activeFilter === 'activities') && results.activities.length > 0 && (
              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>OCIO ({results.activities.length})</Text>
                <View style={styles.groupContent}>
                  {results.activities.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => navigateToItem(item)}
                      style={[styles.resultCard, { backgroundColor: colors.backgroundElement }]}
                    >
                      <View style={styles.resultHeader}>
                        <Ionicons name="sparkles" size={20} color="#5856D6" />
                        <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                      </View>
                      {item.description ? (
                        <Text style={[styles.resultDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* GOALS */}
            {(activeFilter === 'todo' || activeFilter === 'goals') && results.goals.length > 0 && (
              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>ROADMAPS ({results.goals.length})</Text>
                <View style={styles.groupContent}>
                  {results.goals.map((goal) => (
                    <Pressable
                      key={goal.id}
                      onPress={() => router.push('/goals')}
                      style={[styles.resultCard, { backgroundColor: colors.backgroundElement }]}
                    >
                      <View style={styles.resultHeader}>
                        <Ionicons name="trophy" size={20} color="#FF2D55" />
                        <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                          {goal.title}
                        </Text>
                      </View>
                      {goal.description ? (
                        <Text style={[styles.resultDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {goal.description}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* LISTS */}
            {(activeFilter === 'todo' || activeFilter === 'lists') && results.lists.length > 0 && (
              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>LISTAS ({results.lists.length})</Text>
                <View style={styles.groupContent}>
                  {results.lists.map((list) => (
                    <Pressable
                      key={list.id}
                      onPress={() => router.push('/lists')}
                      style={[styles.resultCard, { backgroundColor: colors.backgroundElement }]}
                    >
                      <View style={styles.resultHeader}>
                        <Ionicons name="list" size={20} color="#34C759" />
                        <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                          {list.name}
                        </Text>
                      </View>
                      <Text style={[styles.resultDesc, { color: colors.textSecondary }]}>
                        {list.items.length} {list.items.length === 1 ? 'elemento' : 'elementos'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* TASK OPTIONS MODAL */}
      <Modal
        visible={selectedTaskOptions !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedTaskOptions(null)}
      >
        <Pressable 
          style={styles.bottomModalOverlay}
          onPress={() => setSelectedTaskOptions(null)}
        >
          <View 
            style={[styles.optionsModalContent, { backgroundColor: colors.backgroundElement }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.bottomModalHeaderLine} />
            <Text style={[styles.bottomModalTitle, { color: colors.text }]}>
              {selectedTaskOptions?.title}
            </Text>
            
            <View style={{ gap: 12, marginTop: 16 }}>
              {(() => {
                const t = selectedTaskOptions;
                if (!t) return null;
                const weightLabel = getTaskWeightLabel(t.estimatedHours, store.hourWeights).toLowerCase();
                let dur = 30;
                if (weightLabel === 'luna') {
                  dur = store.userSettings.lunaDuration || 30;
                } else if (weightLabel === 'terra') {
                  dur = store.userSettings.terraDuration || 45;
                } else if (weightLabel === 'sol') {
                  dur = store.userSettings.solDuration || 90;
                } else if (weightLabel === 'astra') {
                  dur = store.userSettings.astraDuration || 20;
                }

                return (
                  <Pressable
                    onPress={() => {
                      setSelectedTaskOptions(null);
                      router.push({
                        pathname: '/session',
                        params: { taskId: t.id, duration: String(dur) }
                      });
                    }}
                    style={[styles.bottomModalOptionBtn, { backgroundColor: colors.background }]}
                  >
                    <View style={[styles.bottomModalIconCircle, { backgroundColor: 'rgba(52, 120, 246, 0.15)' }]}>
                      <Ionicons name="play" size={22} color="#007AFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bottomModalOptionTitle, { color: colors.text }]}>Iniciar Enfoque ({dur}m)</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Comienza una sesión de enfoque de {dur} minutos para esta tarea</Text>
                    </View>
                  </Pressable>
                );
              })()}

              <Pressable
                onPress={() => {
                  const t = selectedTaskOptions;
                  setSelectedTaskOptions(null);
                  if (t) {
                    router.push({ pathname: '/editor', params: { id: t.id, type: t.type } });
                  }
                }}
                style={[styles.bottomModalOptionBtn, { backgroundColor: colors.background }]}
              >
                <View style={[styles.bottomModalIconCircle, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
                  <Ionicons name="create" size={22} color="#FF9500" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bottomModalOptionTitle, { color: colors.text }]}>Editar Tarea</Text>
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
                style={[styles.bottomModalOptionBtn, { backgroundColor: colors.background }]}
              >
                <View style={[styles.bottomModalIconCircle, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
                  <Ionicons name="analytics" size={22} color="#34C759" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bottomModalOptionTitle, { color: colors.text }]}>Ver Progreso & Roadmap</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Revisa el historial de hitos y sesiones de enfoque</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  const t = selectedTaskOptions;
                  setSelectedTaskOptions(null);
                  if (t) {
                    handleOpenAlarmDialog(t);
                  }
                }}
                style={[styles.bottomModalOptionBtn, { backgroundColor: colors.background }]}
              >
                <View style={[styles.bottomModalIconCircle, { backgroundColor: 'rgba(255, 59, 48, 0.15)' }]}>
                  <Ionicons name="alarm-outline" size={22} color="#FF3B30" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bottomModalOptionTitle, { color: colors.text }]}>Fijar Alarma</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Programa una alarma del sistema para esta tarea hoy</Text>
                </View>
              </Pressable>
            </View>

            <Pressable 
              onPress={() => setSelectedTaskOptions(null)}
              style={[styles.bottomModalCloseBtn, { backgroundColor: colors.backgroundSelected, marginTop: 16 }]}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ALARM PROGRAMMING MODAL */}
      <Modal
        visible={alarmTask !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAlarmTask(null)}
      >
        <Pressable 
          style={styles.bottomModalOverlay}
          onPress={() => setAlarmTask(null)}
        >
          <View 
            style={[styles.optionsModalContent, { backgroundColor: colors.backgroundElement }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.bottomModalHeaderLine} />
            <Text style={[styles.bottomModalTitle, { color: colors.text, marginBottom: 8 }]}>
              Programar Alarma del Sistema
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
              Fijar para hoy para: "{alarmTask?.title}"
            </Text>

            {/* Time Pickers (Increment/Decrement style) */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 30 }}>
              {/* Hour control */}
              <View style={{ alignItems: 'center' }}>
                <Pressable
                  onPress={() => setAlarmHour((h) => (h + 1) % 24)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.backgroundSelected,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8
                  }}
                >
                  <Ionicons name="chevron-up" size={24} color={colors.text} />
                </Pressable>
                <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text }}>
                  {alarmHour.toString().padStart(2, '0')}
                </Text>
                <Pressable
                  onPress={() => setAlarmHour((h) => (h - 1 + 24) % 24)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.backgroundSelected,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 8
                  }}
                >
                  <Ionicons name="chevron-down" size={24} color={colors.text} />
                </Pressable>
              </View>

              <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text, marginBottom: 8 }}>:</Text>

              {/* Minute control */}
              <View style={{ alignItems: 'center' }}>
                <Pressable
                  onPress={() => setAlarmMinute((m) => (m + 5) % 60)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.backgroundSelected,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8
                  }}
                >
                  <Ionicons name="chevron-up" size={24} color={colors.text} />
                </Pressable>
                <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text }}>
                  {alarmMinute.toString().padStart(2, '0')}
                </Text>
                <Pressable
                  onPress={() => setAlarmMinute((m) => (m - 5 + 60) % 60)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.backgroundSelected,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 8
                  }}
                >
                  <Ionicons name="chevron-down" size={24} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <View style={{ gap: 12, width: '100%' }}>
              <Pressable
                onPress={async () => {
                  if (alarmTask) {
                    await handleScheduleSystemAlarm(alarmTask.title, alarmHour, alarmMinute);
                    setAlarmTask(null);
                  }
                }}
                style={[styles.bottomModalOptionBtn, { backgroundColor: '#FF3B30', justifyContent: 'center', height: 50 }]}
              >
                <Ionicons name="alarm" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 }}>
                  Programar Alarma
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setAlarmTask(null)}
                style={[styles.bottomModalCloseBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
              </Pressable>
            </View>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.bottomModalOverlay}
        >
          <Pressable 
            style={StyleSheet.absoluteFill}
            onPress={() => setShowProgressRoadmap(null)}
          />
          <View 
            style={[styles.roadmapModalContent, { backgroundColor: colors.backgroundElement }]}
          >
            <View style={styles.bottomModalHeaderLine} />
            <Text style={[styles.bottomModalTitle, { color: colors.text, marginBottom: 4 }]}>
              🗺️ Historial y Roadmap de la Tarea
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 16 }}>
              {showProgressRoadmap?.title}
            </Text>

            {showProgressRoadmap && (
              <ScrollView 
                style={{ flex: 1, width: '100%' }} 
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              >
                <View style={{ gap: 10, marginBottom: 12 }}>
                  {showAddNote ? (
                    <>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>📝 Nueva Nota</Text>
                      <TextInput
                        value={newNoteText}
                        onChangeText={setNewNoteText}
                        placeholder="Escribe una nota sobre esta tarea..."
                        placeholderTextColor={colors.textSecondary + '70'}
                        autoFocus
                        multiline
                        style={{
                          color: colors.text,
                          backgroundColor: colors.background,
                          borderColor: colors.backgroundSelected,
                          borderWidth: 1,
                          borderRadius: 12,
                          padding: 10,
                          fontSize: 13,
                          minHeight: 60,
                          textAlignVertical: 'top'
                        }}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={async () => {
                            const text = newNoteText.trim();
                            if (text && showProgressRoadmap) {
                              await store.createSession(showProgressRoadmap.id, 0, text);
                            }
                            setNewNoteText('');
                            setShowAddNote(false);
                          }}
                          style={{ flex: 1, backgroundColor: '#FF9500', padding: 12, borderRadius: 10, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Guardar Nota</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setNewNoteText('');
                            setShowAddNote(false);
                          }}
                          style={{ flex: 1, backgroundColor: colors.backgroundSelected, padding: 12, borderRadius: 10, alignItems: 'center' }}
                        >
                          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <Pressable
                      onPress={() => setShowAddNote(true)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        backgroundColor: 'rgba(255, 149, 0, 0.12)',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 149, 0, 0.4)',
                        borderStyle: 'dashed',
                        borderRadius: 12,
                        paddingVertical: 12
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#FF9500" />
                      <Text style={{ color: '#FF9500', fontSize: 13, fontWeight: '700' }}>Añadir Nota</Text>
                    </Pressable>
                  )}
                </View>

                {(() => {
                  const taskSessions = store.sessions
                    .filter(s => String(s.taskId) === String(showProgressRoadmap.id))
                    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

                  if (taskSessions.length === 0) {
                    return (
                      <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="trail-sign-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
                        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 }}>
                          Aún no hay sesiones registradas en el roadmap de esta tarea.
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', paddingHorizontal: 24, marginTop: 8, opacity: 0.7 }}>
                          Completa una sesión de enfoque o añade una nota para comenzar a construir el roadmap.
                        </Text>
                      </View>
                    );
                  }

                  return (
                    <View style={{ gap: 16, paddingHorizontal: 4 }}>
                      {taskSessions.map((session) => {
                        const sessionDate = session.endTime || session.startTime || session.createdAt;
                        const dateStr = sessionDate
                          ? new Date(sessionDate).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Fecha desconocida';

                        const isEditing = editingSessionId === session.id;
                        const isNoteOnly = !session.realDuration && !session.plannedDuration;

                        return (
                          <View 
                            key={session.id} 
                            style={{ 
                              backgroundColor: colors.background, 
                              borderRadius: 16, 
                              padding: 16, 
                              borderWidth: 1, 
                              borderColor: colors.backgroundSelected,
                              gap: 12
                            }}
                          >
                            {/* Header row with date and duration */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.backgroundSelected, paddingBottom: 8 }}>
                              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                                📅 {dateStr}
                              </Text>
                              {isNoteOnly ? (
                                <View style={{ backgroundColor: 'rgba(0, 122, 255, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                  <Text style={{ color: '#007AFF', fontSize: 10, fontWeight: '800' }}>
                                    📝 Nota
                                  </Text>
                                </View>
                              ) : (
                                <View style={{ backgroundColor: 'rgba(255, 149, 0, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                  <Text style={{ color: '#FF9500', fontSize: 10, fontWeight: '800' }}>
                                    ⏱️ {session.realDuration || session.plannedDuration} min
                                  </Text>
                                </View>
                              )}
                            </View>

                            {isEditing ? (
                              <View style={{ gap: 10 }}>
                                <View style={{ gap: 4 }}>
                                  <Text style={{ color: '#34C759', fontSize: 11, fontWeight: '800' }}>¿QUÉ SE HIZO?</Text>
                                  <TextInput
                                    value={editNotes}
                                    onChangeText={setEditNotes}
                                    placeholder="Escribe qué hiciste..."
                                    placeholderTextColor={colors.textSecondary + '70'}
                                    style={{
                                      color: colors.text,
                                      backgroundColor: colors.backgroundSelected,
                                      borderRadius: 8,
                                      padding: 8,
                                      fontSize: 13,
                                      minHeight: 50,
                                      textAlignVertical: 'top'
                                    }}
                                    multiline
                                  />
                                </View>

                                <View style={{ gap: 4 }}>
                                  <Text style={{ color: '#FF9500', fontSize: 11, fontWeight: '800' }}>SIGUIENTE PASO PLANIFICADO</Text>
                                  <TextInput
                                    value={editNextStep}
                                    onChangeText={setEditNextStep}
                                    placeholder="Escribe el siguiente paso..."
                                    placeholderTextColor={colors.textSecondary + '70'}
                                    style={{
                                      color: colors.text,
                                      backgroundColor: colors.backgroundSelected,
                                      borderRadius: 8,
                                      padding: 8,
                                      fontSize: 13
                                    }}
                                  />
                                </View>

                                <View style={{ gap: 4 }}>
                                  <Text style={{ color: '#007AFF', fontSize: 11, fontWeight: '800' }}>PROGRESO DE LA TAREA (%)</Text>
                                  <TextInput
                                    value={editProgress}
                                    onChangeText={(val) => {
                                      const cleaned = val.replace(/[^0-9]/g, '');
                                      if (cleaned === '') {
                                        setEditProgress('');
                                      } else {
                                        const num = parseInt(cleaned, 10);
                                        setEditProgress(String(Math.min(100, Math.max(0, num))));
                                      }
                                    }}
                                    keyboardType="number-pad"
                                    maxLength={3}
                                    style={{
                                      color: colors.text,
                                      backgroundColor: colors.backgroundSelected,
                                      borderRadius: 8,
                                      padding: 8,
                                      fontSize: 13
                                    }}
                                  />
                                </View>

                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                                  <Pressable
                                    onPress={async () => {
                                      const prog = parseInt(editProgress, 10) || 0;
                                      await store.updateSession(session.id, {
                                        notes: editNotes.trim(),
                                        nextStep: editNextStep.trim(),
                                        progress: prog
                                      });

                                      if (taskSessions[0]?.id === session.id) {
                                        await store.updateItem(showProgressRoadmap.id, {
                                          progress: prog,
                                          nextStep: editNextStep.trim(),
                                          completed: prog === 100,
                                          taskState: prog === 100 ? TaskState.COMPLETED : TaskState.IN_PROGRESS
                                        });
                                        setShowProgressRoadmap(prev => prev ? {
                                          ...prev,
                                          progress: prog,
                                          nextStep: editNextStep.trim(),
                                          completed: prog === 100
                                        } : null);
                                      }

                                      setEditingSessionId(null);
                                    }}
                                    style={{
                                      flex: 1,
                                      backgroundColor: '#34C759',
                                      padding: 10,
                                      borderRadius: 8,
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Guardar</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => setEditingSessionId(null)}
                                    style={{
                                      flex: 1,
                                      backgroundColor: colors.backgroundSelected,
                                      padding: 10,
                                      borderRadius: 8,
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>Cancelar</Text>
                                  </Pressable>
                                </View>
                              </View>
                            ) : (
                              <>
                                {/* What was done */}
                                <View style={{ gap: 4 }}>
                                  <Text style={{ color: '#34C759', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                                    {isNoteOnly ? '📝 Nota' : '✅ ¿Qué se hizo?'}
                                  </Text>
                                  {session.notes ? (
                                    <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
                                      {session.notes}
                                    </Text>
                                  ) : (
                                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                                      No especificado
                                    </Text>
                                  )}
                                </View>

                                {/* What to do next */}
                                {!isNoteOnly && (
                                  <View style={{ gap: 4 }}>
                                    <Text style={{ color: '#FF9500', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                                      🎯 Siguiente hito / paso planificado:
                                    </Text>
                                    {session.nextStep ? (
                                      <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
                                        {session.nextStep}
                                      </Text>
                                    ) : (
                                      <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                                        No especificado
                                      </Text>
                                    )}
                                  </View>
                                )}

                                {/* Progress Percentage */}
                                {!isNoteOnly && (
                                  <View style={{ gap: 4 }}>
                                    <Text style={{ color: '#007AFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                                      📈 Progreso de la tarea:
                                    </Text>
                                    <Text style={{ color: colors.text, fontSize: 13 }}>
                                      {session.progress !== undefined ? `${session.progress}%` : '0%'}
                                    </Text>
                                  </View>
                                )}

                                {/* Actions row */}
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, borderTopWidth: 1, borderTopColor: colors.backgroundSelected, paddingTop: 10, marginTop: 4 }}>
                                  <Pressable
                                    onPress={() => {
                                      setEditingSessionId(session.id);
                                      setEditNotes(session.notes || '');
                                      setEditNextStep(session.nextStep || '');
                                      setEditProgress(String(session.progress || 0));
                                    }}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                  >
                                    <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Editar</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => {
                                      Alert.alert(
                                        'Eliminar bloque de progreso',
                                        '¿Estás seguro de que deseas eliminar este bloque de progreso del roadmap? Esta acción no se puede deshacer.',
                                        [
                                          { text: 'Cancelar', style: 'cancel' },
                                          {
                                            text: 'Eliminar',
                                            style: 'destructive',
                                            onPress: async () => {
                                              await store.deleteSession(session.id);
                                            }
                                          }
                                        ]
                                      );
                                    }}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                  >
                                    <Ionicons name="trash-outline" size={14} color="#FF3B30" />
                                    <Text style={{ color: '#FF3B30', fontSize: 12, fontWeight: '600' }}>Eliminar</Text>
                                  </Pressable>
                                </View>
                              </>
                            )}
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
              style={[styles.bottomModalCloseBtn, { backgroundColor: colors.backgroundSelected, marginTop: 16 }]}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cerrar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  clearButton: {
    padding: 2,
  },
  filterContainer: {
    paddingVertical: 12,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    gap: 4,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resultsContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    paddingVertical: 100,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '75%',
  },
  group: {
    gap: 8,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  groupContent: {
    gap: 10,
  },
  resultCard: {
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  resultDesc: {
    fontSize: 13,
    lineHeight: 17,
  },
  bottomModalOverlay: {
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
    height: '75%',
  },
  bottomModalHeaderLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  bottomModalOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  bottomModalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomModalOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  bottomModalCloseBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
