import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore, ItemType, Reminder as ReminderV2, getLocalDateStr } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

export default function RemindersScreen() {
  const store = useRememberStore();
  const router = useRouter();
  
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    Alert.alert(
      'Mover a la papelera',
      `¿Deseas mover ${selectedIds.length} alarmas a la papelera?`,
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

  // Grouped reminders
  const groupedReminders = useMemo(() => {
    const list = store.getReminders().filter((r) => r.completed === showCompleted);
    const today = getLocalDateStr();
    
    // Calculate end of next 7 days
    const next7DaysDate = new Date();
    next7DaysDate.setDate(next7DaysDate.getDate() + 7);
    const next7DaysStr = getLocalDateStr(next7DaysDate);

    const todayList: ReminderV2[] = [];
    const upcomingList: ReminderV2[] = [];
    const laterList: ReminderV2[] = [];

    list.forEach((rem) => {
      const dates = rem.remindAt.dates || (rem.remindAt.date ? [rem.remindAt.date] : []);
      if (dates.length === 0) {
        laterList.push(rem);
        return;
      }
      
      const nextDate = dates.sort()[0];
      if (nextDate === today) {
        todayList.push(rem);
      } else if (nextDate > today && nextDate <= next7DaysStr) {
        upcomingList.push(rem);
      } else {
        laterList.push(rem);
      }
    });

    const sortByTimeAndDate = (a: ReminderV2, b: ReminderV2) => {
      const dateA = a.remindAt.date || '';
      const dateB = b.remindAt.date || '';
      const timeA = a.remindAt.time || '12:00';
      const timeB = b.remindAt.time || '12:00';
      return `${dateA}T${timeA}`.localeCompare(`${dateB}T${timeB}`);
    };

    return [
      { title: 'Hoy', data: todayList.sort(sortByTimeAndDate) },
      { title: 'Próximos 7 días', data: upcomingList.sort(sortByTimeAndDate) },
      { title: 'Más adelante / Sin fecha', data: laterList.sort(sortByTimeAndDate) },
    ];
  }, [store.items, showCompleted]);

  const handleDeleteReminder = (rem: ReminderV2) => {
    Alert.alert(
      'Mover a la Papelera',
      `¿Deseas mover el recordatorio "${rem.title}" a la papelera?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover',
          style: 'destructive',
          onPress: async () => {
            await store.deleteItem(rem.id);
          },
        },
      ]
    );
  };

  const handleSyncAlarm = async (rem: ReminderV2) => {
    await store.scheduleSystemAlarm(rem);
    Alert.alert('Sincronizado', 'Alarma y evento de calendario sincronizados.');
  };

  const renderSectionHeader = (title: string, count: number) => {
    if (count === 0) return null;
    return (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
        <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{count}</Text>
        </View>
      </View>
    );
  };

  const renderReminderItem = (item: ReminderV2) => {
    const dates = item.remindAt.dates || (item.remindAt.date ? [item.remindAt.date] : []);
    const datesStr = dates.length > 1
      ? `${dates.length} días (${dates[0]} al ${dates[dates.length - 1]})`
      : (dates[0] || 'Sin fecha');

    const isSelected = selectedIds.includes(item.id);

    return (
      <Pressable
        key={item.id}
        onLongPress={() => handleToggleSelect(item.id)}
        onPress={() => {
          if (selectedIds.length > 0) {
            handleToggleSelect(item.id);
          }
        }}
        style={[
          styles.reminderCard,
          { backgroundColor: colors.backgroundElement },
          isSelected && { borderColor: '#007AFF', borderWidth: 1.5 },
        ]}
      >
        <View style={styles.cardMain}>
          {selectedIds.length > 0 ? (
            <Pressable
              onPress={() => handleToggleSelect(item.id)}
              style={styles.checkbox}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={24}
                color={isSelected ? '#007AFF' : colors.textSecondary}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={async () => {
                await store.toggleItemCompleted(item.id);
              }}
              style={styles.checkbox}
            >
              <Ionicons
                name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={item.completed ? '#007AFF' : colors.textSecondary}
              />
            </Pressable>
          )}

          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text
              style={[
                styles.reminderTitle,
                { color: colors.text },
                item.completed && { textDecorationLine: 'line-through', opacity: 0.6 },
              ]}
            >
              {item.title}
            </Text>
            
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={12} color="#007AFF" />
              <Text style={[styles.timeText, { color: '#007AFF' }]}>{item.remindAt.time || '12:00'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>·</Text>
              <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{datesStr}</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <Pressable onPress={() => handleSyncAlarm(item)} style={styles.actionBtn}>
              <Ionicons name="sync" size={20} color="#34C759" />
            </Pressable>

            <Pressable
              onPress={() => router.push({ pathname: '/editor', params: { id: item.id } })}
              style={styles.actionBtn}
            >
              <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable onPress={() => handleDeleteReminder(item)} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  const isListEmpty = useMemo(() => {
    return groupedReminders.every((s) => s.data.length === 0);
  }, [groupedReminders]);

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Alarmas</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/editor', params: { type: ItemType.REMINDER } })}
            style={styles.headerButton}
          >
            <Ionicons name="add" size={26} color="#007AFF" />
          </Pressable>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setShowCompleted(false)}
          style={[styles.tabBtn, !showCompleted && { borderBottomColor: '#007AFF', borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabText, { color: !showCompleted ? '#007AFF' : colors.textSecondary }]}>Activas</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowCompleted(true)}
          style={[styles.tabBtn, showCompleted && { borderBottomColor: '#007AFF', borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabText, { color: showCompleted ? '#007AFF' : colors.textSecondary }]}>Completadas</Text>
        </Pressable>
      </View>

      {isListEmpty ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No tienes alarmas en esta sección.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {groupedReminders.map((section) => {
            if (section.data.length === 0) return null;
            return (
              <View key={section.title} style={styles.sectionContainer}>
                {renderSectionHeader(section.title, section.data.length)}
                {section.data.map((item) => renderReminderItem(item))}
              </View>
            );
          })}
        </ScrollView>
      )}
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
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  sectionContainer: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  reminderCard: {
    borderRadius: 16,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  checkbox: {
    padding: 4,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
