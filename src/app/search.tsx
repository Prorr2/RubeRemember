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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore, Item, ItemType } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

export default function SearchScreen() {
  const store = useRememberStore();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todo' | 'tasks' | 'reminders' | 'activities' | 'goals' | 'lists'>('todo');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Group search results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { tasks: [], reminders: [], activities: [], goals: [], lists: [] };

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
    const reminders = filteredItems.filter((i) => i.type === ItemType.REMINDER);
    const activities = filteredItems.filter((i) => i.type === ItemType.ACTIVITY);

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

    return { tasks, reminders, activities, goals, lists };
  }, [query, store.items, store.goals, store.lists, onlyFavorites, includeArchived]);

  const hasResults =
    results.tasks.length > 0 ||
    results.reminders.length > 0 ||
    results.activities.length > 0 ||
    results.goals.length > 0 ||
    results.lists.length > 0;

  const navigateToItem = (item: Item) => {
    router.push({
      pathname: '/editor',
      params: { id: item.id, type: item.type },
    });
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
            { id: 'reminders', label: 'Alarmas', icon: 'notifications-outline' },
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

            {/* REMINDERS */}
            {(activeFilter === 'todo' || activeFilter === 'reminders') && results.reminders.length > 0 && (
              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>RECORDATORIOS ({results.reminders.length})</Text>
                <View style={styles.groupContent}>
                  {results.reminders.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => navigateToItem(item)}
                      style={[styles.resultCard, { backgroundColor: colors.backgroundElement }]}
                    >
                      <View style={styles.resultHeader}>
                        <Ionicons name="notifications" size={20} color="#007AFF" />
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
});
