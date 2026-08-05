import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  SafeAreaView,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

export default function ListsScreen() {
  const store = useRememberStore();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  // List Creation state
  const [newListName, setNewListName] = useState('');

  // Editing list state
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');

  // List Item inputs state
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});

  // Editing list item state
  const [editingItemId, setEditingItemId] = useState<{ listId: string; itemId: string } | null>(null);
  const [editingItemText, setEditingItemText] = useState('');

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      Alert.alert('Nombre vacío', 'Por favor escribe un nombre para la lista.');
      return;
    }
    await store.addList(newListName);
    setNewListName('');
  };

  const handleSaveListName = async () => {
    if (!editingListId) return;
    if (!editingListName.trim()) {
      Alert.alert('Nombre vacío', 'El nombre de la lista no puede estar vacío.');
      return;
    }
    await store.updateList(editingListId, editingListName);
    setEditingListId(null);
  };

  const handleDeleteListPress = (listId: string, name: string) => {
    Alert.alert(
      'Eliminar lista',
      `¿Estás seguro de que quieres eliminar la lista "${name}" y todos sus elementos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await store.deleteList(listId);
          },
        },
      ]
    );
  };

  const handleAddListItem = async (listId: string) => {
    const text = newItemTexts[listId] || '';
    if (!text.trim()) {
      Alert.alert('Texto vacío', 'Por favor escribe el texto del elemento.');
      return;
    }
    await store.addListItem(listId, text);
    setNewItemTexts((prev) => ({ ...prev, [listId]: '' }));
  };

  const handleSaveListItemText = async () => {
    if (!editingItemId) return;
    if (!editingItemText.trim()) {
      Alert.alert('Texto vacío', 'El texto del elemento no puede estar vacío.');
      return;
    }
    await store.updateListItem(editingItemId.listId, editingItemId.itemId, editingItemText);
    setEditingItemId(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View style={[styles.header, { borderBottomColor: colors.backgroundSelected }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Listas</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Creator form */}
          <View style={[styles.creatorCard, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.creatorTitle, { color: colors.text }]}>Crear nueva lista</Text>
            <View style={styles.creatorInputRow}>
              <TextInput
                placeholder="Nombre de la lista (ej. Compra IKEA, Libros)"
                placeholderTextColor={colors.textSecondary + '80'}
                value={newListName}
                onChangeText={setNewListName}
                style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
              />
              <Pressable onPress={handleCreateList} style={styles.createButton}>
                <Ionicons name="add-circle" size={32} color="#34C759" />
              </Pressable>
            </View>
          </View>

          {/* List display backlog */}
          {store.lists.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="list" size={64} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No tienes listas creadas.</Text>
            </View>
          ) : (
            store.lists.map((list) => {
              const isCollapsed = list.collapsed;
              const isEditingThisList = editingListId === list.id;

              return (
                <View key={list.id} style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                  {/* List Header */}
                  <View style={styles.listCardHeader}>
                    <Pressable
                      onPress={() => store.toggleListCollapse(list.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}
                    >
                      <Ionicons
                        name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                        size={20}
                        color={colors.textSecondary}
                      />
                      {isEditingThisList ? (
                        <TextInput
                          value={editingListName}
                          onChangeText={setEditingListName}
                          autoFocus
                          style={[styles.editListInput, { color: colors.text }]}
                        />
                      ) : (
                        <Text style={[styles.listTitle, { color: colors.text }]}>{list.name}</Text>
                      )}
                    </Pressable>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {isEditingThisList ? (
                        <Pressable onPress={handleSaveListName}>
                          <Ionicons name="checkmark-circle" size={22} color="#34C759" />
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => {
                            setEditingListId(list.id);
                            setEditingListName(list.name);
                          }}
                        >
                          <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                        </Pressable>
                      )}

                      <Pressable onPress={() => handleDeleteListPress(list.id, list.name)}>
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                      </Pressable>
                    </View>
                  </View>

                  {/* List Items (only if not collapsed) */}
                  {!isCollapsed && (
                    <View style={styles.listBody}>
                      {/* Items List */}
                      {list.items.map((item) => {
                        const isEditingThisItem =
                          editingItemId?.listId === list.id && editingItemId?.itemId === item.id;

                        return (
                          <View
                            key={item.id}
                            style={[styles.itemRow, { borderBottomColor: colors.backgroundSelected }]}
                          >
                            {isEditingThisItem ? (
                              <TextInput
                                value={editingItemText}
                                onChangeText={setEditingItemText}
                                autoFocus
                                style={[styles.editItemInput, { color: colors.text }]}
                              />
                            ) : (
                              <Text style={[styles.itemText, { color: colors.text }]}>{item.text}</Text>
                            )}

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              {isEditingThisItem ? (
                                <Pressable onPress={handleSaveListItemText}>
                                  <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                                </Pressable>
                              ) : (
                                <Pressable
                                  onPress={() => {
                                    setEditingItemId({ listId: list.id, itemId: item.id });
                                    setEditingItemText(item.text);
                                  }}
                                >
                                  <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                                </Pressable>
                              )}

                              <Pressable onPress={() => store.deleteListItem(list.id, item.id)}>
                                <Ionicons name="close-circle-outline" size={16} color="#FF3B30" />
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}

                      {/* Add item input inside list */}
                      <View style={styles.addItemRow}>
                        <TextInput
                          placeholder="Añadir elemento..."
                          placeholderTextColor={colors.textSecondary + '80'}
                          value={newItemTexts[list.id] || ''}
                          onChangeText={(txt) =>
                            setNewItemTexts((prev) => ({ ...prev, [list.id]: txt }))
                          }
                          style={[styles.itemInput, { color: colors.text, backgroundColor: colors.background }]}
                        />
                        <Pressable
                          onPress={() => handleAddListItem(list.id)}
                          style={[styles.addItemButton, { backgroundColor: '#34C759' }]}
                        >
                          <Ionicons name="add" size={20} color="#fff" />
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  creatorCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  creatorTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  creatorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  createButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  listCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  editListInput: {
    fontSize: 16,
    fontWeight: '700',
    padding: 0,
    flex: 1,
  },
  listBody: {
    gap: 10,
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  itemText: {
    fontSize: 14,
    flex: 1,
  },
  editItemInput: {
    fontSize: 14,
    padding: 0,
    flex: 1,
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  itemInput: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  addItemButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
