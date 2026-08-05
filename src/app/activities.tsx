import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  Alert,
  useColorScheme,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore, ItemType, Activity } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

export default function ActivitiesScreen() {
  const store = useRememberStore();
  const router = useRouter();
  
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  // Tab: 'SUGGESTIONS' or 'ALL'
  const [activeTab, setActiveTab] = useState<'SUGGESTIONS' | 'ALL'>('SUGGESTIONS');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Category Manager Modal States
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Trigger recommendation shuffle
  const [suggestionKey, setSuggestionKey] = useState(0);

  const suggestedList = useMemo(() => {
    // Generate suggested activities from store selector
    return store.getSuggestedActivities();
  }, [store.items, suggestionKey]);

  const filteredAllList = useMemo(() => {
    let list = store.getActivities();
    if (selectedCategory !== 'ALL') {
      list = list.filter((a) => a.category === selectedCategory);
    }
    // Sort: favorites first, then by title
    return list.sort((a, b) => {
      if (a.favourite && !b.favourite) return -1;
      if (!a.favourite && b.favourite) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [store.items, selectedCategory]);

  const handleRegisterDone = async (activity: Activity) => {
    await store.registerActivityDone(activity.id);
    Alert.alert('¡Excelente!', `Registrado: "${activity.title}".`);
  };

  const handleDeleteActivity = (activity: Activity) => {
    Alert.alert(
      'Mover a la Papelera',
      `¿Deseas mover "${activity.title}" a la papelera?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover',
          style: 'destructive',
          onPress: async () => {
            await store.deleteItem(activity.id);
          },
        },
      ]
    );
  };

  const getCategoryName = (catId: string) => {
    const cat = store.activityCategories.find((c) => c.id === catId);
    if (cat) return cat.name;
    const defaults: Record<string, string> = {
      SPORT: '🏃 Deporte',
      MOVIES: '🎬 Cine/Series',
      GAMES: '🎮 Juegos',
      RESTAURANTS: '🍔 Restaurantes',
      TRAVEL: '✈ Viajes',
      LEARNING: '📚 Leer/Aprender',
      SOCIAL: '👥 Social',
      WALK: '🌳 Pasear',
      READING: '📖 Lectura',
      OTHER: '✨ Otro',
    };
    return defaults[catId] || catId || '✨ Otro';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ocio / Tiempo Libre</Text>
        <Pressable
          onPress={() => router.push({ pathname: '/editor', params: { type: ItemType.ACTIVITY } })}
          style={styles.headerButton}
        >
          <Ionicons name="add" size={26} color="#5856D6" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setActiveTab('SUGGESTIONS')}
          style={[styles.tabBtn, activeTab === 'SUGGESTIONS' && { borderBottomColor: '#5856D6', borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'SUGGESTIONS' ? '#5856D6' : colors.textSecondary }]}>
            Sorpréndeme
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('ALL')}
          style={[styles.tabBtn, activeTab === 'ALL' && { borderBottomColor: '#5856D6', borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'ALL' ? '#5856D6' : colors.textSecondary }]}>
            Todas mis ideas
          </Text>
        </Pressable>
      </View>

      {activeTab === 'SUGGESTIONS' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.engineHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.engineTitle, { color: colors.text }]}>¿No sabes qué hacer?</Text>
              <Text style={[styles.engineDesc, { color: colors.textSecondary }]}>
                Te sugerimos actividades basadas en tus gustos y frecuencia de uso.
              </Text>
            </View>
            <Pressable
              onPress={() => setSuggestionKey((k) => k + 1)}
              style={[styles.shuffleButton, { backgroundColor: 'rgba(88, 86, 214, 0.15)' }]}
            >
              <Ionicons name="shuffle" size={20} color="#5856D6" />
              <Text style={{ color: '#5856D6', fontWeight: 'bold', fontSize: 13 }}>Mezclar</Text>
            </Pressable>
          </View>

          {suggestedList.length > 0 ? (
            <View style={styles.suggestionsGrid}>
              {suggestedList.map((activity, idx) => (
                <View key={activity.id} style={[styles.suggestedCard, { backgroundColor: colors.backgroundElement }]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.categoryBadge, { color: '#5856D6' }]}>
                      {getCategoryName(activity.category)}
                    </Text>
                    {activity.favourite && (
                      <Ionicons name="star" size={16} color="#FFCC00" />
                    )}
                  </View>

                  <Text style={[styles.activityTitle, { color: colors.text }]}>{activity.title}</Text>
                  
                  {activity.description ? (
                    <Text style={[styles.activityDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {activity.description}
                    </Text>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                      Realizada: {activity.doneCount || 0} {activity.doneCount === 1 ? 'vez' : 'veces'}
                    </Text>
                    
                    <Pressable
                      onPress={() => handleRegisterDone(activity)}
                      style={[styles.actionBadgeBtn, { backgroundColor: '#5856D6' }]}
                    >
                      <Ionicons name="checkmark" size={14} color="#fff" />
                      <Text style={styles.actionBadgeBtnText}>¡Hecho!</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles-outline" size={48} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                Agrega algunas ideas de ocio en la otra pestaña primero.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Category Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <Pressable
              onPress={() => setIsCategoryModalVisible(true)}
              style={[
                styles.filterChip,
                { backgroundColor: colors.backgroundElement, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#5856D6' },
              ]}
            >
              <Text style={[styles.filterChipText, { color: '#5856D6', fontWeight: 'bold' }]}>⚙️ Categorías</Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedCategory('ALL')}
              style={[
                styles.filterChip,
                selectedCategory === 'ALL' && { backgroundColor: '#5856D6' },
                selectedCategory !== 'ALL' && { backgroundColor: colors.backgroundElement },
              ]}
            >
              <Text style={[styles.filterChipText, { color: selectedCategory === 'ALL' ? '#fff' : colors.text }]}>Todas</Text>
            </Pressable>

            {store.activityCategories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[
                  styles.filterChip,
                  selectedCategory === cat.id && { backgroundColor: '#5856D6' },
                  selectedCategory !== cat.id && { backgroundColor: colors.backgroundElement },
                ]}
              >
                <Text style={[styles.filterChipText, { color: selectedCategory === cat.id ? '#fff' : colors.text }]}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <FlatList
            data={filteredAllList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.activityRow, { backgroundColor: colors.backgroundElement }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>
                    {item.favourite && <Ionicons name="star" size={14} color="#FFCC00" />}
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {getCategoryName(item.category)}
                    {item.doneCount ? ` · Realizada ${item.doneCount} veces` : ' · Sin realizar'}
                  </Text>
                </View>

                <View style={styles.rowActions}>
                  <Pressable
                    onPress={() => store.updateItem(item.id, { favourite: !item.favourite })}
                    style={styles.actionBtn}
                  >
                    <Ionicons name={item.favourite ? 'star' : 'star-outline'} size={18} color="#FFCC00" />
                  </Pressable>

                  <Pressable
                    onPress={() => router.push({ pathname: '/editor', params: { id: item.id } })}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                  </Pressable>

                  <Pressable onPress={() => handleDeleteActivity(item)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="sparkles-outline" size={48} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No tienes actividades registradas.</Text>
              </View>
            }
          />
      <Modal
        visible={isCategoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsCategoryModalVisible(false);
          setEditingCategoryId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Gestionar Categorías</Text>
              <Pressable
                onPress={() => {
                  setIsCategoryModalVisible(false);
                  setEditingCategoryId(null);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Input to add a new category */}
            <View style={styles.addCategoryRow}>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.backgroundSelected }]}
                placeholder="Nueva categoría (ej: 🍕 Comida)"
                placeholderTextColor={colors.textSecondary + '80'}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <Pressable
                onPress={async () => {
                  const name = newCategoryName.trim();
                  if (!name) return;
                  await store.addActivityCategory(name);
                  setNewCategoryName('');
                }}
                style={styles.addCategoryBtn}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </Pressable>
            </View>

            {/* List of categories */}
            <ScrollView contentContainerStyle={styles.modalListContent}>
              {store.activityCategories.map((cat) => {
                const isEditing = editingCategoryId === cat.id;
                return (
                  <View
                    key={cat.id}
                    style={[styles.categoryRowItem, { borderBottomColor: colors.backgroundSelected }]}
                  >
                    {isEditing ? (
                      <TextInput
                        style={[styles.editCategoryInput, { color: colors.text }]}
                        value={editingCategoryName}
                        onChangeText={setEditingCategoryName}
                        autoFocus
                      />
                    ) : (
                      <Text style={[styles.categoryRowText, { color: colors.text }]}>{cat.name}</Text>
                    )}

                    <View style={styles.categoryRowActions}>
                      {isEditing ? (
                        <>
                          <Pressable
                            onPress={async () => {
                              const name = editingCategoryName.trim();
                              if (name) {
                                await store.updateActivityCategory(cat.id, name);
                              }
                              setEditingCategoryId(null);
                            }}
                            style={styles.categoryActionBtn}
                          >
                            <Ionicons name="checkmark" size={20} color="#34C759" />
                          </Pressable>
                          <Pressable
                            onPress={() => setEditingCategoryId(null)}
                            style={styles.categoryActionBtn}
                          >
                            <Ionicons name="close" size={20} color="#FF3B30" />
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <Pressable
                            onPress={() => {
                              setEditingCategoryId(cat.id);
                              setEditingCategoryName(cat.name);
                            }}
                            style={styles.categoryActionBtn}
                          >
                            <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              if (cat.id === 'OTHER') {
                                Alert.alert('Acción no permitida', 'La categoría "Otro" es la de sistema y no se puede eliminar.');
                                return;
                              }
                              Alert.alert(
                                'Eliminar Categoría',
                                `¿Seguro que deseas eliminar "${cat.name}"? Las actividades asociadas se moverán a "Otro".`,
                                [
                                  { text: 'Cancelar', style: 'cancel' },
                                  {
                                    text: 'Eliminar',
                                    style: 'destructive',
                                    onPress: async () => {
                                      await store.deleteActivityCategory(cat.id);
                                      if (selectedCategory === cat.id) {
                                        setSelectedCategory('ALL');
                                      }
                                    },
                                  },
                                ]
                              );
                            }}
                            style={styles.categoryActionBtn}
                          >
                            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
        </View>
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
    paddingVertical: 12,
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
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  engineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  engineTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  engineDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  suggestionsGrid: {
    gap: 12,
  },
  suggestedCard: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  activityDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  actionBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBadgeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionBtn: {
    padding: 6,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  addCategoryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  modalInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addCategoryBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#5856D6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalListContent: {
    gap: 12,
    paddingBottom: 20,
  },
  categoryRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  categoryRowText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  editCategoryInput: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    paddingVertical: 4,
  },
  categoryRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryActionBtn: {
    padding: 4,
  },
});
