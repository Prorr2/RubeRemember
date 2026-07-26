import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  Alert,
  useColorScheme,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar as RNStatusBar,
  Animated,
  PanResponder,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore, Reminder, Comment } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

const ReminderBubbleText = ({ item, onEditPress }: { item: Reminder; onEditPress: (item: Reminder) => void }) => {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  return (
    <Pressable onPress={() => onEditPress(item)}>
      <Text
        style={[
          styles.reminderText,
          { color: colors.text },
          item.completed && { textDecorationLine: 'line-through', opacity: 0.6 },
        ]}
      >
        {item.text}
      </Text>
    </Pressable>
  );
};

export default function RememberDashboard() {
  const store = useRememberStore();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  // Component States
  const [inputText, setInputText] = useState('');
  const [highlightedReminderId, setHighlightedReminderId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(undefined);

  // Comments States
  const [expandedReminders, setExpandedReminders] = useState<Record<string, boolean>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [showCommentsSection, setShowCommentsSection] = useState<Record<string, boolean>>({});
  
  // Floating bubble text editor states
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editingText, setEditingText] = useState('');

  // Date/Time picker modal states
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'create' | 'edit'>('create');
  const [activeEditId, setActiveEditId] = useState<string | null>(null);

  // States for Date/Time picker selection
  const [chosenDate, setChosenDate] = useState(''); // "YYYY-MM-DD"
  const [chosenHour, setChosenHour] = useState(12);
  const [chosenMinute, setChosenMinute] = useState(0);

  // Calendar navigation state (only for the picker modal)
  const [pickerMonth, setPickerMonth] = useState(new Date());

  const flatListRef = useRef<any>(null);
  // Split Pane Slider Height
  const headerHeightAnim = useRef(new Animated.Value(320)).current;
  const currentHeight = useRef(320);
  const startHeight = useRef(320);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const listenerId = headerHeightAnim.addListener(({ value }) => {
      currentHeight.current = value;
    });
    return () => {
      headerHeightAnim.removeListener(listenerId);
    };
  }, []);

  const handleToggleHeader = () => {
    const targetVal = isMinimized ? 320 : 50;
    Animated.spring(headerHeightAnim, {
      toValue: targetVal,
      useNativeDriver: false,
    }).start(() => {
      setIsMinimized(targetVal === 50);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startHeight.current = currentHeight.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        const newHeight = startHeight.current + gestureState.dy;
        headerHeightAnim.setValue(Math.max(50, Math.min(320, newHeight)));
      },
      onPanResponderRelease: (evt, gestureState) => {
        const targetVal = (startHeight.current + gestureState.dy) < 185 ? 50 : 320;
        Animated.spring(headerHeightAnim, {
          toValue: targetVal,
          useNativeDriver: false,
        }).start(() => {
          setIsMinimized(targetVal === 50);
        });
      },
    })
  ).current;

  // Header Opacity Animations linked to header height
  const expandedOpacity = headerHeightAnim.interpolate({
    inputRange: [100, 250],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const minimizedOpacity = headerHeightAnim.interpolate({
    inputRange: [50, 150],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Set default picker values on mount
  useEffect(() => {
    resetPickerToDefault();
  }, []);

  const resetPickerToDefault = () => {
    const now = new Date();
    // Default to today
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    setChosenDate(`${y}-${m}-${d}`);

    // Default to current time + 10 mins
    let defaultHour = now.getHours();
    let defaultMin = Math.ceil((now.getMinutes() + 10) / 5) * 5;
    if (defaultMin >= 60) {
      defaultMin = 0;
      defaultHour = (defaultHour + 1) % 24;
    }
    setChosenHour(defaultHour);
    setChosenMinute(defaultMin);
    setPickerMonth(new Date());
  };

  const handleCommentTextChange = (reminderId: string, val: string) => {
    setNewCommentTexts((prev) => ({ ...prev, [reminderId]: val }));
  };

  const handleAddCommentSubmit = async (reminderId: string) => {
    const txt = newCommentTexts[reminderId] || '';
    if (!txt.trim()) return;
    await store.addComment(reminderId, txt);
    setNewCommentTexts((prev) => ({ ...prev, [reminderId]: '' }));
  };

  const toggleExpandComments = (reminderId: string) => {
    setExpandedReminders((prev) => ({
      ...prev,
      [reminderId]: !prev[reminderId],
    }));
  };

  const toggleCommentsSection = (reminderId: string) => {
    setShowCommentsSection((prev) => ({
      ...prev,
      [reminderId]: !prev[reminderId],
    }));
  };

  const getLocalDateStr = (date: Date = new Date()): string => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Quick Preset Handlers
  const handleQuickPreset = (preset: 'today' | 'tomorrow' | '1hour' | '4hours') => {
    const date = new Date();
    if (preset === 'tomorrow') {
      date.setDate(date.getDate() + 1);
    } else if (preset === '1hour') {
      date.setHours(date.getHours() + 1);
    } else if (preset === '4hours') {
      date.setHours(date.getHours() + 4);
    }

    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    setChosenDate(`${y}-${m}-${d}`);
    setChosenHour(date.getHours());
    setChosenMinute(Math.floor(date.getMinutes() / 5) * 5);
    setPickerMonth(date);
  };

  // Save Reminder Creation or Edit
  const handleSaveReminder = async () => {
    const formattedHour = chosenHour.toString().padStart(2, '0');
    const formattedMin = chosenMinute.toString().padStart(2, '0');
    // If a slot is selected, use the start time as base (store will auto-adjust)
    let timeStr = `${formattedHour}:${formattedMin}`;

    // Validate slot capacity
    if (selectedSlotId) {
      const slot = store.timeSlots.find((s) => s.id === selectedSlotId);
      if (slot) {
        const [sh, sm] = slot.startTime.split(':').map(Number);
        const [eh, em] = slot.endTime.split(':').map(Number);
        const durationMin = (eh * 60 + em) - (sh * 60 + sm);
        const maxItems = store.slotSeparationMinutes > 0
          ? Math.floor(durationMin / store.slotSeparationMinutes)
          : 999;
        const existingInSlot = store.reminders.filter(
          (r) => r.timeSlotId === selectedSlotId && r.date === chosenDate
            && (pickerMode === 'edit' ? r.id !== activeEditId : true)
        ).length;
        if (existingInSlot >= maxItems) {
          Alert.alert(
            'Franja horaria llena',
            `La franja "${slot.name}" ya tiene ${existingInSlot} recordatorio${existingInSlot !== 1 ? 's' : ''} el ${chosenDate} y no caben más con una separación de ${store.slotSeparationMinutes} min.\n\nAumenta la separación o elige otra franja.`
          );
          return;
        }
        timeStr = slot.startTime;
      }
    }

    if (pickerMode === 'create') {
      if (!inputText.trim()) {
        Alert.alert('Escribe un mensaje', 'El mensaje del recordatorio no puede estar vacío.');
        return;
      }
      await store.addReminder(inputText, chosenDate, timeStr, selectedSlotId);
      setInputText('');
      setIsPickerVisible(false);
      setSelectedSlotId(undefined);
      resetPickerToDefault();
      // Scroll to bottom
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
    } else if (pickerMode === 'edit' && activeEditId) {
      const existing = store.reminders.find((r) => r.id === activeEditId);
      const textToSave = inputText.trim() || existing?.text || '';
      if (!textToSave) {
        Alert.alert('Escribe un mensaje', 'El mensaje del recordatorio no puede estar vacío.');
        return;
      }
      await store.updateReminder(activeEditId, textToSave, chosenDate, timeStr, selectedSlotId);
      setInputText('');
      setIsPickerVisible(false);
      setActiveEditId(null);
      setSelectedSlotId(undefined);
      resetPickerToDefault();
    }
  };

  const handleCancelPicker = () => {
    setIsPickerVisible(false);
    setInputText('');
    setActiveEditId(null);
    resetPickerToDefault();
  };

  const handleSwitchToDatePicker = () => {
    if (editingReminder) {
      const currentText = editingText;
      setEditingReminder(null);
      setPickerMode('edit');
      setActiveEditId(editingReminder.id);
      setInputText(currentText);
      setChosenDate(editingReminder.date);
      
      const [h, min] = editingReminder.time.split(':').map(Number);
      setChosenHour(h);
      setChosenMinute(min);

      const [yr, mo] = editingReminder.date.split('-').map(Number);
      setPickerMonth(new Date(yr, mo - 1, 1));
      setIsPickerVisible(true);
    }
  };

  const handleEditPress = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditingText(reminder.text);
  };

  const handleReminderTap = (id: string) => {
    // 1. Collapse header
    Animated.spring(headerHeightAnim, {
      toValue: 50,
      useNativeDriver: false,
    }).start(() => {
      setIsMinimized(true);
    });

    // 2. Find index in sortedReminders
    const index = sortedReminders.findIndex(r => r.id === id);
    if (index !== -1) {
      // Scroll to index
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });

      // 3. Highlight the item
      setHighlightedReminderId(id);
      setTimeout(() => {
        setHighlightedReminderId(null);
      }, 2500);
    }
  };

  const handleDeleteCompletedPress = () => {
    const completedCount = store.reminders.filter(r => r.completed).length;
    if (completedCount === 0) {
      Alert.alert(
        'Sin recordatorios marcados',
        'No tienes recordatorios marcados como completados para borrar.'
      );
      return;
    }

    Alert.alert(
      'Borrar recordatorios marcados',
      `¿Estás seguro de que deseas borrar los ${completedCount} recordatorios marcados como completados?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            await store.deleteCompleted();
            Alert.alert('Éxito', 'Se borraron los recordatorios marcados.');
          }
        }
      ]
    );
  };

  const handleCreatePress = () => {
    if (!inputText.trim()) {
      Alert.alert('Escribe un mensaje', 'Escribe primero el mensaje del recordatorio en la barra de chat.');
      return;
    }
    setPickerMode('create');
    setIsPickerVisible(true);
  };

  const lastScrollY = useRef(0);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 20 && offsetY > lastScrollY.current) {
      setIsUpcomingExpanded(false);
      setIsImportantExpanded(false);
    } else if (offsetY <= 5) {
      setIsUpcomingExpanded(true);
      setIsImportantExpanded(true);
    }
    lastScrollY.current = offsetY;
  };

  const handleDeletePress = (id: string) => {
    Alert.alert('Borrar Recordatorio', '¿Estás seguro de que quieres eliminar este recordatorio?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => store.deleteReminder(id) },
    ]);
  };

  // Picker Calendar Helpers
  const getDaysInMonth = (date: Date): { dayNum: number; dateStr: string; isCurrentMonth: boolean }[] => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    
    // Day of the week for first day (0 = Sunday, 1 = Monday, etc. Let's offset so 0 = Monday)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6; // Sunday becomes index 6

    // Previous Month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDay = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, prevDay);
      days.push({
        dayNum: prevDay,
        dateStr: getLocalDateStr(prevDate),
        isCurrentMonth: false,
      });
    }

    // Current Month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const curDate = new Date(year, month, i);
      days.push({
        dayNum: i,
        dateStr: getLocalDateStr(curDate),
        isCurrentMonth: true,
      });
    }

    // Next Month padding days to complete grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        dayNum: i,
        dateStr: getLocalDateStr(nextDate),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const changeMonth = (offset: number) => {
    const newMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + offset, 1);
    setPickerMonth(newMonth);
  };

  const getMonthNameSpanish = (date: Date): string => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Sort reminders chronologically
  const sortedReminders = [...store.reminders].sort((a, b) => {
    const dateTimeA = `${a.date}T${a.time}`;
    const dateTimeB = `${b.date}T${b.time}`;
    return dateTimeA.localeCompare(dateTimeB);
  });

  const getDaysDifference = (dateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateStr.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const upcomingReminders = store.reminders
    .filter((item) => {
      if (item.completed) return false;
      const diff = getDaysDifference(item.date);
      return diff >= 0 && diff <= store.proximityDays;
    })
    .sort((a, b) => {
      const dateTimeA = `${a.date}T${a.time}`;
      const dateTimeB = `${b.date}T${b.time}`;
      return dateTimeA.localeCompare(dateTimeB);
    });

  const pinnedReminders = store.reminders
    .filter((item) => item.pinned)
    .sort((a, b) => {
      const dateTimeA = `${a.date}T${a.time}`;
      const dateTimeB = `${b.date}T${b.time}`;
      return dateTimeA.localeCompare(dateTimeB);
    });

  const formatDisplayDate = (dateStr: string): string => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Get WhatsApp-style date header text
  const getDateSeparatorText = (dateStr: string): string => {
    const today = getLocalDateStr();
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrow = getLocalDateStr(tomorrowObj);
    
    if (dateStr === today) {
      return 'HOY';
    } else if (dateStr === tomorrow) {
      return 'MAÑANA';
    } else {
      const [y, m, d] = dateStr.split('-');
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      return `${parseInt(d, 10)} de ${months[parseInt(m, 10) - 1]} de ${y}`;
    }
  };

  const renderChatItem = ({ item, index }: { item: Reminder; index: number }) => {
    // Determine whether to display a date separator header
    const showDateHeader = index === 0 || sortedReminders[index - 1].date !== item.date;

    const commentsList = item.comments || [];
    const isExpanded = expandedReminders[item.id] || false;
    const isCommentsVisible = showCommentsSection[item.id] || false;
    const visibleComments = isExpanded ? commentsList : commentsList.slice(0, 2);
    const showVerMasBtn = commentsList.length > 2;

    return (
      <View style={{ width: '100%' }}>
        {showDateHeader && (
          <View style={styles.dateSeparatorRow}>
            <View style={[styles.dateSeparatorLine, { backgroundColor: colors.backgroundSelected }]} />
            <View style={[styles.dateSeparatorPill, { backgroundColor: colors.backgroundSelected }]}>
              <Text style={[styles.dateSeparatorText, { color: colors.textSecondary }]}>
                {getDateSeparatorText(item.date)}
              </Text>
            </View>
            <View style={[styles.dateSeparatorLine, { backgroundColor: colors.backgroundSelected }]} />
          </View>
        )}

        <View style={styles.chatMessageRow}>
          <View
            style={[
              styles.reminderBubble,
              { backgroundColor: colors.backgroundElement },
              item.id === highlightedReminderId && {
                borderColor: '#FF9500',
                borderWidth: 2,
                shadowColor: '#FF9500',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 10,
                elevation: 10,
              }
            ]}
          >
            {/* Action Header Row */}
            <View style={styles.bubbleActionRow}>
              <View style={styles.leftActionGroup}>
                {/* Complete Toggle */}
                <Pressable
                  onPress={() => store.toggleReminderCompleted(item.id)}
                  style={styles.actionBtn}
                >
                  <Ionicons
                    name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={item.completed ? '#34C759' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: item.completed ? '#34C759' : colors.textSecondary },
                    ]}
                  >
                    {item.completed ? 'Completado' : 'Marcar'}
                  </Text>
                </Pressable>

                {/* Pin Button */}
                <Pressable
                  onPress={() => store.toggleReminderPinned(item.id)}
                  style={styles.actionBtn}
                >
                  <Ionicons
                    name={item.pinned ? 'pin' : 'pin-outline'}
                    size={18}
                    color={item.pinned ? '#AF52DE' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: item.pinned ? '#AF52DE' : colors.textSecondary },
                    ]}
                  >
                    {item.pinned ? 'Fijado' : 'Fijar'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.rightActionGroup}>
                {/* Edit */}
                <Pressable onPress={() => handleEditPress(item)} style={styles.actionBtn}>
                  <Ionicons name="create-outline" size={18} color="#007AFF" />
                </Pressable>

                {/* Delete */}
                <Pressable onPress={() => handleDeletePress(item.id)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                </Pressable>
              </View>
            </View>

            {/* Reminder Content */}
            <ReminderBubbleText item={item} onEditPress={handleEditPress} />

            {/* Comments Section (YouTube-style comments list & adding option) */}
            {isCommentsVisible && (
              <View style={[styles.commentsContainer, { borderTopColor: colors.backgroundSelected }]}>
                <View style={styles.commentsHeader}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.commentsCountText, { color: colors.textSecondary }]}>
                    {commentsList.length} {commentsList.length === 1 ? 'comentario' : 'comentarios'}
                  </Text>
                </View>

                {/* Comments List */}
                {visibleComments.map((comment) => {
                  const isEditingThisComment = editingCommentId === comment.id;

                  return (
                    <View key={comment.id} style={styles.commentItem}>
                      <View style={styles.commentTextWrapper}>
                        {isEditingThisComment ? (
                          <TextInput
                            value={editingCommentText}
                            onChangeText={setEditingCommentText}
                            style={[
                              styles.editCommentInput,
                              { color: colors.text, backgroundColor: colors.backgroundSelected },
                            ]}
                            autoFocus
                            multiline
                        />
                        ) : (
                          <Text style={[styles.commentText, { color: colors.text }]}>
                            {comment.text}
                          </Text>
                        )}
                        <Text style={[styles.commentTime, { color: colors.textSecondary }]}>
                          {comment.createdAt}
                        </Text>
                      </View>

                      {/* Comment Action Buttons (Edit/Delete) */}
                      <View style={styles.commentActions}>
                        {isEditingThisComment ? (
                          <>
                            <Pressable
                              onPress={async () => {
                                await store.updateComment(item.id, comment.id, editingCommentText);
                                setEditingCommentId(null);
                                setEditingCommentText('');
                              }}
                              style={styles.commentIconBtn}
                            >
                              <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                setEditingCommentId(null);
                                setEditingCommentText('');
                              }}
                              style={styles.commentIconBtn}
                            >
                              <Ionicons name="close-circle-outline" size={16} color="#FF3B30" />
                            </Pressable>
                          </>
                        ) : (
                          <>
                            <Pressable
                              onPress={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.text);
                              }}
                              style={styles.commentIconBtn}
                            >
                              <Ionicons name="create-outline" size={14} color="#007AFF" />
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                Alert.alert('Borrar Comentario', '¿Estás seguro de que quieres eliminar este comentario?', [
                                  { text: 'Cancelar', style: 'cancel' },
                                  { text: 'Eliminar', style: 'destructive', onPress: () => store.deleteComment(item.id, comment.id) },
                                ]);
                              }}
                              style={styles.commentIconBtn}
                            >
                              <Ionicons name="trash-outline" size={14} color="#FF3B30" />
                            </Pressable>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* View More / View Less Toggle */}
                {showVerMasBtn && (
                  <Pressable
                    onPress={() => toggleExpandComments(item.id)}
                    style={styles.verMasBtn}
                  >
                    <Text style={styles.verMasText}>
                      {isExpanded ? 'Ver menos' : `Ver más (${commentsList.length - 2} más)`}
                    </Text>
                  </Pressable>
                )}

                {/* Add Comment Field */}
                <View style={styles.addCommentRow}>
                  <TextInput
                    placeholder="Añadir comentario..."
                    placeholderTextColor={colors.textSecondary}
                    value={newCommentTexts[item.id] || ''}
                    onChangeText={(val) => handleCommentTextChange(item.id, val)}
                    style={[styles.addCommentInput, { color: colors.text, backgroundColor: colors.backgroundSelected }]}
                    multiline
                  />
                  <Pressable
                    onPress={() => handleAddCommentSubmit(item.id)}
                    style={styles.addCommentBtn}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Bottom Row: Time and Alarm Indicator */}
            <View style={styles.bubbleFooter}>
              <View style={styles.footerLeftActions}>
                <Pressable
                  onPress={() => store.scheduleSystemAlarm(item)}
                  style={[
                    styles.bubbleAlarmBadge,
                    {
                      backgroundColor: item.alarmScheduled
                        ? 'rgba(255, 149, 0, 0.15)'
                        : 'rgba(255, 255, 255, 0.05)',
                      borderColor: item.alarmScheduled ? '#FF9500' : 'rgba(255, 255, 255, 0.1)',
                    },
                  ]}
                >
                  <Ionicons
                    name={item.alarmScheduled ? 'notifications' : 'notifications-outline'}
                    size={14}
                    color="#FF9500"
                  />
                  <Text style={[styles.bubbleAlarmBadgeText, { color: '#FF9500' }]}>
                    {item.alarmScheduled ? 'Alarma Activa' : 'Poner Alarma'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => toggleCommentsSection(item.id)}
                  style={[
                    styles.bubbleAlarmBadge,
                    {
                      backgroundColor: isCommentsVisible
                        ? 'rgba(0, 122, 255, 0.15)'
                        : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isCommentsVisible ? '#007AFF' : 'rgba(255, 255, 255, 0.1)',
                    },
                  ]}
                >
                  <Ionicons
                    name={commentsList.length > 0 ? 'chatbubble-ellipses' : 'chatbubble-outline'}
                    size={14}
                    color={isCommentsVisible ? '#007AFF' : colors.textSecondary}
                  />
                  <Text style={[styles.bubbleAlarmBadgeText, { color: isCommentsVisible ? '#007AFF' : colors.textSecondary }]}>
                    {commentsList.length > 0 ? `${commentsList.length}` : 'Comentar'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.timeWrapper}>
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                  {item.time}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const getCalendarList = () => {
    const days = getDaysInMonth(pickerMonth);
    const dayHeaders = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    return (
      <View style={styles.calendarContainer}>
        {/* Month Navigation */}
        <View style={styles.monthNavRow}>
          <Pressable onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
            <Ionicons name="chevron-back" size={20} color="#FF9500" />
          </Pressable>
          <Text style={[styles.monthNavTitle, { color: colors.text }]}>
            {getMonthNameSpanish(pickerMonth)}
          </Text>
          <Pressable onPress={() => changeMonth(1)} style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={20} color="#FF9500" />
          </Pressable>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekHeaderRow}>
          {dayHeaders.map((h, i) => (
            <Text key={i} style={[styles.weekHeaderCell, { color: colors.textSecondary }]}>
              {h}
            </Text>
          ))}
        </View>

        {/* Days grid */}
        <View style={styles.daysGrid}>
          {days.map((item, idx) => {
            const isSelected = chosenDate === item.dateStr;
            const isToday = item.dateStr === getLocalDateStr();

            return (
              <Pressable
                key={idx}
                onPress={() => setChosenDate(item.dateStr)}
                style={[
                  styles.dayCell,
                  !item.isCurrentMonth && styles.fadedDayCell,
                  isToday && styles.todayDayCell,
                  isSelected && styles.selectedDayCell,
                ]}
              >
                <Text
                  style={[
                    styles.dayCellText,
                    { color: item.isCurrentMonth ? colors.text : colors.textSecondary },
                    isSelected && { color: '#000000', fontWeight: 'bold' },
                    isToday && !isSelected && { color: '#FF9500', fontWeight: 'bold' },
                  ]}
                >
                  {item.dayNum}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.select({ ios: 90, default: 0 })}
        style={{ flex: 1 }}
      >
        {/* App Title Header */}
        <View style={[styles.appHeader, { borderBottomColor: colors.backgroundSelected }]}>
          <View style={styles.titleWrapper}>
            <Text style={styles.logoEmoji}>💬</Text>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>RubeRemember</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Chat de Recordatorios
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              onPress={handleDeleteCompletedPress}
              style={styles.settingsHeaderBtn}
            >
              <Ionicons name="trash-outline" size={22} color="#34C759" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/slots')}
              style={styles.settingsHeaderBtn}
            >
              <Ionicons name="time-outline" size={22} color="#AF52DE" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/backup')}
              style={styles.settingsHeaderBtn}
            >
              <Ionicons name="cloud-upload-outline" size={22} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          {/* Top Panel (Collapsible Split Pane) */}
          <Animated.View
            style={{
              height: headerHeightAnim,
              overflow: 'hidden',
              backgroundColor: colors.background,
            }}
          >
            {/* Expanded Content */}
            <Animated.View style={{ opacity: expandedOpacity, flex: 1, pointerEvents: isMinimized ? 'none' : 'auto' }}>
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
                {/* Upcoming Reminders Section (Blue Theme) */}
                <View style={styles.upcomingSection}>
                  <View style={styles.upcomingHeader}>
                    <View style={styles.upcomingTitleGroup}>
                      <Ionicons name="calendar-outline" size={16} color="#007AFF" />
                      <Text style={[styles.upcomingTitle, { color: colors.text }]}>Próximos Eventos</Text>
                    </View>
                    
                    {/* Days Proximity Adjuster */}
                    <View style={styles.daysAdjusterContainer}>
                      <Pressable
                        onPress={() => store.setProximityDays(Math.max(1, store.proximityDays - 1))}
                        style={[styles.adjusterBtn, { backgroundColor: 'rgba(0, 122, 255, 0.15)' }]}
                      >
                        <Text style={styles.adjusterBtnText}>-</Text>
                      </Pressable>
                      
                      <Text style={[styles.daysText, { color: '#007AFF' }]}>
                        {store.proximityDays} días
                      </Text>
                      
                      <Pressable
                        onPress={() => store.setProximityDays(Math.min(365, store.proximityDays + 1))}
                        style={[styles.adjusterBtn, { backgroundColor: 'rgba(0, 122, 255, 0.15)' }]}
                      >
                        <Text style={styles.adjusterBtnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>

                  {upcomingReminders.length === 0 ? (
                    <View style={[styles.emptyUpcomingCard, { borderColor: 'rgba(0, 122, 255, 0.2)', marginHorizontal: 16 }]}>
                      <Text style={[styles.emptyUpcomingText, { color: colors.textSecondary }]}>
                        No hay recordatorios próximos en los siguientes {store.proximityDays} días.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.gridContainer}>
                      {upcomingReminders.map((item) => {
                        const diff = getDaysDifference(item.date);
                        let diffLabel = '';
                        if (diff === 0) diffLabel = 'Hoy';
                        else if (diff === 1) diffLabel = 'Mañana';
                        else diffLabel = `En ${diff} d`;

                        return (
                          <Pressable
                            key={`upcoming-${item.id}`}
                            onPress={() => handleReminderTap(item.id)}
                            style={[
                              styles.gridCard,
                              {
                                backgroundColor: 'rgba(0, 122, 255, 0.08)',
                                borderColor: 'rgba(0, 122, 255, 0.3)',
                              },
                            ]}
                          >
                            <View style={styles.gridCardHeader}>
                              <Text style={[styles.gridCardDiff, { color: '#007AFF' }]}>{diffLabel}</Text>
                              <View style={styles.gridCardTimeGroup}>
                                <Ionicons name="time-outline" size={10} color="#007AFF" />
                                <Text style={[styles.gridCardTime, { color: '#007AFF' }]}>{item.time}</Text>
                              </View>
                            </View>
                            <Text
                              numberOfLines={2}
                              style={[styles.gridCardText, { color: colors.text }]}
                            >
                              {item.text}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Pinned Important Reminders Section (Purple Theme) */}
                <View style={styles.importantSection}>
                  <View style={styles.importantHeader}>
                    <View style={styles.importantTitleGroup}>
                      <Ionicons name="pin" size={16} color="#AF52DE" />
                      <Text style={[styles.importantTitle, { color: colors.text }]}>Importante</Text>
                    </View>
                  </View>

                  {pinnedReminders.length === 0 ? (
                    <View style={[styles.emptyImportantCard, { borderColor: 'rgba(175, 82, 222, 0.2)', marginHorizontal: 16 }]}>
                      <Text style={[styles.emptyImportantText, { color: colors.textSecondary }]}>
                        No hay recordatorios importantes fijados.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.gridContainer}>
                      {pinnedReminders.map((item) => {
                        const diff = getDaysDifference(item.date);
                        let diffLabel = '';
                        if (diff === 0) diffLabel = 'Hoy';
                        else if (diff === 1) diffLabel = 'Mañana';
                        else if (diff > 1) diffLabel = `En ${diff} d`;
                        else diffLabel = `Hace ${Math.abs(diff)} d`;

                        return (
                          <Pressable
                            key={`important-${item.id}`}
                            onPress={() => handleReminderTap(item.id)}
                            style={[
                              styles.gridCard,
                              {
                                backgroundColor: 'rgba(175, 82, 222, 0.08)',
                                borderColor: 'rgba(175, 82, 222, 0.3)',
                              },
                            ]}
                          >
                            <View style={styles.gridCardHeader}>
                              <Text style={[styles.gridCardDiff, { color: '#AF52DE' }]}>{diffLabel}</Text>
                              <View style={styles.gridCardTimeGroup}>
                                <Ionicons name="time-outline" size={10} color="#AF52DE" />
                                <Text style={[styles.gridCardTime, { color: '#AF52DE' }]}>{item.time}</Text>
                              </View>
                            </View>
                            <Text
                              numberOfLines={2}
                              style={[styles.gridCardText, { color: colors.text }]}
                            >
                              {item.text}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Global Alarm Scheduler Button (Only visible if there are reminders) */}
                {store.reminders.length > 0 && (
                  <Pressable
                    onPress={() => {
                      store.scheduleAllAlarms();
                    }}
                    style={styles.globalAlarmBtn}
                  >
                    <Ionicons name="notifications" size={18} color="#FFFFFF" />
                    <Text style={styles.globalAlarmBtnText}>
                      Programar todas las alarmas en el sistema
                    </Text>
                  </Pressable>
                )}
              </ScrollView>
            </Animated.View>

            {/* Minimized Content */}
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 50,
                opacity: minimizedOpacity,
                pointerEvents: isMinimized ? 'auto' : 'none',
                justifyContent: 'center',
                paddingHorizontal: 16,
              }}
            >
              <Pressable onPress={handleToggleHeader} style={styles.minimizedHeaderRow}>
                <View style={styles.minimizedItem}>
                  <Ionicons name="calendar-outline" size={16} color="#007AFF" />
                  <Text style={[styles.minimizedText, { color: colors.text }]}>
                    Eventos ({upcomingReminders.length})
                  </Text>
                </View>
                <View style={styles.minimizedSeparator} />
                <View style={styles.minimizedItem}>
                  <Ionicons name="pin" size={16} color="#AF52DE" />
                  <Text style={[styles.minimizedText, { color: colors.text }]}>
                    Importantes ({pinnedReminders.length})
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
              </Pressable>
            </Animated.View>
          </Animated.View>

          {/* Drag Divider Bar */}
          <View {...panResponder.panHandlers} style={[styles.dragDivider, { backgroundColor: colors.backgroundSelected, borderBottomColor: colors.backgroundSelected, borderBottomWidth: 1 }]}>
            <View style={[styles.dragHandle, { backgroundColor: colors.textSecondary }]} />
          </View>

          {/* Chat Message List */}
          <FlatList
            ref={flatListRef}
            data={sortedReminders}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatListContent}
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0.5,
                });
              }, 100);
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No hay recordatorios registrados.
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Escribe un recordatorio abajo y haz clic en programar.
                </Text>
              </View>
            }
          />
        </View>

        {/* Bottom Chat Input Composer */}
        <View style={[styles.composerContainer, { backgroundColor: colors.backgroundElement }]}>
          <TextInput
            placeholder="Nuevo recordatorio..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            style={[styles.composerInput, { color: colors.text, backgroundColor: colors.backgroundSelected }]}
            multiline
            maxLength={200}
          />
          
          <View style={styles.composerActionRow}>
            <Pressable
              onPress={handleCreatePress}
              style={[styles.composerActionBtn, { backgroundColor: colors.backgroundSelected }]}
            >
              <Ionicons name="calendar" size={18} color="#FF9500" />
              <Text style={[styles.composerActionText, { color: colors.text }]}>
                {formatDisplayDate(chosenDate)} a las {chosenHour.toString().padStart(2, '0')}:{chosenMinute.toString().padStart(2, '0')}
              </Text>
            </Pressable>

            <Pressable onPress={handleCreatePress} style={styles.sendIconBtn}>
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Custom Date Time Picker Modal */}
        <Modal visible={isPickerVisible} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.pickerCard, { backgroundColor: colors.backgroundElement }]}>
                <View style={styles.pickerHeader}>
                  <Text style={[styles.pickerTitle, { color: colors.text }]}>
                    {pickerMode === 'create' ? 'Programar Recordatorio' : 'Editar Recordatorio'}
                  </Text>
                  <Pressable onPress={handleCancelPicker}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </Pressable>
                </View>

                {/* Text / Title Input */}
                <View style={styles.modalTextInputContainer}>
                  <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>
                    Mensaje del Recordatorio:
                  </Text>
                  <TextInput
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Escribe el recordatorio..."
                    placeholderTextColor={colors.textSecondary}
                    style={[
                      styles.modalTextInput,
                      {
                        color: colors.text,
                        backgroundColor: colors.backgroundSelected,
                        borderColor: 'rgba(255, 149, 0, 0.3)',
                      },
                    ]}
                    multiline
                  />
                </View>

                {/* Quick Preset Buttons */}
                <View style={styles.presetsRow}>
                  <Pressable onPress={() => handleQuickPreset('today')} style={[styles.presetItem, { backgroundColor: colors.backgroundSelected }]}>
                    <Text style={[styles.presetText, { color: colors.text }]}>Hoy</Text>
                  </Pressable>
                  <Pressable onPress={() => handleQuickPreset('tomorrow')} style={[styles.presetItem, { backgroundColor: colors.backgroundSelected }]}>
                    <Text style={[styles.presetText, { color: colors.text }]}>Mañana</Text>
                  </Pressable>
                  <Pressable onPress={() => handleQuickPreset('1hour')} style={[styles.presetItem, { backgroundColor: colors.backgroundSelected }]}>
                    <Text style={[styles.presetText, { color: colors.text }]}>+1 H</Text>
                  </Pressable>
                  <Pressable onPress={() => handleQuickPreset('4hours')} style={[styles.presetItem, { backgroundColor: colors.backgroundSelected }]}>
                    <Text style={[styles.presetText, { color: colors.text }]}>+4 H</Text>
                  </Pressable>
                </View>

                {/* Time Slot Buttons */}
                {store.timeSlots.length > 0 && (
                  <View style={styles.slotBtnSection}>
                    <Text style={[styles.slotBtnLabel, { color: colors.textSecondary }]}>FRANJA HORARIA</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                      {/* None option */}
                      <Pressable
                        onPress={() => {
                          setSelectedSlotId(undefined);
                        }}
                        style={[
                          styles.slotChip,
                          {
                            backgroundColor: !selectedSlotId ? '#007AFF' : colors.backgroundSelected,
                            borderColor: !selectedSlotId ? '#007AFF' : colors.backgroundSelected,
                          }
                        ]}
                      >
                        <Text style={[styles.slotChipText, { color: !selectedSlotId ? '#fff' : colors.textSecondary }]}>Sin franja</Text>
                      </Pressable>

                      {store.timeSlots.map((slot) => {
                        const [sh, sm] = slot.startTime.split(':').map(Number);
                        const [eh, em] = slot.endTime.split(':').map(Number);
                        const durationMin = (eh * 60 + em) - (sh * 60 + sm);
                        const maxItems = store.slotSeparationMinutes > 0 ? Math.floor(durationMin / store.slotSeparationMinutes) : 999;
                        const existingCount = store.reminders.filter(
                          (r) => r.timeSlotId === slot.id && r.date === chosenDate
                        ).length;
                        const isFull = existingCount >= maxItems;
                        const isSelected = selectedSlotId === slot.id;

                        return (
                          <Pressable
                            key={slot.id}
                            onPress={() => {
                              if (isFull && !isSelected) {
                                Alert.alert(
                                  'Franja llena',
                                  `"${slot.name}" ya tiene ${existingCount}/${maxItems} recordatorio${existingCount !== 1 ? 's' : ''} para este día.`
                                );
                                return;
                              }
                              setSelectedSlotId(isSelected ? undefined : slot.id);
                              // Pre-fill time spinner with slot start
                              const [h, m] = slot.startTime.split(':').map(Number);
                              setChosenHour(h);
                              setChosenMinute(m);
                            }}
                            style={[
                              styles.slotChip,
                              {
                                backgroundColor: isSelected
                                  ? '#AF52DE'
                                  : isFull
                                    ? 'transparent'
                                    : colors.backgroundSelected,
                                borderColor: isSelected ? '#AF52DE' : isFull ? '#FF3B30' : colors.backgroundSelected,
                                borderWidth: isFull ? 1.5 : 1,
                                opacity: isFull && !isSelected ? 0.6 : 1,
                              }
                            ]}
                          >
                            <Text style={[styles.slotChipText, { color: isSelected ? '#fff' : isFull ? '#FF3B30' : colors.text }]}>
                              {slot.name}
                            </Text>
                            <Text style={[styles.slotChipSub, { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                              {slot.startTime}–{slot.endTime} · {existingCount}/{maxItems}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Picker Calendar */}
                <View style={styles.pickerCalendarWrapper}>
                  {getCalendarList()}
                </View>

                {/* Time Picker Controls */}
                <View style={[styles.timePickerContainer, { borderTopColor: colors.backgroundSelected }]}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Selecciona la Hora:</Text>
                  <View style={styles.timeControlRow}>
                    {/* Hours */}
                    <View style={styles.spinnerCol}>
                      <Pressable
                        onPress={() => setChosenHour((h) => (h + 1) % 24)}
                        style={[styles.spinBtn, { backgroundColor: colors.backgroundSelected }]}
                      >
                        <Ionicons name="chevron-up" size={18} color="#FF9500" />
                      </Pressable>
                      <Text style={[styles.spinValue, { color: colors.text }]}>
                        {chosenHour.toString().padStart(2, '0')}
                      </Text>
                      <Pressable
                        onPress={() => setChosenHour((h) => (h - 1 + 24) % 24)}
                        style={[styles.spinBtn, { backgroundColor: colors.backgroundSelected }]}
                      >
                        <Ionicons name="chevron-down" size={18} color="#FF9500" />
                      </Pressable>
                      <Text style={[styles.spinUnit, { color: colors.textSecondary }]}>horas</Text>
                    </View>

                    <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>

                    {/* Minutes */}
                    <View style={styles.spinnerCol}>
                      <Pressable
                        onPress={() => setChosenMinute((m) => (m + 5) % 60)}
                        style={[styles.spinBtn, { backgroundColor: colors.backgroundSelected }]}
                      >
                        <Ionicons name="chevron-up" size={18} color="#FF9500" />
                      </Pressable>
                      <Text style={[styles.spinValue, { color: colors.text }]}>
                        {chosenMinute.toString().padStart(2, '0')}
                      </Text>
                      <Pressable
                        onPress={() => setChosenMinute((m) => (m - 5 + 60) % 60)}
                        style={[styles.spinBtn, { backgroundColor: colors.backgroundSelected }]}
                      >
                        <Ionicons name="chevron-down" size={18} color="#FF9500" />
                      </Pressable>
                      <Text style={[styles.spinUnit, { color: colors.textSecondary }]}>mins</Text>
                    </View>
                  </View>
                </View>

                {/* Confirm / Save Actions */}
                <View style={styles.pickerConfirmRow}>
                  <Pressable
                    onPress={handleCancelPicker}
                    style={[styles.modalActionBtn, { borderColor: colors.textSecondary, borderWidth: 1 }]}
                  >
                    <Text style={[styles.modalActionText, { color: colors.text }]}>Cancelar</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSaveReminder}
                    style={[styles.modalActionBtn, { backgroundColor: '#FF9500' }]}
                  >
                    <Text style={[styles.modalActionText, { color: '#FFFFFF', fontWeight: 'bold' }]}>
                      {pickerMode === 'create' ? 'Programar' : 'Guardar Cambios'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Floating Bubble Editor Modal */}
        <Modal visible={editingReminder !== null} transparent animationType="fade">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.floatingModalContainer}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => {
                setEditingReminder(null);
                setEditingText('');
              }}
            >
              <Pressable
                onPress={(e) => e.stopPropagation()}
                style={[
                  styles.reminderBubble,
                  { 
                    width: '90%', 
                    backgroundColor: colors.backgroundElement,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.25,
                    shadowRadius: 16,
                    elevation: 10,
                    borderRadius: 16,
                  }
                ]}
              >
                {/* Bubble Header */}
                <View style={styles.bubbleActionRow}>
                  <View style={styles.leftActionGroup}>
                    <Ionicons 
                      name={editingReminder?.pinned ? 'pin' : 'pin-outline'} 
                      size={16} 
                      color={editingReminder?.pinned ? '#AF52DE' : colors.textSecondary} 
                    />
                    <Text style={[styles.actionBtnText, { color: editingReminder?.pinned ? '#AF52DE' : colors.textSecondary }]}>
                      {editingReminder?.pinned ? 'Importante' : 'Normal'}
                    </Text>
                  </View>
                  <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>
                    Editando Mensaje
                  </Text>
                </View>

                {/* Bubble Title Input */}
                <TextInput
                  value={editingText}
                  onChangeText={setEditingText}
                  multiline
                  autoFocus
                  style={[
                    styles.reminderTextInputInline,
                    { 
                      color: colors.text, 
                      borderBottomWidth: 1, 
                      borderBottomColor: colors.backgroundSelected, 
                      paddingBottom: 8,
                      minHeight: 60,
                      marginTop: 8,
                    }
                  ]}
                  placeholder="Escribe el recordatorio..."
                  placeholderTextColor={colors.textSecondary}
                />

                {/* Footer Actions */}
                <View style={styles.floatingBubbleFooter}>
                  {/* Left: Change Date/Time */}
                  <Pressable
                    onPress={handleSwitchToDatePicker}
                    style={[styles.floatingBubbleBtn, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#FF9500" />
                    <Text style={[styles.floatingBubbleBtnText, { color: '#FF9500' }]}>Fecha/Hora</Text>
                  </Pressable>

                  {/* Right: Cancel & Save */}
                  <View style={styles.floatingBubbleRightBtns}>
                    <Pressable
                      onPress={() => {
                        setEditingReminder(null);
                        setEditingText('');
                      }}
                      style={[styles.floatingBubbleBtn, { borderColor: colors.textSecondary, borderWidth: 1 }]}
                    >
                      <Text style={[styles.floatingBubbleBtnText, { color: colors.text }]}>Cancelar</Text>
                    </Pressable>

                    <Pressable
                      onPress={async () => {
                        if (editingReminder && editingText.trim()) {
                          await store.updateReminder(
                            editingReminder.id,
                            editingText.trim(),
                            editingReminder.date,
                            editingReminder.time
                          );
                        }
                        setEditingReminder(null);
                        setEditingText('');
                      }}
                      style={[styles.floatingBubbleBtn, { backgroundColor: '#34C759' }]}
                    >
                      <Text style={[styles.floatingBubbleBtnText, { color: '#FFFFFF', fontWeight: 'bold' }]}>
                        Guardar
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  dragDivider: {
    height: 16,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  minimizedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  minimizedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  minimizedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  minimizedSeparator: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(128, 128, 128, 0.3)',
    marginHorizontal: 12,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) + 12 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  settingsHeaderBtn: {
    padding: 8,
    borderRadius: 8,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoEmoji: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  resetAppBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  globalAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FF9500',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  globalAlarmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chatListContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  chatMessageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 4,
  },
  reminderBubble: {
    width: '88%',
    borderRadius: 16,
    borderTopRightRadius: 2,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  reminderText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  reminderTextInputInline: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    padding: 0,
    margin: 0,
  },
  commentsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    paddingTop: 10,
    marginBottom: 8,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  commentsCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  commentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 8,
  },
  commentTextWrapper: {
    flex: 1,
    marginRight: 8,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  editCommentInput: {
    fontSize: 13,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 30,
    textAlignVertical: 'top',
  },
  commentTime: {
    fontSize: 9,
    marginTop: 3,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  commentIconBtn: {
    padding: 4,
  },
  verMasBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginVertical: 2,
    alignSelf: 'flex-start',
  },
  verMasText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: 'bold',
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addCommentInput: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    maxHeight: 60,
  },
  addCommentBtn: {
    backgroundColor: '#FF9500',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  leftActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  importantSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  importantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  importantTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  importantTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  gridCard: {
    width: '48.5%',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  gridCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  gridCardDiff: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  gridCardTimeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  gridCardTime: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  gridCardText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  emptyImportantCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyImportantText: {
    fontSize: 12,
    textAlign: 'center',
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  upcomingTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  daysAdjusterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjusterBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjusterBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  daysText: {
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 45,
    textAlign: 'center',
  },

  emptyUpcomingCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyUpcomingText: {
    fontSize: 12,
    textAlign: 'center',
  },
  bubbleActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 8,
    marginBottom: 10,
  },
  rightActionGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerLeftActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  bubbleAlarmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  bubbleAlarmBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateSeparatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
  },
  dateSeparatorPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  composerContainer: {
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  composerInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  composerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  composerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  composerActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sendIconBtn: {
    backgroundColor: '#FF9500',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  floatingModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  floatingBubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
  },
  floatingBubbleRightBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  floatingBubbleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  floatingBubbleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pickerCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 16,
  },
  modalTextInputContainer: {
    width: '100%',
    marginTop: 2,
    marginBottom: 2,
  },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  modalTextInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pickerCalendarWrapper: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 8,
  },
  calendarContainer: {
    paddingHorizontal: 8,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  monthNavTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  arrowBtn: {
    padding: 6,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  weekHeaderCell: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 1,
  },
  fadedDayCell: {
    opacity: 0.3,
  },
  todayDayCell: {
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  selectedDayCell: {
    backgroundColor: '#FF9500',
  },
  dayCellText: {
    fontSize: 13,
  },
  timePickerContainer: {
    borderTopWidth: 1,
    paddingTop: 16,
    alignItems: 'center',
    gap: 12,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  timeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  spinnerCol: {
    alignItems: 'center',
    width: 60,
  },
  spinBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  spinUnit: {
    fontSize: 10,
    marginTop: 2,
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  pickerConfirmRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  modalActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionText: {
    fontSize: 14,
  },
  slotBtnSection: {
    gap: 6,
    paddingBottom: 4,
  },
  slotBtnLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  slotChip: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 90,
  },
  slotChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  slotChipSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
