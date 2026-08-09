import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useStatisticsService } from '@/services/StatisticsService';
import { useRememberStore } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

export default function StatisticsScreen() {
  const router = useRouter();
  const store = useRememberStore();
  const { getComputedStats } = useStatisticsService();

  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  // Collapsible States
  const [showBlockDist, setShowBlockDist] = useState(true);
  const [showEnergyDist, setShowEnergyDist] = useState(true);

  // Expanded state for task details inside days
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleTaskExpanded = (dateStr: string, taskId: string) => {
    const key = `${dateStr}_${taskId}`;
    setExpandedTasks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Dynamically calculate computed stats
  const stats = useMemo(() => getComputedStats(), [getComputedStats]);

  // Format time (minutes to hours & minutes)
  const formatTime = (totalMinutes: number) => {
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  };

  // 1. Weekly activity data (Last 7 days list)
  const last7DaysData = useMemo(() => {
    const list = [];
    const daysName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const mins = stats.dailyMinutes[dateStr] || 0;
      list.push({
        dayName: daysName[d.getDay()],
        dateLabel: d.getDate(),
        mins,
      });
    }
    return list;
  }, [stats.dailyMinutes]);

  // Group sessions by day
  const sessionsByDay = useMemo(() => {
    const groups: Record<string, typeof store.sessions> = {};
    const sessions = store.sessions || [];
    
    // Sort sessions descending (newest first)
    const sortedSessions = [...sessions].sort((a, b) => {
      const timeA = new Date(a.endTime || a.startTime || a.createdAt).getTime();
      const timeB = new Date(b.endTime || b.startTime || b.createdAt).getTime();
      return timeB - timeA;
    });

    sortedSessions.forEach(session => {
      const sessionDate = session.endTime || session.startTime || session.createdAt;
      if (!sessionDate) return;
      const dateStr = sessionDate.split('T')[0]; // YYYY-MM-DD
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(session);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])); // Newer dates first
  }, [store.sessions]);

  // Friendly date label
  const getDayLabel = (dateStr: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === todayStr) {
      return 'Hoy';
    } else if (dateStr === yesterdayStr) {
      return 'Ayer';
    } else {
      const d = new Date(dateStr + 'T00:00:00'); // Prevent timezone offset shift
      return d.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  };

  // Render helper for progress bars
  const renderProgressBar = (label: string, value: number, max: number, barColor: string) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <View key={label} style={styles.progressRow}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabelText, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.progressValueText, { color: colors.textSecondary }]}>{value}</Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: colors.backgroundSelected }]}>
          <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
        </View>
      </View>
    );
  };

  const maxWeightCount = Math.max(...Object.values(stats.weightCounts), 1);
  const maxEnergyCount = Math.max(...Object.values(stats.energyCounts), 1);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.backgroundSelected }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Estadísticas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Core Summary Cards Grid */}
        <View style={styles.grid}>
          <View style={[styles.gridCard, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="time-outline" size={24} color="#FF9500" />
            <Text style={[styles.gridVal, { color: colors.text }]}>{formatTime(stats.totalWorkedTime)}</Text>
            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Tiempo Enfocado</Text>
          </View>

          <View style={[styles.gridCard, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="ribbon-outline" size={24} color="#5856D6" />
            <Text style={[styles.gridVal, { color: colors.text }]}>{stats.totalSessions}</Text>
            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Sesiones</Text>
          </View>

          <View style={[styles.gridCard, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="flame-outline" size={24} color="#FF3B30" />
            <Text style={[styles.gridVal, { color: colors.text }]}>{stats.currentStreak} días</Text>
            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Racha Actual</Text>
          </View>

          <View style={[styles.gridCard, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="trophy-outline" size={24} color="#34C759" />
            <Text style={[styles.gridVal, { color: colors.text }]}>{stats.longestStreak} días</Text>
            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Racha Máxima</Text>
          </View>
        </View>

        {/* Weekly Bar Chart (Visual List representation) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACTIVIDAD SEMANAL</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.chartRow}>
              {last7DaysData.map((item, idx) => {
                const maxWeekMin = Math.max(...last7DaysData.map(d => d.mins), 1);
                const heightPercentage = (item.mins / maxWeekMin) * 80;
                return (
                  <View key={idx} style={styles.chartCol}>
                    <Text style={[styles.chartValText, { color: colors.textSecondary }]}>{item.mins > 0 ? `${item.mins}m` : ''}</Text>
                    <View style={[styles.chartBarBg, { backgroundColor: colors.backgroundSelected }]}>
                      <View style={[styles.chartBarFill, { height: `${heightPercentage}%`, backgroundColor: '#FF9500' }]} />
                    </View>
                    <Text style={[styles.chartDayText, { color: colors.text }]}>{item.dayName}</Text>
                    <Text style={[styles.chartDateText, { color: colors.textSecondary }]}>{item.dateLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Collapsible: Weights/Blocks Distribution */}
        <View style={styles.section}>
          <Pressable 
            onPress={() => setShowBlockDist(!showBlockDist)}
            style={styles.collapsibleHeader}
          >
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DISTRIBUCIÓN POR BLOQUES</Text>
            <Ionicons 
              name={showBlockDist ? "chevron-up" : "chevron-down"} 
              size={18} 
              color={colors.textSecondary} 
            />
          </Pressable>
          {showBlockDist && (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement, gap: 14 }]}>
              {renderProgressBar('🌙 Luna (Completar)', stats.weightCounts.LUNA || 0, maxWeightCount, '#AF52DE')}
              {renderProgressBar('🌍 Terra (Avanzar)', stats.weightCounts.TERRA || 0, maxWeightCount, '#34C759')}
              {renderProgressBar('☀️ Sol (Hito)', stats.weightCounts.SOL || 0, maxWeightCount, '#FF9500')}
              {renderProgressBar('⭐ Astra (Hábito)', stats.weightCounts.ASTRA || 0, maxWeightCount, '#007AFF')}
            </View>
          )}
        </View>

        {/* Collapsible: Energy Types Distribution */}
        <View style={styles.section}>
          <Pressable 
            onPress={() => setShowEnergyDist(!showEnergyDist)}
            style={styles.collapsibleHeader}
          >
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DISTRIBUCIÓN POR ENERGÍAS</Text>
            <Ionicons 
              name={showEnergyDist ? "chevron-up" : "chevron-down"} 
              size={18} 
              color={colors.textSecondary} 
            />
          </Pressable>
          {showEnergyDist && (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement, gap: 14 }]}>
              {Object.keys(stats.energyCounts).length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 }}>
                  No hay suficientes sesiones con energías configuradas.
                </Text>
              ) : (
                Object.entries(stats.energyCounts).map(([energy, count]) =>
                  renderProgressBar(energy, count, maxEnergyCount, '#5856D6')
                )
              )}
            </View>
          )}
        </View>

        {/* History of Focus Tasks Grouped by Day */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TAREAS ENFOCADAS POR DÍA</Text>
          {sessionsByDay.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement, alignItems: 'center', padding: 24 }]}>
              <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                Aún no has registrado ninguna sesión de enfoque.
              </Text>
            </View>
          ) : (
            sessionsByDay.map(([dateStr, daySessions]) => {
              // Group sessions of this day by task
              const taskGroups: Record<string, { taskTitle: string, totalMinutes: number, sessions: typeof daySessions }> = {};
              
              daySessions.forEach(session => {
                const taskId = session.taskId;
                const task = store.getTasks().find(t => t.id === taskId);
                const taskTitle = task ? task.title : 'Tarea eliminada';
                
                if (!taskGroups[taskId]) {
                  taskGroups[taskId] = {
                    taskTitle,
                    totalMinutes: 0,
                    sessions: []
                  };
                }
                
                taskGroups[taskId].totalMinutes += session.realDuration || session.plannedDuration || 0;
                taskGroups[taskId].sessions.push(session);
              });

              return (
                <View 
                  key={dateStr} 
                  style={[
                    styles.card, 
                    { 
                      backgroundColor: colors.backgroundElement, 
                      borderWidth: 1, 
                      borderColor: colors.backgroundSelected,
                      gap: 12,
                      marginBottom: 16
                    }
                  ]}
                >
                  {/* Day Title Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.backgroundSelected, paddingBottom: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' }}>
                      📅 {getDayLabel(dateStr)}
                    </Text>
                    <View style={{ backgroundColor: 'rgba(52, 199, 89, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: '#34C759', fontSize: 10, fontWeight: '800' }}>
                        {daySessions.length} {daySessions.length === 1 ? 'sesión' : 'sesiones'}
                      </Text>
                    </View>
                  </View>

                  {/* Tasks within this day */}
                  <View style={{ gap: 12 }}>
                    {Object.entries(taskGroups).map(([taskId, group]) => {
                      const isExpanded = expandedTasks[`${dateStr}_${taskId}`] || false;
                      return (
                        <View 
                          key={taskId} 
                          style={{ 
                            backgroundColor: colors.background, 
                            borderRadius: 12, 
                            borderWidth: 1, 
                            borderColor: colors.backgroundSelected,
                            overflow: 'hidden'
                          }}
                        >
                          <Pressable 
                            onPress={() => toggleTaskExpanded(dateStr, taskId)}
                            style={{ 
                              flexDirection: 'row', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              padding: 12
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                              <Ionicons 
                                name={isExpanded ? "chevron-down" : "chevron-forward"} 
                                size={16} 
                                color={colors.textSecondary} 
                              />
                              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', flex: 1 }}>
                                📋 {group.taskTitle}
                              </Text>
                            </View>
                            <Text style={{ color: '#FF9500', fontSize: 12, fontWeight: '800' }}>
                              ⏱️ {group.totalMinutes} min
                            </Text>
                          </Pressable>

                          {/* Sessions details - only visible if expanded */}
                          {isExpanded && (
                            <View style={{ gap: 6, paddingHorizontal: 12, paddingBottom: 12 }}>
                              {group.sessions.map((session, index) => {
                                const sessionTime = session.endTime || session.startTime || session.createdAt;
                                const timeLabel = sessionTime 
                                  ? new Date(sessionTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) 
                                  : '';
                                return (
                                  <View 
                                    key={session.id} 
                                    style={{ 
                                      backgroundColor: colors.backgroundSelected, 
                                      borderRadius: 8, 
                                      padding: 8,
                                      gap: 4
                                    }}
                                  >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}>
                                        Sesión {group.sessions.length - index} {timeLabel ? `a las ${timeLabel}` : ''}
                                      </Text>
                                      {session.progress !== undefined && (
                                        <Text style={{ color: '#007AFF', fontSize: 10, fontWeight: '700' }}>
                                          📈 {session.progress}%
                                        </Text>
                                      )}
                                    </View>
                                    {session.notes && (
                                      <Text style={{ color: colors.text, fontSize: 12, fontStyle: 'italic', lineHeight: 16 }}>
                                        "{session.notes}"
                                      </Text>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
    gap: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    gap: 8,
  },
  gridVal: {
    fontSize: 20,
    fontWeight: '900',
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  card: {
    borderRadius: 18,
    padding: 16,
  },
  progressRow: {
    gap: 6,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressValueText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
  },
  chartCol: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  chartValText: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  chartBarBg: {
    width: 14,
    height: 80,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 7,
  },
  chartDayText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  chartDateText: {
    fontSize: 9,
  },
});
