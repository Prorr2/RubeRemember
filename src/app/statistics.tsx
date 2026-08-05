import React, { useMemo } from 'react';
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
import { Colors } from '@/constants/theme';

export default function StatisticsScreen() {
  const router = useRouter();
  const { getComputedStats } = useStatisticsService();

  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

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

  // 2. Monthly active days (Last 30 days)
  const last30DaysStats = useMemo(() => {
    let activeDays = 0;
    let totalMins = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const mins = stats.dailyMinutes[dateStr] || 0;
      if (mins > 0) {
        activeDays++;
        totalMins += mins;
      }
    }
    return { activeDays, totalMins };
  }, [stats.dailyMinutes]);

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

        {/* Weights Distribution */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DISTRIBUCIÓN POR BLOQUES</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, gap: 14 }]}>
            {renderProgressBar('🌙 Luna (Completar)', stats.weightCounts.LUNA || 0, maxWeightCount, '#AF52DE')}
            {renderProgressBar('🌍 Terra (Avanzar)', stats.weightCounts.TERRA || 0, maxWeightCount, '#34C759')}
            {renderProgressBar('☀️ Sol (Hito)', stats.weightCounts.SOL || 0, maxWeightCount, '#FF9500')}
            {renderProgressBar('⭐ Astra (Hábito)', stats.weightCounts.ASTRA || 0, maxWeightCount, '#007AFF')}
          </View>
        </View>

        {/* Energy Types Distribution */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DISTRIBUCIÓN POR ENERGÍAS</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, gap: 14 }]}>
            {Object.keys(stats.energyCounts).length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', py: 8 }}>
                No hay suficientes sesiones con energías configuradas.
              </Text>
            ) : (
              Object.entries(stats.energyCounts).map(([energy, count]) =>
                renderProgressBar(energy, count, maxEnergyCount, '#5856D6')
              )
            )}
          </View>
        </View>

        {/* Monthly Activity Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACTIVIDAD MENSUAL (ÚLTIMOS 30 DÍAS)</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, flexDirection: 'row', justifyContent: 'space-between', padding: 20 }]}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Días con enfoque</Text>
              <Text style={[styles.summaryVal, { color: colors.text }]}>{last30DaysStats.activeDays} / 30</Text>
            </View>
            <View style={{ gap: 6, alignItems: 'flex-end' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Total trabajado</Text>
              <Text style={[styles.summaryVal, { color: '#FF9500' }]}>{formatTime(last30DaysStats.totalMins)}</Text>
            </View>
          </View>
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
  summaryVal: {
    fontSize: 22,
    fontWeight: '900',
  },
});
