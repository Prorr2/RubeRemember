import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  // Alarm Modal state
  const [alarmModalVisible, setAlarmModalVisible] = useState(false);
  const [alarmTarget, setAlarmTarget] = useState<{ listId: string; itemId?: string } | null>(null);
  const [alarmHour, setAlarmHour] = useState('');
  const [alarmMinute, setAlarmMinute] = useState('');

  // Selection state
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleCopyItemText = (text: string) => {
    Clipboard.setString(text);
  };

  const selectedItemIds = Object.keys(selectedItems).filter((id) => selectedItems[id]);
  const numSelected = selectedItemIds.length;

  const handleCopySelected = () => {
    const texts: string[] = [];
    store.lists.forEach((list) => {
      list.items.forEach((item) => {
        if (selectedItems[item.id]) {
          texts.push(item.text);
        }
      });
    });

    if (texts.length === 0) return;

    Clipboard.setString(texts.join('\n\n'));
  };

  const handleClearSelection = () => {
    setSelectedItems({});
  };

  const handleCreateList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) {
      Alert.alert('Nombre vacío', 'Por favor escribe un nombre para la lista.');
      return;
    }

    if (trimmed.includes('::')) {
      const parts = trimmed.split('::').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const parentName = parts[0];
        const childName = parts[1];

        // Find existing parent list that doesn't have a parent itself
        let parentList = store.lists.find(
          (l) => l.name.toLowerCase() === parentName.toLowerCase() && !l.parentId
        );

        let parentId: string;
        if (parentList) {
          parentId = parentList.id;
        } else {
          // Create parent list
          parentId = await store.addList(parentName);
        }

        // Create child list
        await store.addList(childName, parentId);
        setNewListName('');
        return;
      }
    }

    // Normal list creation
    await store.addList(trimmed);
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

  // Alarm Scheduling Logic
  const openAlarmModal = (listId: string, itemId?: string, currentAlarmTime?: string) => {
    setAlarmTarget({ listId, itemId });
    if (currentAlarmTime) {
      const [h, m] = currentAlarmTime.split(':');
      setAlarmHour(h);
      setAlarmMinute(m);
    } else {
      const now = new Date();
      setAlarmHour(String(now.getHours()).padStart(2, '0'));
      setAlarmMinute(String(now.getMinutes()).padStart(2, '0'));
    }
    setAlarmModalVisible(true);
  };

  const handleSaveAlarm = async () => {
    if (!alarmTarget) return;

    const hour = alarmHour.trim().padStart(2, '0');
    const minute = alarmMinute.trim().padStart(2, '0');

    const hNum = parseInt(hour, 10);
    const mNum = parseInt(minute, 10);

    if (isNaN(hNum) || hNum < 0 || hNum > 23 || isNaN(mNum) || mNum < 0 || mNum > 59) {
      Alert.alert('Hora inválida', 'Por favor introduce una hora (00-23) y minuto (00-59) válidos.');
      return;
    }

    const timeStr = `${hour}:${minute}`;

    try {
      if (alarmTarget.itemId) {
        await store.setListItemAlarm(alarmTarget.listId, alarmTarget.itemId, timeStr);
      } else {
        await store.setListAlarm(alarmTarget.listId, timeStr);
      }
      setAlarmModalVisible(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo configurar la alarma.');
    }
  };

  const handleRemoveAlarm = async () => {
    if (!alarmTarget) return;

    try {
      if (alarmTarget.itemId) {
        await store.setListItemAlarm(alarmTarget.listId, alarmTarget.itemId, null);
      } else {
        await store.setListAlarm(alarmTarget.listId, null);
      }
      setAlarmModalVisible(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo eliminar la alarma.');
    }
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 100}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            numSelected > 0 && { paddingBottom: 110 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Creator form */}
          <View style={[styles.creatorCard, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.creatorTitle, { color: colors.text }]}>Crear nueva lista</Text>
            <View style={styles.creatorInputRow}>
              <TextInput
                placeholder="Nombre de la lista (ej. Compra IKEA, Libros)"
                placeholderTextColor={colors.textSecondary + '80'}
                value={newListName}
                onChangeText={setNewListName}
                multiline
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, textAlignVertical: 'top' }]}
              />
              <Pressable onPress={handleCreateList} style={styles.createButton}>
                <Ionicons name="add-circle" size={32} color="#34C759" />
              </Pressable>
            </View>
          </View>

          {/* List display backlog */}
          {(() => {
            const rootLists = store.lists.filter(list => !list.parentId);
            if (rootLists.length === 0) {
              return (
                <View style={styles.emptyContainer}>
                  <Ionicons name="list" size={64} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                  <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No tienes listas creadas.</Text>
                </View>
              );
            }

            return rootLists.map((list) => {
              const isCollapsed = list.collapsed;
              const isEditingThisList = editingListId === list.id;
              const childLists = store.lists.filter(l => l.parentId === list.id);

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
                          multiline
                          style={[styles.editListInput, { color: colors.text, textAlignVertical: 'top' }]}
                        />
                      ) : (
                        <Text style={[styles.listTitle, { color: colors.text }]}>{list.name}</Text>
                      )}
                    </Pressable>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {/* List Alarm Icon */}
                      {list.alarmTime ? (
                        <Pressable
                          onPress={() => openAlarmModal(list.id, undefined, list.alarmTime)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}
                        >
                          <Ionicons name="notifications" size={18} color="#FF9500" />
                          <Text style={{ fontSize: 12, color: '#FF9500', fontWeight: 'bold' }}>{list.alarmTime}</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => openAlarmModal(list.id, undefined, undefined)}
                          style={{ padding: 4, opacity: 0.5 }}
                        >
                          <Ionicons name="notifications-outline" size={18} color={colors.textSecondary} />
                        </Pressable>
                      )}

                      {isEditingThisList ? (
                        <Pressable onPress={handleSaveListName} style={{ padding: 4 }}>
                          <Ionicons name="checkmark-circle" size={22} color="#34C759" />
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => {
                            setEditingListId(list.id);
                            setEditingListName(list.name);
                          }}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                        </Pressable>
                      )}

                      <Pressable onPress={() => handleDeleteListPress(list.id, list.name)} style={{ padding: 4 }}>
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
                        const isItemSelected = !!selectedItems[item.id];

                        return (
                          <View
                            key={item.id}
                            style={[styles.itemRow, { borderBottomColor: colors.backgroundSelected }]}
                          >
                            {!isEditingThisItem && (
                              <Pressable
                                // Click checklist checkbox (keeps existing logic/styling)
                                onPress={() => toggleSelectItem(item.id)}
                                style={{ marginRight: 6, padding: 4 }}
                              >
                                <Ionicons
                                  name={isItemSelected ? 'checkbox' : 'square-outline'}
                                  size={20}
                                  color={isItemSelected ? '#34C759' : colors.textSecondary}
                                />
                              </Pressable>
                            )}

                            {isEditingThisItem ? (
                              <TextInput
                                value={editingItemText}
                                onChangeText={setEditingItemText}
                                autoFocus
                                multiline
                                style={[styles.editItemInput, { color: colors.text, textAlignVertical: 'top' }]}
                              />
                            ) : (
                              // Press item to mark with green check icon (persistent Completed toggling)
                              <Pressable
                                onPress={() => store.toggleListItemCompleted(list.id, item.id)}
                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                              >
                                {item.completed && (
                                  <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                                )}
                                <Text 
                                  style={[
                                    styles.itemText, 
                                    { color: colors.text },
                                    item.completed && { textDecorationLine: 'line-through', opacity: 0.6 }
                                  ]}
                                >
                                  {item.text}
                                </Text>
                              </Pressable>
                            )}

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              {/* Item Alarm Icon */}
                              {item.alarmTime ? (
                                <Pressable
                                  onPress={() => openAlarmModal(list.id, item.id, item.alarmTime)}
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 2, padding: 4 }}
                                >
                                  <Ionicons name="notifications" size={14} color="#FF9500" />
                                  <Text style={{ fontSize: 10, color: '#FF9500', fontWeight: 'bold' }}>{item.alarmTime}</Text>
                                </Pressable>
                              ) : (
                                <Pressable
                                  onPress={() => openAlarmModal(list.id, item.id, undefined)}
                                  style={{ padding: 4, opacity: 0.5 }}
                                >
                                  <Ionicons name="notifications-outline" size={14} color={colors.textSecondary} />
                                </Pressable>
                              )}

                              {!isEditingThisItem && (
                                <Pressable
                                  onPress={() => handleCopyItemText(item.text)}
                                  style={{ padding: 4 }}
                                >
                                  <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
                                </Pressable>
                              )}

                              {isEditingThisItem ? (
                                <Pressable onPress={handleSaveListItemText} style={{ padding: 4 }}>
                                  <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                                </Pressable>
                              ) : (
                                <Pressable
                                  onPress={() => {
                                    setEditingItemId({ listId: list.id, itemId: item.id });
                                    setEditingItemText(item.text);
                                  }}
                                  style={{ padding: 4 }}
                                >
                                  <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                                </Pressable>
                              )}

                              <Pressable onPress={() => store.deleteListItem(list.id, item.id)} style={{ padding: 4 }}>
                                <Ionicons name="close-circle-outline" size={16} color="#FF3B30" />
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}

                      {/* Nested Sublists inside Root List Card */}
                      {childLists.length > 0 && (
                        <View style={{ gap: 12, marginTop: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: colors.backgroundSelected }}>
                          {childLists.map((sublist) => {
                            const isSublistCollapsed = sublist.collapsed;
                            const isEditingThisSublist = editingListId === sublist.id;

                            return (
                              <View 
                                key={sublist.id} 
                                style={{ 
                                  backgroundColor: colors.background, 
                                  borderRadius: 12, 
                                  padding: 12, 
                                  borderWidth: 1,
                                  borderColor: colors.backgroundSelected,
                                  gap: 8
                                }}
                              >
                                {/* Sublist Header */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Pressable
                                    onPress={() => store.toggleListCollapse(sublist.id)}
                                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}
                                  >
                                    <Ionicons
                                      name={isSublistCollapsed ? 'chevron-forward' : 'chevron-down'}
                                      size={16}
                                      color={colors.textSecondary}
                                    />
                                    {isEditingThisSublist ? (
                                      <TextInput
                                        value={editingListName}
                                        onChangeText={setEditingListName}
                                        autoFocus
                                        multiline
                                        style={[styles.editListInput, { color: colors.text, fontSize: 14, textAlignVertical: 'top' }]}
                                      />
                                    ) : (
                                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 }}>
                                        {sublist.name}
                                      </Text>
                                    )}
                                  </Pressable>

                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {/* Sublist Alarm Icon */}
                                    {sublist.alarmTime ? (
                                      <Pressable
                                        onPress={() => openAlarmModal(sublist.id, undefined, sublist.alarmTime)}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 2, padding: 2 }}
                                      >
                                        <Ionicons name="notifications" size={14} color="#FF9500" />
                                        <Text style={{ fontSize: 10, color: '#FF9500', fontWeight: 'bold' }}>{sublist.alarmTime}</Text>
                                      </Pressable>
                                    ) : (
                                      <Pressable
                                        onPress={() => openAlarmModal(sublist.id, undefined, undefined)}
                                        style={{ padding: 2, opacity: 0.5 }}
                                      >
                                        <Ionicons name="notifications-outline" size={14} color={colors.textSecondary} />
                                      </Pressable>
                                    )}

                                    {isEditingThisSublist ? (
                                      <Pressable onPress={handleSaveListName} style={{ padding: 2 }}>
                                        <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                                      </Pressable>
                                    ) : (
                                      <Pressable
                                        onPress={() => {
                                          setEditingListId(sublist.id);
                                          setEditingListName(sublist.name);
                                        }}
                                        style={{ padding: 2 }}
                                      >
                                        <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                                      </Pressable>
                                    )}

                                    <Pressable onPress={() => handleDeleteListPress(sublist.id, sublist.name)} style={{ padding: 2 }}>
                                      <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                                    </Pressable>
                                  </View>
                                </View>

                                {/* Sublist Items */}
                                {!isSublistCollapsed && (
                                  <View style={{ gap: 6 }}>
                                    {sublist.items.map((item) => {
                                      const isEditingThisItem =
                                        editingItemId?.listId === sublist.id && editingItemId?.itemId === item.id;
                                      const isItemSelected = !!selectedItems[item.id];

                                      return (
                                        <View
                                          key={item.id}
                                          style={[styles.itemRow, { borderBottomColor: colors.backgroundSelected }]}
                                        >
                                          {!isEditingThisItem && (
                                            <Pressable
                                              onPress={() => toggleSelectItem(item.id)}
                                              style={{ marginRight: 6, padding: 4 }}
                                            >
                                              <Ionicons
                                                name={isItemSelected ? 'checkbox' : 'square-outline'}
                                                size={20}
                                                color={isItemSelected ? '#34C759' : colors.textSecondary}
                                              />
                                            </Pressable>
                                          )}

                                          {isEditingThisItem ? (
                                            <TextInput
                                              value={editingItemText}
                                              onChangeText={setEditingItemText}
                                              autoFocus
                                              multiline
                                              style={[styles.editItemInput, { color: colors.text, fontSize: 13, textAlignVertical: 'top' }]}
                                            />
                                          ) : (
                                            <Pressable
                                              onPress={() => store.toggleListItemCompleted(sublist.id, item.id)}
                                              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                            >
                                              {item.completed && (
                                                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                                              )}
                                              <Text 
                                                style={[
                                                  styles.itemText, 
                                                  { color: colors.text, fontSize: 13 },
                                                  item.completed && { textDecorationLine: 'line-through', opacity: 0.6 }
                                                ]}
                                              >
                                                {item.text}
                                              </Text>
                                            </Pressable>
                                          )}

                                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            {/* Item Alarm Icon */}
                                            {item.alarmTime ? (
                                              <Pressable
                                                onPress={() => openAlarmModal(sublist.id, item.id, item.alarmTime)}
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 2, padding: 2 }}
                                              >
                                                <Ionicons name="notifications" size={12} color="#FF9500" />
                                                <Text style={{ fontSize: 9, color: '#FF9500', fontWeight: 'bold' }}>{item.alarmTime}</Text>
                                              </Pressable>
                                            ) : (
                                              <Pressable
                                                onPress={() => openAlarmModal(sublist.id, item.id, undefined)}
                                                style={{ padding: 2, opacity: 0.5 }}
                                              >
                                                <Ionicons name="notifications-outline" size={12} color={colors.textSecondary} />
                                              </Pressable>
                                            )}

                                            {!isEditingThisItem && (
                                              <Pressable
                                                onPress={() => handleCopyItemText(item.text)}
                                                style={{ padding: 2 }}
                                              >
                                                <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
                                              </Pressable>
                                            )}

                                            {isEditingThisItem ? (
                                              <Pressable onPress={handleSaveListItemText} style={{ padding: 2 }}>
                                                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                                              </Pressable>
                                            ) : (
                                              <Pressable
                                                onPress={() => {
                                                  setEditingItemId({ listId: sublist.id, itemId: item.id });
                                                  setEditingItemText(item.text);
                                                }}
                                                style={{ padding: 2 }}
                                              >
                                                <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                                              </Pressable>
                                            )}

                                            <Pressable onPress={() => store.deleteListItem(sublist.id, item.id)} style={{ padding: 2 }}>
                                              <Ionicons name="close-circle-outline" size={14} color="#FF3B30" />
                                            </Pressable>
                                          </View>
                                        </View>
                                      );
                                    })}

                                    {/* Add sublist item input */}
                                    <View style={styles.addItemRow}>
                                      <TextInput
                                        placeholder="Añadir elemento..."
                                        placeholderTextColor={colors.textSecondary + '80'}
                                        value={newItemTexts[sublist.id] || ''}
                                        onChangeText={(txt) =>
                                          setNewItemTexts((prev) => ({ ...prev, [sublist.id]: txt }))
                                        }
                                        multiline
                                        style={[
                                          styles.itemInput,
                                          { 
                                            color: colors.text, 
                                            backgroundColor: colors.backgroundSelected, 
                                            textAlignVertical: 'top',
                                            fontSize: 12,
                                            minHeight: 32
                                          }
                                        ]}
                                      />
                                      <Pressable
                                        onPress={() => handleAddListItem(sublist.id)}
                                        style={[styles.addItemButton, { backgroundColor: '#34C759', width: 32, height: 32 }]}
                                      >
                                        <Ionicons name="add" size={18} color="#fff" />
                                      </Pressable>
                                    </View>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* Add item input inside list */}
                      <View style={styles.addItemRow}>
                        <TextInput
                          placeholder="Añadir elemento..."
                          placeholderTextColor={colors.textSecondary + '80'}
                          value={newItemTexts[list.id] || ''}
                          onChangeText={(txt) =>
                            setNewItemTexts((prev) => ({ ...prev, [list.id]: txt }))
                          }
                          multiline
                          style={[styles.itemInput, { color: colors.text, backgroundColor: colors.background, textAlignVertical: 'top' }]}
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
            });
          })()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Selection Action Bar */}
      {numSelected > 0 && (
        <View style={[styles.floatingActionBar, { backgroundColor: colors.backgroundElement, borderTopColor: colors.backgroundSelected }]}>
          <View style={styles.floatingActionBarLeft}>
            <Text style={[styles.floatingActionBarText, { color: colors.text }]}>
              {numSelected} {numSelected === 1 ? 'seleccionado' : 'seleccionados'}
            </Text>
          </View>
          <View style={styles.floatingActionBarActions}>
            <Pressable
              onPress={handleCopySelected}
              style={[styles.floatingActionBtn, { backgroundColor: '#34C759' }]}
            >
              <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
              <Text style={styles.floatingActionBtnText}>Copiar</Text>
            </Pressable>
            <Pressable
              onPress={handleClearSelection}
              style={[styles.floatingActionBtn, { backgroundColor: colors.backgroundSelected }]}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.text} />
              <Text style={[styles.floatingActionBtnText, { color: colors.text }]}>Limpiar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Alarm Configuration Modal */}
      <Modal
        visible={alarmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlarmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="alarm-outline" size={24} color="#FF9500" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Programar Recordatorio (Hoy)</Text>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Establece una hora de alarma. Se te enviará una notificación a esa hora.
            </Text>

            <View style={styles.timeInputRow}>
              <View style={styles.timeInputBox}>
                <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Hora</Text>
                <TextInput
                  value={alarmHour}
                  onChangeText={(val) => setAlarmHour(val.slice(0, 2))}
                  keyboardType="numeric"
                  placeholder="HH"
                  placeholderTextColor={colors.textSecondary + '60'}
                  maxLength={2}
                  style={[styles.timeInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
                />
              </View>

              <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>

              <View style={styles.timeInputBox}>
                <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Minutos</Text>
                <TextInput
                  value={alarmMinute}
                  onChangeText={(val) => setAlarmMinute(val.slice(0, 2))}
                  keyboardType="numeric"
                  placeholder="MM"
                  placeholderTextColor={colors.textSecondary + '60'}
                  maxLength={2}
                  style={[styles.timeInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={handleRemoveAlarm}
                style={[styles.modalBtn, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
              >
                <Text style={[styles.modalBtnText, { color: '#FF3B30' }]}>Eliminar Alarma</Text>
              </Pressable>

              <View style={{ flex: 1 }} />

              <Pressable
                onPress={() => setAlarmModalVisible(false)}
                style={[styles.modalBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveAlarm}
                style={[styles.modalBtn, { backgroundColor: '#FF9500' }]}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    flex: 1,
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
    marginRight: 8,
  },
  editItemInput: {
    fontSize: 14,
    padding: 0,
    flex: 1,
    marginRight: 8,
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  itemInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  addItemButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Alarm Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  timeInputBox: {
    alignItems: 'center',
    gap: 4,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeInput: {
    width: 70,
    height: 60,
    borderWidth: 1,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  floatingActionBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 16,
    right: 16,
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  floatingActionBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingActionBarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  floatingActionBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  floatingActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
