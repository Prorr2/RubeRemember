import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore, ItemType, Task, Reminder as ReminderV2, Activity, getLocalDateStr } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

export default function DecisionCenterScreen() {
  const store = useRememberStore();
  const router = useRouter();
  
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  // Quick Input text
  const [quickInput, setQuickInput] = useState('');

  // 1. Dynamic Greeting based on hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días!';
    if (hour < 20) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  }, []);

  // 2. Focus Card (Highest priority, uncompleted Task)
  const focusTask = useMemo(() => {
    const tasks = store.getTasks().filter((t) => !t.completed);
    if (tasks.length === 0) return null;
    
    // Sort tasks: High priority first, then estimatedHours desc, then oldest
    return [...tasks].sort((a, b) => {
      const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const weightA = priorityWeight[a.priority] || 2;
      const weightB = priorityWeight[b.priority] || 2;
      if (weightA !== weightB) return weightB - weightA;
      return a.createdAt.localeCompare(b.createdAt);
    })[0];
  }, [store.items]);

  // 3. Today's Alarms
  const todayReminders = useMemo(() => {
    return store.getTodayReminders().filter((r) => !r.completed).slice(0, 3);
  }, [store.items]);

  // 4. Activity Suggestion
  const [randomSuggestionIndex, setRandomSuggestionIndex] = useState(0);
  
  const suggestedActivity = useMemo(() => {
    const suggestions = store.getSuggestedActivities();
    if (suggestions.length === 0) return null;
    return suggestions[randomSuggestionIndex % suggestions.length];
  }, [store.items, randomSuggestionIndex]);

  const handleNextSuggestion = () => {
    setRandomSuggestionIndex((prev) => prev + 1);
  };

  // Helper stats
  const pendingTasksCount = useMemo(() => store.getTasks().filter((t) => !t.completed).length, [store.items]);
  const activeAlarmsCount = useMemo(() => store.getReminders().filter((r) => !r.completed).length, [store.items]);
  const trashCount = useMemo(() => store.getTrashItems().length, [store.items]);

  const handleQuickCreate = (type: ItemType) => {
    const txt = quickInput.trim();
    if (!txt) {
      Alert.alert('Escribe algo', 'Por favor ingresa un título en la barra inferior primero.');
      return;
    }
    setQuickInput('');
    router.push({
      pathname: '/editor',
      params: { type, id: undefined, title: txt },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting}</Text>
          <Text style={[styles.title, { color: colors.text }]}>RubeRemember</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => router.push('/search')} style={[styles.iconButton, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => router.push('/backup')} style={[styles.iconButton, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Dynamic Stats Banner */}
        <View style={[styles.statsBanner, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#FF9500' }]}>{pendingTasksCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tareas</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.backgroundSelected }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#007AFF' }]}>{activeAlarmsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Alarmas</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.backgroundSelected }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#34C759' }]}>{store.getActivities().length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ocio</Text>
          </View>
        </View>

        {/* 1. FOCUS CARD (Siguiente Tarea / Foco) */}
        <View style={[styles.sectionContainer]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📌 Mi Enfoque Actual</Text>
            <Pressable onPress={() => router.push('/tasks')}>
              <Text style={{ color: '#FF9500', fontWeight: '600', fontSize: 13 }}>Ver todas</Text>
            </Pressable>
          </View>

          {focusTask ? (
            <Pressable
              onPress={() => router.push({ pathname: '/editor', params: { id: focusTask.id } })}
              style={[styles.focusCard, { backgroundColor: colors.backgroundElement, borderColor: '#FF9500' }]}
            >
              <View style={styles.focusHeader}>
                <View style={[styles.priorityBadge, { backgroundColor: focusTask.priority === 'HIGH' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 149, 0, 0.15)' }]}>
                  <Text style={[styles.priorityBadgeText, { color: focusTask.priority === 'HIGH' ? '#FF3B30' : '#FF9500' }]}>
                    Prioridad {focusTask.priority === 'HIGH' ? 'Alta' : focusTask.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                  </Text>
                </View>
                {focusTask.estimatedHours && (
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                    ⌛ {focusTask.estimatedHours}h est.
                  </Text>
                )}
              </View>

              <Text style={[styles.focusTitle, { color: colors.text }]} numberOfLines={2}>
                {focusTask.title}
              </Text>
              
              {focusTask.description ? (
                <Text style={[styles.focusDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {focusTask.description}
                </Text>
              ) : null}

              {/* Goal information */}
              {focusTask.goalId && (
                <View style={styles.goalInfoContainer}>
                  <Ionicons name="trophy-outline" size={14} color="#FF9500" />
                  <Text style={[styles.goalInfoText, { color: colors.textSecondary }]} numberOfLines={1}>
                    Objetivo: {store.goals.find((g) => g.id === focusTask.goalId)?.title || 'Cargando...'}
                  </Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Pressable
                  onPress={async () => {
                    await store.toggleItemCompleted(focusTask.id);
                  }}
                  style={[styles.completeButton, { backgroundColor: '#FF9500' }]}
                >
                  <Ionicons name="checkmark-done" size={16} color="#fff" />
                  <Text style={styles.completeButtonText}>Completar</Text>
                </Pressable>
              </View>
            </Pressable>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="checkbox-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
                No tienes tareas pendientes. ¡Buen trabajo!
              </Text>
              <Pressable
                onPress={() => router.push({ pathname: '/editor', params: { type: ItemType.TASK } })}
                style={[styles.emptyCardBtn, { borderColor: '#FF9500' }]}
              >
                <Text style={{ color: '#FF9500', fontWeight: '700', fontSize: 13 }}>Nueva Tarea</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 2. TODAY'S REMINDERS */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🔔 Alarmas de Hoy</Text>
            <Pressable onPress={() => router.push('/reminders')}>
              <Text style={{ color: '#007AFF', fontWeight: '600', fontSize: 13 }}>Ver todas</Text>
            </Pressable>
          </View>

          {todayReminders.length > 0 ? (
            <View style={styles.remindersList}>
              {todayReminders.map((rem) => (
                <View key={rem.id} style={[styles.reminderItem, { backgroundColor: colors.backgroundElement }]}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.reminderTitle, { color: colors.text }]} numberOfLines={1}>
                      {rem.title}
                    </Text>
                    <View style={styles.reminderMetaRow}>
                      <Ionicons name="time-outline" size={12} color="#007AFF" />
                      <Text style={[styles.reminderTimeText, { color: '#007AFF' }]}>{rem.remindAt.time || '12:00'}</Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={async () => {
                      await store.toggleItemCompleted(rem.id);
                    }}
                    style={styles.reminderCheckBtn}
                  >
                    <Ionicons name="ellipse-outline" size={24} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="notifications-off-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
                No hay alarmas programadas para hoy.
              </Text>
            </View>
          )}
        </View>

        {/* 3. SMART ACTIVITY SUGGESTION */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>✨ Tiempo Libre</Text>
            <Pressable onPress={() => router.push('/activities')}>
              <Text style={{ color: '#5856D6', fontWeight: '600', fontSize: 13 }}>Ver ideas</Text>
            </Pressable>
          </View>

          {suggestedActivity ? (
            <View style={[styles.suggestionCard, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.suggestionHeader}>
                <Text style={styles.suggestionBadge}>💡 SUGERENCIA</Text>
                <Pressable onPress={handleNextSuggestion} style={styles.shuffleBtn}>
                  <Ionicons name="shuffle" size={16} color="#5856D6" />
                  <Text style={{ color: '#5856D6', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>Otra</Text>
                </Pressable>
              </View>
              
              <Text style={[styles.suggestionTitle, { color: colors.text }]}>
                {suggestedActivity.title}
              </Text>

              {suggestedActivity.description ? (
                <Text style={[styles.suggestionDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {suggestedActivity.description}
                </Text>
              ) : null}

              <View style={[styles.row, { gap: 10, marginTop: 12 }]}>
                <Pressable
                  onPress={async () => {
                    await store.registerActivityDone(suggestedActivity.id);
                    Alert.alert('¡Excelente!', `Registraste "${suggestedActivity.title}" como realizada.`);
                  }}
                  style={[styles.suggestedActionBtn, { backgroundColor: '#5856D6' }]}
                >
                  <Ionicons name="play" size={14} color="#fff" />
                  <Text style={styles.suggestedActionBtnText}>¡Hacer!</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="sparkles-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
                Agrega ideas de ocio (libros, pelis, deportes) para recibir recomendaciones.
              </Text>
              <Pressable
                onPress={() => router.push({ pathname: '/editor', params: { type: ItemType.ACTIVITY } })}
                style={[styles.emptyCardBtn, { borderColor: '#5856D6' }]}
              >
                <Text style={{ color: '#5856D6', fontWeight: '700', fontSize: 13 }}>Nueva Idea</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Group 1: Día a Día (Tareas, Alarmas, Ocio) */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>⚡ Día a Día</Text>
          <View style={styles.groupContainer}>
            {/* Mis Tareas - Full Width Banner */}
            <Pressable 
              onPress={() => router.push('/tasks')} 
              style={[styles.bannerItem, { backgroundColor: colors.backgroundElement, borderLeftWidth: 4, borderLeftColor: '#FF9500' }]}
            >
              <View style={styles.bannerLeft}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                  <Ionicons name="checkbox" size={22} color="#FF9500" />
                </View>
                <View>
                  <Text style={[styles.bannerTitle, { color: colors.text }]}>Mis Tareas</Text>
                  <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
                    {pendingTasksCount} {pendingTasksCount === 1 ? 'tarea pendiente' : 'tareas pendientes'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>

            {/* Alarmas & Ocio - Side by Side */}
            <View style={styles.rowGrid}>
              <Pressable 
                onPress={() => router.push('/reminders')} 
                style={[styles.halfGridItem, { backgroundColor: colors.backgroundElement }]}
              >
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                  <Ionicons name="notifications" size={20} color="#007AFF" />
                </View>
                <Text style={[styles.gridItemText, { color: colors.text }]}>Alarmas</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  {activeAlarmsCount} {activeAlarmsCount === 1 ? 'activa' : 'activas'}
                </Text>
              </Pressable>

              <Pressable 
                onPress={() => router.push('/activities')} 
                style={[styles.halfGridItem, { backgroundColor: colors.backgroundElement }]}
              >
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(88, 86, 214, 0.1)' }]}>
                  <Ionicons name="sparkles" size={20} color="#5856D6" />
                </View>
                <Text style={[styles.gridItemText, { color: colors.text }]}>Ocio</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  {store.getActivities().length} {store.getActivities().length === 1 ? 'idea' : 'ideas'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Group 2: Mis Listas */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>📝 Notas y Listas</Text>
          <Pressable 
            onPress={() => router.push('/lists')} 
            style={[styles.bannerItem, { backgroundColor: colors.backgroundElement, borderLeftWidth: 4, borderLeftColor: '#34C759' }]}
          >
            <View style={styles.bannerLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                <Ionicons name="list" size={22} color="#34C759" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.bannerTitle, { color: colors.text }]}>Mis Listas</Text>
                <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  Listas de compras, tareas rápidas y notas
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Group 3: Roadmaps, Franjas, Papelera */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>🎯 Organización</Text>
          <View style={[styles.listGroup, { backgroundColor: colors.backgroundElement }]}>
            {/* Roadmaps */}
            <Pressable 
              onPress={() => router.push('/goals')} 
              style={[styles.listGroupItem, { borderBottomWidth: 1, borderBottomColor: colors.backgroundSelected }]}
            >
              <View style={styles.listGroupLeft}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 45, 85, 0.1)' }]}>
                  <Ionicons name="trophy" size={18} color="#FF2D55" />
                </View>
                <View>
                  <Text style={[styles.listGroupTitle, { color: colors.text }]}>Roadmaps</Text>
                  <Text style={[styles.listGroupSubtitle, { color: colors.textSecondary }]}>Metas a largo plazo y objetivos</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>

            {/* Franjas */}
            <Pressable 
              onPress={() => router.push('/slots')} 
              style={[styles.listGroupItem, { borderBottomWidth: 1, borderBottomColor: colors.backgroundSelected }]}
            >
              <View style={styles.listGroupLeft}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(175, 82, 222, 0.1)' }]}>
                  <Ionicons name="time" size={18} color="#AF52DE" />
                </View>
                <View>
                  <Text style={[styles.listGroupTitle, { color: colors.text }]}>Franjas Horarias</Text>
                  <Text style={[styles.listGroupSubtitle, { color: colors.textSecondary }]}>Bloques de tiempo recomendados</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>

            {/* Papelera */}
            <Pressable 
              onPress={() => router.push('/trash')} 
              style={styles.listGroupItem}
            >
              <View style={styles.listGroupLeft}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                  <Ionicons name="trash" size={18} color="#FF3B30" />
                </View>
                <View>
                  <Text style={[styles.listGroupTitle, { color: colors.text }]}>Papelera</Text>
                  <Text style={[styles.listGroupSubtitle, { color: colors.textSecondary }]}>Elementos eliminados recientemente</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {trashCount > 0 && (
                  <View style={styles.inlineTrashBadge}>
                    <Text style={styles.inlineTrashBadgeText}>{trashCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* QUICK COMPOSER BAR */}
      <View style={[styles.composerContainer, { backgroundColor: colors.backgroundElement, borderTopColor: colors.backgroundSelected }]}>
        <TextInput
          placeholder="Escribe algo rápido aquí..."
          placeholderTextColor={colors.textSecondary + '80'}
          value={quickInput}
          onChangeText={setQuickInput}
          style={[styles.composerInput, { color: colors.text, backgroundColor: colors.background }]}
        />
        <View style={styles.composerActions}>
          <Pressable onPress={() => handleQuickCreate(ItemType.TASK)} style={[styles.composerBtn, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#FF9500" />
          </Pressable>
          <Pressable onPress={() => handleQuickCreate(ItemType.REMINDER)} style={[styles.composerBtn, { backgroundColor: 'rgba(0, 122, 255, 0.15)' }]}>
            <Ionicons name="notifications" size={20} color="#007AFF" />
          </Pressable>
          <Pressable onPress={() => handleQuickCreate(ItemType.ACTIVITY)} style={[styles.composerBtn, { backgroundColor: 'rgba(88, 86, 214, 0.15)' }]}>
            <Ionicons name="sparkles" size={20} color="#5856D6" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 20,
  },
  statsBanner: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  sectionContainer: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  focusCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  focusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  focusDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  goalInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  goalInfoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyCardText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: '80%',
  },
  emptyCardBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  remindersList: {
    gap: 8,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  reminderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  reminderTimeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reminderCheckBtn: {
    padding: 4,
  },
  suggestionCard: {
    borderRadius: 20,
    padding: 18,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  suggestionBadge: {
    color: '#5856D6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(88, 86, 214, 0.1)',
  },
  suggestionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  suggestionDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
  },
  suggestedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  suggestedActionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  groupContainer: {
    gap: 12,
  },
  bannerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  halfGridItem: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  gridItemText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listGroup: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  listGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  listGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  listGroupTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  listGroupSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  inlineTrashBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  inlineTrashBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  composerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  composerInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  composerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  composerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
