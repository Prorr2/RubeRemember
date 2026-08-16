import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  useColorScheme,
  TextInput,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore, ItemType, Memo, getLocalDateStr } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';
import { RichText } from '@/components/rich-text';

export default function MemosScreen() {
  const store = useRememberStore();
  const router = useRouter();
  
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];
  const themeColor = '#00C7BE'; // Premium Teal for Recordatorios

  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pastCollapsed, setPastCollapsed] = useState(true);

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
      `¿Deseas mover ${selectedIds.length} recordatorios a la papelera?`,
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

  const handleBulkCopy = () => {
    const texts: string[] = [];
    store.items.forEach((item) => {
      if (selectedIds.includes(item.id) && item.type === ItemType.MEMO) {
        const memo = item as Memo;
        texts.push(memo.title + (memo.description ? ` - ${memo.description}` : ''));
      }
    });

    if (texts.length === 0) return;
    Clipboard.setString(texts.join('\n\n'));
    setSelectedIds([]);
  };

  const handleCopyItemText = (memo: Memo) => {
    Clipboard.setString(memo.title + (memo.description ? ` - ${memo.description}` : ''));
  };

  // Group memos dynamically based on the current local date and search query
  const groupedMemos = useMemo(() => {
    const today = getLocalDateStr(new Date());
    const list = store.getMemos();
    const q = searchQuery.toLowerCase().trim();

    const filteredList = q
      ? list.filter((memo) => memo.title.toLowerCase().includes(q) || (memo.description || '').toLowerCase().includes(q))
      : list;

    const activeList: Memo[] = [];
    const upcomingList: Memo[] = [];
    const pastList: Memo[] = [];
    const completedList: Memo[] = [];

    filteredList.forEach((memo) => {
      if (memo.completed) {
        completedList.push(memo);
      } else {
        const hasStart = !!memo.startDate;
        const hasEnd = !!memo.endDate;
        const start = memo.startDate || '';
        const end = memo.endDate || '';

        const effectiveEndDate = hasEnd ? end : (hasStart ? start : '');

        if (effectiveEndDate && effectiveEndDate < today) {
          pastList.push(memo);
        } else if (hasStart && start > today) {
          upcomingList.push(memo);
        } else {
          activeList.push(memo);
        }
      }
    });

    const sortByDate = (a: Memo, b: Memo) => {
      const dateA = a.startDate || a.createdAt;
      const dateB = b.startDate || b.createdAt;
      return dateA.localeCompare(dateB);
    };

    return [
      { title: 'Pasados de fecha', data: pastList.sort(sortByDate), icon: 'alert-circle-outline', color: '#FF3B30' },
      { title: 'Activos en este momento', data: activeList.sort(sortByDate), icon: 'eye-outline', color: '#34C759' },
      { title: 'Programados próximamente', data: upcomingList.sort(sortByDate), icon: 'calendar-outline', color: '#FF9500' },
      { title: 'Pasados o Completados', data: completedList.sort(sortByDate), icon: 'archive-outline', color: colors.textSecondary },
    ];
  }, [store.items, colors.textSecondary, searchQuery]);

  const handleDeleteMemo = (memo: Memo) => {
    Alert.alert(
      'Mover a la Papelera',
      `¿Deseas mover el recordatorio "${memo.title}" a la papelera?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover',
          style: 'destructive',
          onPress: async () => {
            await store.deleteItem(memo.id);
          },
        },
      ]
    );
  };

  const renderSectionHeader = (title: string, count: number, iconName: string, iconColor: string) => {
    if (count === 0) return null;
    return (
      <View style={styles.sectionHeader}>
        <Ionicons name={iconName as any} size={14} color={iconColor} />
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
        <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{count}</Text>
        </View>
      </View>
    );
  };

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return 'Siempre';
    const [y, m, d] = dateStr.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]}`;
  };

  const renderMemoItem = (item: Memo) => {
    const isSelected = selectedIds.includes(item.id);
    const dateRangeStr = item.startDate || item.endDate
      ? `${formatShortDate(item.startDate)} al ${formatShortDate(item.endDate)}`
      : 'Mostrar indefinidamente';

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
          styles.memoCard,
          { backgroundColor: colors.backgroundElement },
          isSelected && { borderColor: themeColor, borderWidth: 1.5 },
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
                color={isSelected ? themeColor : colors.textSecondary}
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
                color={item.completed ? themeColor : colors.textSecondary}
              />
            </Pressable>
          )}

          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text
              style={[
                styles.memoTitle,
                { color: colors.text },
                item.completed && { textDecorationLine: 'line-through', opacity: 0.6 },
              ]}
            >
              {item.title}
            </Text>
            
            {item.description ? (
              <RichText
                text={item.description}
                colors={colors}
                textStyle={[styles.memoDesc, { color: colors.textSecondary }]}
              />
            ) : null}

            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={12} color={themeColor} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{dateRangeStr}</Text>
              
              {item.hasAlarm && (
                <>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>·</Text>
                  <Ionicons name="notifications-outline" size={12} color="#34C759" />
                  <Text style={[styles.alarmText, { color: '#34C759' }]}>{item.alarmTime || '12:00'}</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.cardActions}>
            {selectedIds.length === 0 && (
              <>
                <Pressable onPress={() => handleCopyItemText(item)} style={styles.actionBtn}>
                  <Ionicons name="copy-outline" size={20} color={colors.textSecondary} />
                </Pressable>

                <Pressable
                  onPress={() => router.push({ pathname: '/editor', params: { id: item.id } })}
                  style={styles.actionBtn}
                >
                  <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                </Pressable>

                <Pressable onPress={() => handleDeleteMemo(item)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const isListEmpty = useMemo(() => {
    return groupedMemos.every((s) => s.data.length === 0);
  }, [groupedMemos]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {selectedIds.length > 0 ? (
        <View style={[styles.header, { borderBottomColor: colors.backgroundElement, backgroundColor: colors.backgroundElement }]}>
          <Pressable onPress={() => setSelectedIds([])} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{selectedIds.length} seleccionadas</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={handleBulkCopy} style={styles.headerButton}>
              <Ionicons name="copy-outline" size={24} color="#00C7BE" />
            </Pressable>
            <Pressable onPress={handleBulkDelete} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.header, { borderBottomColor: colors.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Recordatorios</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/editor', params: { type: ItemType.MEMO } })}
            style={styles.headerButton}
          >
            <Ionicons name="add" size={26} color={themeColor} />
          </Pressable>
        </View>
      )}

      {/* Search Bar */}
      {!selectedIds.length && (
        <View style={styles.searchBarContainer}>
          <View style={[styles.searchBox, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              placeholder="Buscar recordatorios..."
              placeholderTextColor={colors.textSecondary + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Schedule Today's Alarms Button */}
      {!selectedIds.length && (
        <View style={styles.scheduleButtonContainer}>
          <Pressable
            onPress={async () => {
              await store.scheduleTodayMemosAlarms();
            }}
            style={({ pressed }) => [
              styles.scheduleButton,
              { backgroundColor: themeColor, opacity: pressed ? 0.8 : 1 }
            ]}
          >
            <Ionicons name="alarm-outline" size={20} color="#fff" />
            <Text style={styles.scheduleButtonText}>Programar alarmas de hoy</Text>
          </Pressable>
        </View>
      )}

      {isListEmpty ? (
        <View style={styles.emptyContainer}>
          {searchQuery ? (
            <>
              <Ionicons name="warning-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center', marginHorizontal: 24 }}>
                No se encontraron recordatorios para "{searchQuery}"
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="bookmark-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center', marginHorizontal: 24 }}>
                No tienes recordatorios temporales.{'\n'}Crea uno nuevo para recordar cosas durante una franja de tiempo específica.
              </Text>
            </>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {groupedMemos.map((section) => {
            if (section.data.length === 0) return null;
            const isPastSection = section.title === 'Pasados de fecha';
            const isCollapsed = isPastSection && pastCollapsed;

            return (
              <View key={section.title} style={styles.sectionContainer}>
                {isPastSection ? (
                  <Pressable
                    onPress={() => setPastCollapsed(!pastCollapsed)}
                    style={[styles.sectionHeader, { justifyContent: 'space-between', paddingRight: 8 }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name={section.icon as any} size={14} color={section.color} />
                      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
                      <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
                        <Text style={[styles.badgeText, { color: colors.text }]}>{section.data.length}</Text>
                      </View>
                    </View>
                    <Ionicons name={isCollapsed ? 'chevron-forward' : 'chevron-down'} size={18} color={colors.textSecondary} />
                  </Pressable>
                ) : (
                  renderSectionHeader(section.title, section.data.length, section.icon, section.color)
                )}
                {!isCollapsed && section.data.map((item) => renderMemoItem(item))}
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
  memoCard: {
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
  memoTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  memoDesc: {
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alarmText: {
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
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchBox: {
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
  scheduleButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#00C7BE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
