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

import { useRememberStore, ItemType, Plan, getLocalDateStr } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

const formatPlanDates = (plan: Plan) => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  if (!plan.startMonth || !plan.startYear) return 'Sin fecha fija';
  const startText = `${months[plan.startMonth - 1]} ${plan.startYear}`;
  if (!plan.endMonth || !plan.endYear) return startText;
  
  if (plan.startMonth === plan.endMonth && plan.startYear === plan.endYear) {
    return startText;
  }
  
  return `${startText} - ${months[plan.endMonth - 1]} ${plan.endYear}`;
};

const getPlanText = (plan: Plan) => {
  const datesText = formatPlanDates(plan);
  return `${plan.title}${plan.description ? ` - ${plan.description}` : ''} (${datesText})`;
};

export default function PlansScreen() {
  const store = useRememberStore();
  const router = useRouter();
  
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];
  const themeColor = '#BF5AF2'; // Premium Violet for Long-Term Plans

  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('Todos');

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    store.getPlans().forEach(plan => {
      if (plan.startYear && plan.endYear) {
        for (let y = plan.startYear; y <= plan.endYear; y++) {
          years.add(y.toString());
        }
      } else {
        if (plan.startYear) years.add(plan.startYear.toString());
        if (plan.endYear) years.add(plan.endYear.toString());
      }
    });
    const allYears = Array.from(years).sort();
    if (!allYears.includes('2026')) allYears.push('2026');
    if (!allYears.includes('2027')) allYears.push('2027');
    if (!allYears.includes('2028')) allYears.push('2028');
    return ['Todos', ...allYears.sort()];
  }, [store.items]);

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
      `¿Deseas mover ${selectedIds.length} planes a la papelera?`,
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
    const activePlans = store.getPlans();
    activePlans.forEach((plan) => {
      if (selectedIds.includes(plan.id)) {
        texts.push(getPlanText(plan));
      }
    });

    if (texts.length === 0) return;
    Clipboard.setString(texts.join('\n\n'));
    setSelectedIds([]);
  };

  const handleCopyItemText = (plan: Plan) => {
    Clipboard.setString(getPlanText(plan));
  };

  const handleDeletePlan = (plan: Plan) => {
    Alert.alert(
      'Mover a la Papelera',
      `¿Deseas mover el plan "${plan.title}" a la papelera?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover',
          style: 'destructive',
          onPress: async () => {
            await store.deleteItem(plan.id);
          },
        },
      ]
    );
  };

  // Group plans by target month/year and completion status
  const groupedPlans = useMemo(() => {
    const list = store.getPlans();
    const q = searchQuery.toLowerCase().trim();

    let filteredList = q
      ? list.filter((plan) => plan.title.toLowerCase().includes(q) || (plan.description || '').toLowerCase().includes(q))
      : list;

    // Apply year filter (includes intermediate years in range)
    if (selectedYearFilter !== 'Todos') {
      const yVal = Number(selectedYearFilter);
      filteredList = filteredList.filter((plan) => {
        if (plan.startYear && plan.endYear) {
          return plan.startYear <= yVal && yVal <= plan.endYear;
        }
        if (plan.startYear) return plan.startYear === yVal;
        if (plan.endYear) return plan.endYear === yVal;
        return false;
      });
    }

    // Separate completed and pending
    const pendingList = filteredList.filter((p) => !p.completed);
    const completedList = filteredList.filter((p) => p.completed);

    const getMonthNameSpanish = (monthIdx: number): string => {
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ];
      return months[monthIdx];
    };

    const groups: { title: string; data: Plan[]; isCompletedSection?: boolean }[] = [];

    if (pendingList.length > 0) {
      // Group pending plans by Start Month/Year
      const monthlyGroups: Record<string, Plan[]> = {};
      const noDateGroup: Plan[] = [];

      pendingList.forEach((plan) => {
        if (plan.startYear && plan.startMonth) {
          const monthStr = plan.startMonth.toString().padStart(2, '0');
          const key = `${plan.startYear}-${monthStr}`; // YYYY-MM
          if (!monthlyGroups[key]) {
            monthlyGroups[key] = [];
          }
          monthlyGroups[key].push(plan);
        } else {
          noDateGroup.push(plan);
        }
      });

      // Sort keys chronologically
      const sortedKeys = Object.keys(monthlyGroups).sort();
      sortedKeys.forEach((key) => {
        const [yearStr, monthStr] = key.split('-');
        const monthName = getMonthNameSpanish(parseInt(monthStr, 10) - 1);
        groups.push({
          title: `${monthName} ${yearStr}`,
          data: monthlyGroups[key].sort((a, b) => {
            const endA = `${a.endYear || 9999}-${(a.endMonth || 12).toString().padStart(2, '0')}`;
            const endB = `${b.endYear || 9999}-${(b.endMonth || 12).toString().padStart(2, '0')}`;
            return endA.localeCompare(endB);
          }),
        });
      });

      if (noDateGroup.length > 0) {
        groups.push({
          title: 'Algún día / Sin fecha fija',
          data: noDateGroup.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        });
      }
    }

    if (completedList.length > 0) {
      groups.push({
        title: 'Planes Completados',
        data: completedList.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        isCompletedSection: true,
      });
    }

    return groups;
  }, [store.items, searchQuery, selectedYearFilter]);

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${parseInt(d, 10)} de ${months[parseInt(m, 10) - 1]} (${y})`;
  };

  const renderPlanItem = (item: Plan) => {
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
          styles.planCard,
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
                styles.planTitle,
                { color: colors.text },
                item.completed && { textDecorationLine: 'line-through', opacity: 0.6 },
              ]}
            >
              {item.title}
            </Text>
            
            {item.description ? (
              <Text style={[styles.planDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                {item.description}
              </Text>
            ) : null}

            {item.startMonth && item.startYear ? (
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={12} color={themeColor} />
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{formatPlanDates(item)}</Text>
              </View>
            ) : (
              <View style={styles.metaRow}>
                <Ionicons name="infinite-outline" size={12} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Aspiración a largo plazo</Text>
              </View>
            )}
          </View>

          <View style={styles.cardActions}>
            <Pressable
              onPress={() => handleCopyItemText(item)}
              style={styles.actionBtn}
            >
              <Ionicons name="copy-outline" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => router.push({ pathname: '/editor', params: { id: item.id } })}
              style={styles.actionBtn}
            >
              <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
            </Pressable>

            <Pressable onPress={() => handleDeletePlan(item)} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  const isListEmpty = useMemo(() => {
    return groupedPlans.every((s) => s.data.length === 0);
  }, [groupedPlans]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {selectedIds.length > 0 ? (
        <View style={[styles.header, { borderBottomColor: colors.backgroundElement, backgroundColor: colors.backgroundElement }]}>
          <Pressable onPress={() => setSelectedIds([])} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{selectedIds.length} seleccionados</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={handleBulkCopy} style={styles.headerButton}>
              <Ionicons name="copy-outline" size={24} color={themeColor} />
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Planes a Largo Plazo</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/editor', params: { type: ItemType.PLAN } })}
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
              placeholder="Buscar planes..."
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

      {/* Year Filter Chips */}
      {!selectedIds.length && (
        <View style={styles.yearFilterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearFilterScroll}>
            {availableYears.map((year) => {
              const isActive = selectedYearFilter === year;
              return (
                <Pressable
                  key={year}
                  onPress={() => setSelectedYearFilter(year)}
                  style={[
                    styles.yearChip,
                    {
                      backgroundColor: isActive ? themeColor : colors.backgroundElement,
                      borderColor: colors.backgroundSelected,
                    },
                  ]}
                >
                  <Text style={[styles.yearChipText, { color: isActive ? '#fff' : colors.text }]}>
                    {year}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {isListEmpty ? (
        <View style={styles.emptyContainer}>
          {searchQuery ? (
            <>
              <Ionicons name="warning-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center', marginHorizontal: 24 }}>
                No se encontraron planes para "{searchQuery}"
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="compass-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center', marginHorizontal: 24 }}>
                No tienes planes a largo plazo registrados.{'\n'}Agrega cosas que te gustaría hacer en el futuro (viajes, mudanzas, proyectos).
              </Text>
            </>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {groupedPlans.map((section) => {
            if (section.data.length === 0) return null;
            return (
              <View key={section.title} style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Ionicons 
                    name={section.isCompletedSection ? "checkmark-done-circle-outline" : "calendar-outline"} 
                    size={14} 
                    color={section.isCompletedSection ? "#34C759" : themeColor} 
                  />
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
                  <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
                    <Text style={[styles.badgeText, { color: colors.text }]}>{section.data.length}</Text>
                  </View>
                </View>
                {section.data.map((item) => renderPlanItem(item))}
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
  planCard: {
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
  planTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  yearFilterContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  yearFilterScroll: {
    gap: 8,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  yearChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
