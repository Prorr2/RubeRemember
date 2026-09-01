import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HabitCalendarProps {
  completedDates?: string[]; // Array of "YYYY-MM-DD"
  onToggleDate: (dateStr: string) => void;
  colors: {
    text: string;
    textSecondary: string;
    background: string;
    backgroundElement?: string;
    backgroundSelected?: string;
    cardBorder?: string;
  };
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export const HabitCalendar: React.FC<HabitCalendarProps> = ({
  completedDates = [],
  onToggleDate,
  colors,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Optimistic local state for 0ms visual feedback
  const [localCompleted, setLocalCompleted] = useState<string[]>(completedDates);

  useEffect(() => {
    setLocalCompleted(completedDates);
  }, [completedDates]);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleTodayReset = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const handleCellPress = (dateStr: string) => {
    const exists = localCompleted.includes(dateStr);
    const nextCompleted = exists
      ? localCompleted.filter((d) => d !== dateStr)
      : [...localCompleted, dateStr];

    // Update local state instantly
    setLocalCompleted(nextCompleted);

    // Call store update callback
    onToggleDate(dateStr);
  };

  // Build grid of days for current month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6; // Sunday = 6

  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const grid: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

  // Filler days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const pMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const pYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    grid.push({ dateStr, dayNum, isCurrentMonth: false });
  }

  // Days of current month
  for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    grid.push({ dateStr, dayNum, isCurrentMonth: true });
  }

  // Filler days for next month to complete rows
  let nextDayNum = 1;
  while (grid.length % 7 !== 0) {
    const nMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${nYear}-${String(nMonth + 1).padStart(2, '0')}-${String(nextDayNum).padStart(2, '0')}`;
    grid.push({ dateStr, dayNum: nextDayNum, isCurrentMonth: false });
    nextDayNum++;
  }

  // Calculate monthly stats based on localCompleted
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthCompletedCount = localCompleted.filter((d) => d.startsWith(monthPrefix)).length;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.backgroundSelected || 'rgba(255,255,255,0.1)',
        },
      ]}
    >
      {/* Calendar Header */}
      <View style={styles.header}>
        <View style={styles.monthTitleRow}>
          <Ionicons name="calendar" size={16} color="#FF9500" />
          <Text style={[styles.monthTitleText, { color: colors.text }]}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable onPress={handleTodayReset} style={[styles.navBtn, { backgroundColor: colors.backgroundSelected }]}>
            <Text style={[styles.todayBtnText, { color: colors.textSecondary }]}>Hoy</Text>
          </Pressable>
          <Pressable onPress={handlePrevMonth} style={[styles.navBtn, { backgroundColor: colors.backgroundSelected }]}>
            <Ionicons name="chevron-back" size={14} color={colors.text} />
          </Pressable>
          <Pressable onPress={handleNextMonth} style={[styles.navBtn, { backgroundColor: colors.backgroundSelected }]}>
            <Ionicons name="chevron-forward" size={14} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Weekday Labels */}
      <View style={styles.weekHeader}>
        {WEEKDAY_NAMES.map((name, idx) => (
          <Text key={idx} style={[styles.weekdayText, { color: colors.textSecondary }]}>
            {name}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.daysGrid}>
        {grid.map(({ dateStr, dayNum, isCurrentMonth }) => {
          const isCompleted = localCompleted.includes(dateStr);
          const isToday = dateStr === todayStr;

          return (
            <Pressable
              key={dateStr}
              onPress={() => handleCellPress(dateStr)}
              style={[
                styles.dayCell,
                isCompleted && styles.dayCellCompleted,
                isToday && !isCompleted && [styles.dayCellToday, { borderColor: '#FF9500' }],
                !isCurrentMonth && { opacity: 0.35 },
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: isCompleted ? '#FFFFFF' : isCurrentMonth ? colors.text : colors.textSecondary },
                  isCompleted && { fontWeight: '800' },
                  isToday && !isCompleted && { color: '#FF9500', fontWeight: '800' },
                ]}
              >
                {dayNum}
              </Text>
              {isCompleted && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark-sharp" size={10} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Footer Stats Summary */}
      <View style={[styles.footerStats, { borderTopColor: colors.backgroundSelected || 'rgba(255,255,255,0.08)' }]}>
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle" size={14} color="#34C759" />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            Este mes: <Text style={{ color: colors.text, fontWeight: '700' }}>{monthCompletedCount} días</Text>
          </Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="flame" size={14} color="#FF9500" />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            Total histórico: <Text style={{ color: colors.text, fontWeight: '700' }}>{localCompleted.length} días</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthTitleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  weekdayText: {
    width: 32,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 6,
  },
  dayCell: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCellCompleted: {
    backgroundColor: '#34C759',
  },
  dayCellToday: {
    borderWidth: 1.5,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
  },
  footerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
  },
});
