import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useRememberStore, Reminder, Comment, getReminderActiveDate, getLocalDateStr } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return 'Sin fecha';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const getDatesDisplayString = (r: Reminder): string => {
  if (r.dates && r.dates.length > 0) {
    if (r.dates.length === 1) {
      return formatDisplayDate(r.dates[0]);
    }
    const sorted = [...r.dates].sort();
    const start = formatDisplayDate(sorted[0]);
    const end = formatDisplayDate(sorted[sorted.length - 1]);
    return `${start} a ${end} (${r.dates.length} días)`;
  }
  return r.date ? formatDisplayDate(r.date) : '';
};

const ReminderBubbleText = ({ item, onEditPress, zoomScale = 0.9 }: { item: Reminder; onEditPress: (item: Reminder) => void; zoomScale?: number }) => {
  const store = useRememberStore();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const goal = store.goals?.find(g => g.id === item.goalId);
  const phase = goal?.phases?.find(p => p.id === item.phaseId);

  return (
    <Pressable onPress={() => onEditPress(item)}>
      <Text
        style={[
          styles.reminderText,
          { color: colors.text, fontSize: 15 * zoomScale, lineHeight: 22 * zoomScale },
          item.completed && { textDecorationLine: 'line-through', opacity: 0.6 },
        ]}
      >
        {item.text}
      </Text>
      {goal && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 * zoomScale, marginTop: 8 * zoomScale }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 45, 85, 0.12)',
              paddingVertical: 3 * zoomScale,
              paddingHorizontal: 8 * zoomScale,
              borderRadius: 12 * zoomScale,
              borderWidth: 0.5,
              borderColor: 'rgba(255, 45, 85, 0.3)',
              gap: 4 * zoomScale,
            }}
          >
            <Text style={{ color: '#FF2D55', fontSize: 10 * zoomScale, fontWeight: '700' }}>🎯 {goal.title}</Text>
            {phase && (
              <>
                <Text style={{ color: 'rgba(255, 45, 85, 0.5)', fontSize: 10 * zoomScale }}>·</Text>
                <Text style={{ color: '#FF9500', fontSize: 10 * zoomScale, fontWeight: '600' }}>⚡ {phase.name}</Text>
              </>
            )}
          </View>
        </View>
      )}
      {((item.dates && item.dates.length > 0) || item.date) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 * zoomScale, marginTop: goal ? 4 * zoomScale : 8 * zoomScale }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 149, 0, 0.12)',
              paddingVertical: 3 * zoomScale,
              paddingHorizontal: 8 * zoomScale,
              borderRadius: 12 * zoomScale,
              borderWidth: 0.5,
              borderColor: 'rgba(255, 149, 0, 0.3)',
              gap: 4 * zoomScale,
            }}
          >
            <Ionicons name="calendar-outline" size={10 * zoomScale} color="#FF9500" />
            <Text style={{ color: '#FF9500', fontSize: 10 * zoomScale, fontWeight: '700' }}>
              {getDatesDisplayString(item)}
            </Text>
          </View>

          {item.estimatedHours !== undefined && item.estimatedHours > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 59, 48, 0.12)',
                paddingVertical: 3 * zoomScale,
                paddingHorizontal: 8 * zoomScale,
                borderRadius: 12 * zoomScale,
                borderWidth: 0.5,
                borderColor: 'rgba(255, 59, 48, 0.3)',
                gap: 4 * zoomScale,
              }}
            >
              <Ionicons name="time-outline" size={10 * zoomScale} color="#FF3B30" />
              <Text style={{ color: '#FF3B30', fontSize: 10 * zoomScale, fontWeight: '700' }}>
                {item.estimatedHours} {item.estimatedHours === 1 ? 'hora' : 'horas'}
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
};

export default function RememberDashboard() {
  const store = useRememberStore();
  const router = useRouter();
  const params = useLocalSearchParams<{ highlightReminderId?: string }>();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  // Component States
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineProximityDays, setTimelineProximityDays] = useState(30);
  const [highlightedReminderId, setHighlightedReminderId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(undefined);

  // Lists Screen States
  const [activeTab, setActiveTab] = useState<'reminders' | 'lists'>('reminders');
  const [newListName, setNewListName] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [editingItemId, setEditingItemId] = useState<{ listId: string; itemId: string } | null>(null);
  const [editingItemText, setEditingItemText] = useState('');
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});

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
  const [isNoDate, setIsNoDate] = useState(false);

  // States for Date/Time picker selection
  const [chosenDate, setChosenDate] = useState(''); // "YYYY-MM-DD"
  const [chosenDates, setChosenDates] = useState<string[]>([]);
  const [chosenHour, setChosenHour] = useState(12);
  const [chosenHoursToComplete, setChosenHoursToComplete] = useState('');

  const handleToggleDate = (dateStr: string) => {
    setChosenDates((prev) => {
      let nextDates: string[];
      if (prev.includes(dateStr)) {
        if (prev.length > 1) {
          nextDates = prev.filter((d) => d !== dateStr);
        } else {
          nextDates = prev;
        }
      } else {
        nextDates = [...prev, dateStr];
      }
      nextDates.sort();
      if (nextDates.length > 0) {
        setChosenDate(nextDates[0]);
      }
      return nextDates;
    });
  };
  const [chosenMinute, setChosenMinute] = useState(0);
  const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>(undefined);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | undefined>(undefined);

  // Calendar navigation state (only for the picker modal)
  const [pickerMonth, setPickerMonth] = useState(new Date());

  const flatListRef = useRef<any>(null);
  // Split Pane Slider Height
  const headerHeightAnim = useRef(new Animated.Value(450)).current;
  const currentHeight = useRef(450);
  const startHeight = useRef(450);
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
    const targetVal = isMinimized ? 450 : 50;
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
        headerHeightAnim.setValue(Math.max(50, Math.min(450, newHeight)));
      },
      onPanResponderRelease: (evt, gestureState) => {
        const targetVal = (startHeight.current + gestureState.dy) < 250 ? 50 : 450;
        Animated.spring(headerHeightAnim, {
          toValue: targetVal,
          useNativeDriver: false,
        }).start(() => {
          setIsMinimized(targetVal === 50);
        });
      },
    })
  ).current;

  const [zoomScale, setZoomScale] = useState(0.9);
  const pinchRef = useRef({
    initialDistance: 0,
    initialScale: 0.9,
  });

  const pinchPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt) => {
        return evt.nativeEvent.touches && evt.nativeEvent.touches.length === 2;
      },
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          pinchRef.current.initialDistance = Math.sqrt(dx * dx + dy * dy);
          pinchRef.current.initialScale = zoomScale;
        }
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const initialDist = pinchRef.current.initialDistance;
          if (initialDist > 0) {
            const ratio = dist / initialDist;
            let nextScale = pinchRef.current.initialScale * ratio;
            // Maximum zoom in is 0.9 (slightly smaller default)
            if (nextScale > 0.9) nextScale = 0.9;
            // Minimum zoom out is 0.55
            if (nextScale < 0.55) nextScale = 0.55;
            setZoomScale(nextScale);
          }
        }
      },
      onPanResponderRelease: () => {
        pinchRef.current.initialDistance = 0;
      },
      onPanResponderTerminate: () => {
        pinchRef.current.initialDistance = 0;
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

  // Highlight reminder from params
  useEffect(() => {
    if (params.highlightReminderId) {
      setTimeout(() => {
        handleReminderTap(params.highlightReminderId!);
        router.setParams({ highlightReminderId: undefined });
      }, 500);
    }
  }, [params.highlightReminderId]);

  const resetPickerToDefault = () => {
    const now = new Date();
    // Default to today
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    setChosenDate(dateStr);
    setChosenDates([dateStr]);

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
    setChosenHoursToComplete('');
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
    const dateStr = `${y}-${m}-${d}`;
    setChosenDate(dateStr);
    setChosenDates([dateStr]);
    setChosenHour(date.getHours());
    setChosenMinute(Math.floor(date.getMinutes() / 5) * 5);
    setPickerMonth(date);
  };

  // Save Reminder Creation or Edit
  const handleSaveReminder = async () => {
    let finalDate = chosenDate;
    let timeStr = '';

    if (isNoDate) {
      finalDate = '';
      timeStr = '';
    } else {
      const formattedHour = chosenHour.toString().padStart(2, '0');
      const formattedMin = chosenMinute.toString().padStart(2, '0');
      timeStr = `${formattedHour}:${formattedMin}`;

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

          for (const dStr of chosenDates) {
            const existingInSlot = store.reminders.filter(
              (r) => r.timeSlotId === selectedSlotId && 
                (r.dates && r.dates.length > 0 ? r.dates.includes(dStr) : r.date === dStr)
                && (pickerMode === 'edit' ? r.id !== activeEditId : true)
            ).length;
            if (existingInSlot >= maxItems) {
              Alert.alert(
                'Franja horaria llena',
                `La franja "${slot.name}" ya tiene ${existingInSlot} recordatorio${existingInSlot !== 1 ? 's' : ''} el ${dStr} y no caben más con una separación de ${store.slotSeparationMinutes} min.\n\nAumenta la separación o elige otra franja/día.`
              );
              return;
            }
          }
          timeStr = slot.startTime;
        }
      }
    }

    const hoursNum = chosenHoursToComplete.trim() ? parseFloat(chosenHoursToComplete.replace(',', '.')) : undefined;

    if (pickerMode === 'create') {
      if (!inputText.trim()) {
        Alert.alert('Escribe un mensaje', 'El mensaje del recordatorio no puede estar vacío.');
        return;
      }
      await store.addReminder(
        inputText,
        finalDate,
        timeStr,
        isNoDate ? undefined : selectedSlotId,
        selectedGoalId,
        selectedPhaseId,
        isNoDate ? [] : chosenDates,
        hoursNum
      );
      setInputText('');
      setIsPickerVisible(false);
      setSelectedSlotId(undefined);
      setSelectedGoalId(undefined);
      setSelectedPhaseId(undefined);
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
      await store.updateReminder(
        activeEditId,
        textToSave,
        finalDate,
        timeStr,
        isNoDate ? undefined : selectedSlotId,
        selectedGoalId,
        selectedPhaseId,
        isNoDate ? [] : chosenDates,
        hoursNum
      );
      setInputText('');
      setIsPickerVisible(false);
      setActiveEditId(null);
      setSelectedSlotId(undefined);
      setSelectedGoalId(undefined);
      setSelectedPhaseId(undefined);
      resetPickerToDefault();
    }
  };

  const handleCancelPicker = () => {
    setIsPickerVisible(false);
    setInputText('');
    setActiveEditId(null);
    setSelectedGoalId(undefined);
    setSelectedPhaseId(undefined);
    resetPickerToDefault();
  };

  const handleSwitchToDatePicker = () => {
    if (editingReminder) {
      const currentText = editingText;
      setEditingReminder(null);
      setPickerMode('edit');
      setActiveEditId(editingReminder.id);
      setInputText(currentText);
      setSelectedGoalId(editingReminder.goalId);
      setSelectedPhaseId(editingReminder.phaseId);
      setChosenHoursToComplete(editingReminder.estimatedHours ? String(editingReminder.estimatedHours) : '');
      
      if (!editingReminder.date) {
        setIsNoDate(true);
        resetPickerToDefault();
      } else {
        setIsNoDate(false);
        const rDates = editingReminder.dates && editingReminder.dates.length > 0
          ? editingReminder.dates
          : [editingReminder.date];
        setChosenDates(rDates);
        setChosenDate(editingReminder.date);
        
        const [h, min] = editingReminder.time.split(':').map(Number);
        setChosenHour(h);
        setChosenMinute(min);

        const [yr, mo] = editingReminder.date.split('-').map(Number);
        setPickerMonth(new Date(yr, mo - 1, 1));
      }
      setIsPickerVisible(true);
    }
  };

  const handleEditPress = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditingText(reminder.text);
    setSelectedGoalId(reminder.goalId);
    setSelectedPhaseId(reminder.phaseId);
  };

  const handleReminderTap = (id: string) => {
    setSearchQuery('');
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

  // Lists event handlers
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

  const handleDeleteListPress = (list: any) => {
    Alert.alert(
      'Eliminar lista',
      `¿Estás seguro de que quieres eliminar la lista "${list.name}" y todos sus elementos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await store.deleteList(list.id);
          },
        },
      ]
    );
  };

  const handleNewItemTextChange = (listId: string, text: string) => {
    setNewItemTexts((prev) => ({
      ...prev,
      [listId]: text,
    }));
  };

  const handleAddListItem = async (listId: string) => {
    const text = newItemTexts[listId] || '';
    if (!text.trim()) {
      Alert.alert('Texto vacío', 'Por favor escribe el texto del elemento.');
      return;
    }
    await store.addListItem(listId, text);
    setNewItemTexts((prev) => ({
      ...prev,
      [listId]: '',
    }));
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

  const handleCreatePress = () => {
    if (!inputText.trim()) {
      Alert.alert('Escribe un mensaje', 'Escribe primero el mensaje del recordatorio en la barra de chat.');
      return;
    }
    resetPickerToDefault();
    setSelectedGoalId(undefined);
    setSelectedPhaseId(undefined);
    setPickerMode('create');
    setIsNoDate(false);
    setIsPickerVisible(true);
  };

  const handleCreateDatelessDirectly = async () => {
    if (!inputText.trim()) {
      Alert.alert('Escribe un mensaje', 'Escribe primero el mensaje del recordatorio en la barra de chat.');
      return;
    }
    await store.addReminder(inputText.trim(), '', '', undefined);
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
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

  const daysInMonth = useMemo(() => getDaysInMonth(pickerMonth), [pickerMonth]);

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

  const getDaysDifference = (dateStr: string): number => {
    if (!dateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateStr.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Sort reminders chronologically
  const sortedReminders = useMemo(() => {
    return [...store.reminders].sort((a, b) => {
      const dateA = getReminderActiveDate(a);
      const dateB = getReminderActiveDate(b);
      if (!dateA && !dateB) {
        return b.createdAt.localeCompare(a.createdAt); // Newest dateless first
      }
      if (!dateA) return 1; // Put dateless at the end
      if (!dateB) return -1;
      const dateTimeA = `${dateA}T${a.time}`;
      const dateTimeB = `${dateB}T${b.time}`;
      return dateTimeA.localeCompare(dateTimeB);
    });
  }, [store.reminders]);

  // Filter sorted reminders by search query
  const filteredSortedReminders = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedReminders;
    }
    const query = searchQuery.toLowerCase().trim();
    return sortedReminders.filter((r) => r.text.toLowerCase().includes(query));
  }, [sortedReminders, searchQuery]);

  const upcomingReminders = useMemo(() => {
    const todayStr = getLocalDateStr();
    return store.reminders
      .filter((item) => {
        if (item.completed) return false;
        const isMarkedToday = item.dates && item.dates.includes(todayStr);
        const activeDate = isMarkedToday ? todayStr : (getReminderActiveDate(item) || '');
        if (!activeDate) return false;
        const diff = getDaysDifference(activeDate);
        return diff >= 0 && diff <= store.proximityDays;
      })
      .sort((a, b) => {
        const isMarkedTodayA = a.dates && a.dates.includes(todayStr);
        const isMarkedTodayB = b.dates && b.dates.includes(todayStr);
        const activeA = isMarkedTodayA ? todayStr : (getReminderActiveDate(a) || '');
        const activeB = isMarkedTodayB ? todayStr : (getReminderActiveDate(b) || '');
        const dateTimeA = `${activeA}T${a.time}`;
        const dateTimeB = `${activeB}T${b.time}`;
        return dateTimeA.localeCompare(dateTimeB);
      });
  }, [store.reminders, store.proximityDays]);

  const pinnedReminders = useMemo(() => {
    return store.reminders
      .filter((item) => item.pinned && (item.date || (item.dates && item.dates.length > 0)))
      .sort((a, b) => {
        const activeA = getReminderActiveDate(a) || '';
        const activeB = getReminderActiveDate(b) || '';
        const dateTimeA = `${activeA}T${a.time}`;
        const dateTimeB = `${activeB}T${b.time}`;
        return dateTimeA.localeCompare(dateTimeB);
      });
  }, [store.reminders]);

  const datelessReminders = useMemo(() => {
    return store.reminders
      .filter((item) => !item.date && (!item.dates || item.dates.length === 0) && !item.completed)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [store.reminders]);

  // Timelines list (filtered and sorted)
  const timelineTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return store.reminders
      .filter((item) => {
        if (item.completed) return false;
        const startDateStr = item.startDate || item.date;
        const activeEndDate = item.endDate || item.date;
        if (!startDateStr || !activeEndDate) return false;

        // Exclude 1-day tasks (start date is equal to end date)
        if (startDateStr === activeEndDate) return false;

        const diff = getDaysDifference(activeEndDate);
        // Show if it's within the proximity days range (or overdue)
        return diff <= timelineProximityDays;
      })
      .sort((a, b) => {
        const endA = a.endDate || a.date || '';
        const endB = b.endDate || b.date || '';

        const [ay, am, ad] = endA.split('-').map(Number);
        const [by, bm, bd] = endB.split('-').map(Number);
        const dateObjA = new Date(ay, am - 1, ad);
        const dateObjB = new Date(by, bm - 1, bd);
        dateObjA.setHours(0, 0, 0, 0);
        dateObjB.setHours(0, 0, 0, 0);

        const remainingA = Math.max(1, Math.ceil((dateObjA.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        const remainingB = Math.max(1, Math.ceil((dateObjB.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

        const hoursA = a.estimatedHours || 0;
        const hoursB = b.estimatedHours || 0;

        const priorityA = hoursA > 0 ? (hoursA / remainingA) : 0;
        const priorityB = hoursB > 0 ? (hoursB / remainingB) : 0;

        if (priorityA !== priorityB) {
          return priorityB - priorityA; // Higher priority ratio first
        }

        const diffA = getDaysDifference(endA);
        const diffB = getDaysDifference(endB);
        return diffA - diffB; // Soonest end date first
      });
  }, [store.reminders, timelineProximityDays]);

  const renderTimelineItem = (item: Reminder) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDateStr = item.startDate || item.date;
    const endDateStr = item.endDate || item.date;

    if (!startDateStr || !endDateStr) return null;

    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [ey, em, ed] = endDateStr.split('-').map(Number);

    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Percentage of progress
    let pct = 0;
    if (totalDays > 1) {
      pct = Math.max(0, Math.min(1, elapsedDays / (totalDays - 1)));
    } else {
      pct = today >= start ? 1 : 0;
    }

    const availableDays = item.dates ? item.dates.length : 1;

    // Format short dates (e.g. "27 Jul")
    const formatShortDate = (dateStr: string) => {
      if (!dateStr) return '';
      const [, m, d] = dateStr.split('-');
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]}`;
    };

    const goal = store.goals?.find((g) => g.id === item.goalId);

    const hours = item.estimatedHours || 0;
    const daysLeft = Math.max(1, remainingDays);
    const priorityIndex = hours / daysLeft;
    let priorityColor = '#8E8E93';

    let priorityText = '';
    if (hours > 0) {
      if (priorityIndex >= 4) {
        priorityColor = '#FF3B30';
      } else if (priorityIndex >= 2.5) {
        priorityColor = '#FF9500';
      } else if (priorityIndex >= 1) {
        priorityColor = '#FFCC00';
      } else {
        priorityColor = '#34C759';
      }

      const totalMinutes = Math.round(priorityIndex * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      if (h > 0 && m > 0) {
        priorityText = `${h}h y ${m}m`;
      } else if (h > 0) {
        priorityText = `${h}h`;
      } else {
        priorityText = `${m}m`;
      }
    }

    return (
      <Pressable 
        key={`timeline-${item.id}`} 
        onPress={() => handleReminderTap(item.id)}
        style={styles.timelineItemContainer}
      >
        {/* Top details: Task name and available days */}
        <View style={styles.timelineItemHeader}>
          <Text style={[styles.timelineTaskText, { color: colors.text, flex: 1, marginRight: 8 }]} numberOfLines={1}>
            {item.text}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {hours > 0 && (
              <View style={{ 
                backgroundColor: priorityColor, 
                paddingHorizontal: 6, 
                paddingVertical: 2, 
                borderRadius: 6 
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' }}>
                  {priorityText} por día
                </Text>
              </View>
            )}
            <View style={styles.availableDaysBadge}>
              <Text style={styles.availableDaysText}>
                {availableDays} {availableDays === 1 ? 'día disp.' : 'días disp.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Timeline bar */}
        <View style={styles.timelineBarWrapper}>
          <Text style={[styles.timelineDateText, { color: colors.textSecondary }]}>
            {formatShortDate(startDateStr)}
          </Text>
          
          <View style={styles.timelineTrackContainer}>
            <View style={[styles.timelineTrack, { backgroundColor: colors.backgroundSelected }]} />
            {/* Progress line */}
            <View 
              style={[
                styles.timelineProgress, 
                { 
                  width: `${pct * 100}%`, 
                  backgroundColor: remainingDays < 0 ? '#FF3B30' : '#FF9500' 
                }
              ]} 
            />
            {/* Today marker indicator */}
            <View 
              style={[
                styles.timelineMarker, 
                { 
                  left: `${pct * 100}%`,
                  backgroundColor: remainingDays < 0 ? '#FF3B30' : '#FF9500',
                }
              ]} 
            />
          </View>

          <Text style={[styles.timelineDateText, { color: colors.textSecondary }]}>
            {formatShortDate(endDateStr)}
          </Text>
        </View>

        {/* Bottom details: remaining days and goal badge if exists */}
        <View style={styles.timelineItemFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.timelineRemainingText, { color: remainingDays < 0 ? '#FF3B30' : colors.textSecondary }]}>
              {remainingDays === 0 
                ? 'Finaliza hoy' 
                : remainingDays < 0 
                  ? `Vencido hace ${Math.abs(remainingDays)}d` 
                  : `Quedan ${remainingDays}d`}
            </Text>
            {hours > 0 && (
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                • {hours} {hours === 1 ? 'hora' : 'horas'}
              </Text>
            )}
          </View>
          {goal && (
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#FF2D55' }}>
              🎯 {goal.title}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  // Get WhatsApp-style date header text
  const getDateSeparatorText = (dateStr: string): string => {
    if (!dateStr) {
      return 'COSAS QUE QUIERO HACER';
    }
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
    const activeDate = getReminderActiveDate(item);
    const prevActiveDate = index > 0 ? getReminderActiveDate(filteredSortedReminders[index - 1]) : null;
    const showDateHeader = index === 0 || prevActiveDate !== activeDate;

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
            <View style={[styles.dateSeparatorPill, { backgroundColor: colors.backgroundSelected, paddingVertical: 4 * zoomScale, paddingHorizontal: 12 * zoomScale, borderRadius: 12 * zoomScale }]}>
              <Text style={[styles.dateSeparatorText, { color: colors.textSecondary, fontSize: 12 * zoomScale }]}>
                {getDateSeparatorText(activeDate)}
              </Text>
            </View>
            <View style={[styles.dateSeparatorLine, { backgroundColor: colors.backgroundSelected }]} />
          </View>
        )}

        <View style={styles.chatMessageRow}>
          <View
            style={[
              styles.reminderBubble,
              { backgroundColor: colors.backgroundElement, padding: 14 * zoomScale, borderRadius: 16 * zoomScale },
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
                    size={20 * zoomScale}
                    color={item.completed ? '#34C759' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: item.completed ? '#34C759' : colors.textSecondary, fontSize: 12 * zoomScale },
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
                    size={18 * zoomScale}
                    color={item.pinned ? '#AF52DE' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: item.pinned ? '#AF52DE' : colors.textSecondary, fontSize: 12 * zoomScale },
                    ]}
                  >
                    {item.pinned ? 'Fijado' : 'Fijar'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.rightActionGroup}>
                {/* Edit */}
                <Pressable onPress={() => handleEditPress(item)} style={styles.actionBtn}>
                  <Ionicons name="create-outline" size={18 * zoomScale} color="#007AFF" />
                </Pressable>

                {/* Delete */}
                <Pressable onPress={() => handleDeletePress(item.id)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={18 * zoomScale} color="#FF3B30" />
                </Pressable>
              </View>
            </View>

            {/* Reminder Content */}
            <ReminderBubbleText item={item} onEditPress={handleEditPress} zoomScale={zoomScale} />

            {/* Comments Section (YouTube-style comments list & adding option) */}
            {isCommentsVisible && (
              <View style={[styles.commentsContainer, { borderTopColor: colors.backgroundSelected }]}>
                <View style={styles.commentsHeader}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14 * zoomScale} color={colors.textSecondary} />
                  <Text style={[styles.commentsCountText, { color: colors.textSecondary, fontSize: 11 * zoomScale }]}>
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
                              { color: colors.text, backgroundColor: colors.backgroundSelected, fontSize: 13 * zoomScale },
                            ]}
                            autoFocus
                            multiline
                        />
                        ) : (
                          <Text style={[styles.commentText, { color: colors.text, fontSize: 13 * zoomScale }]}>
                            {comment.text}
                          </Text>
                        )}
                        <Text style={[styles.commentTime, { color: colors.textSecondary, fontSize: 10 * zoomScale }]}>
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
                              <Ionicons name="checkmark-circle-outline" size={16 * zoomScale} color="#34C759" />
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                setEditingCommentId(null);
                                setEditingCommentText('');
                              }}
                              style={styles.commentIconBtn}
                            >
                              <Ionicons name="close-circle-outline" size={16 * zoomScale} color="#FF3B30" />
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
                              <Ionicons name="create-outline" size={14 * zoomScale} color="#007AFF" />
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
                              <Ionicons name="trash-outline" size={14 * zoomScale} color="#FF3B30" />
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
                    <Text style={[styles.verMasText, { fontSize: 11 * zoomScale }]}>
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
                    style={[styles.addCommentInput, { color: colors.text, backgroundColor: colors.backgroundSelected, fontSize: 13 * zoomScale }]}
                    multiline
                  />
                  <Pressable
                    onPress={() => handleAddCommentSubmit(item.id)}
                    style={styles.addCommentBtn}
                  >
                    <Ionicons name="add" size={18 * zoomScale} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Bottom Row: Time and Alarm Indicator */}
            <View style={styles.bubbleFooter}>
              <View style={styles.footerLeftActions}>
                {!!item.date && (
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
                      size={14 * zoomScale}
                      color="#FF9500"
                    />
                    <Text style={[styles.bubbleAlarmBadgeText, { color: '#FF9500', fontSize: 10 * zoomScale }]}>
                      {item.alarmScheduled ? 'Alarma Activa' : 'Poner Alarma'}
                    </Text>
                  </Pressable>
                )}

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
                    size={14 * zoomScale}
                    color={isCommentsVisible ? '#007AFF' : colors.textSecondary}
                  />
                  <Text style={[styles.bubbleAlarmBadgeText, { color: isCommentsVisible ? '#007AFF' : colors.textSecondary, fontSize: 10 * zoomScale }]}>
                    {commentsList.length > 0 ? `${commentsList.length}` : 'Comentar'}
                  </Text>
                </Pressable>
              </View>

              {item.date ? (
                <View style={styles.timeWrapper}>
                  <Ionicons name="time-outline" size={12 * zoomScale} color={colors.textSecondary} />
                  <Text style={[styles.timeText, { color: colors.textSecondary, fontSize: 11 * zoomScale }]}>
                    {item.time}
                  </Text>
                </View>
              ) : (
                <View style={styles.timeWrapper}>
                  <Ionicons name="bulb-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                    Sin fecha
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const getCalendarList = () => {
    const days = daysInMonth;
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
            const isSelected = chosenDates.includes(item.dateStr);
            const isToday = item.dateStr === getLocalDateStr();
            const isStart = chosenDates.length > 1 && chosenDates[0] === item.dateStr;
            const isEnd = chosenDates.length > 1 && chosenDates[chosenDates.length - 1] === item.dateStr;

            return (
              <Pressable
                key={idx}
                onPress={() => handleToggleDate(item.dateStr)}
                style={[
                  styles.dayCell,
                  !item.isCurrentMonth && styles.fadedDayCell,
                  isToday && styles.todayDayCell,
                  isSelected && styles.selectedDayCell,
                  isStart && { backgroundColor: '#007AFF', borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
                  isEnd && { backgroundColor: '#FF3B30', borderTopRightRadius: 18, borderBottomRightRadius: 18 },
                ]}
              >
                <Text
                  style={[
                    styles.dayCellText,
                    { color: item.isCurrentMonth ? colors.text : colors.textSecondary },
                    isSelected && { color: '#000000', fontWeight: 'bold' },
                    isToday && !isSelected && { color: '#FF9500', fontWeight: 'bold' },
                    (isStart || isEnd) && { color: '#FFFFFF', fontWeight: 'bold' },
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
                {activeTab === 'reminders' ? 'Chat de Recordatorios' : 'Gestión de Listas'}
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
                {/* Global Alarm Scheduler Button (Only visible if there are reminders) */}
                {store.reminders.length > 0 && (
                  <Pressable
                    onPress={() => {
                      store.scheduleAllAlarms();
                    }}
                    style={[styles.globalAlarmBtn, { marginHorizontal: 16, marginTop: 12, marginBottom: 4 }]}
                  >
                    <Ionicons name="notifications" size={18} color="#FFFFFF" />
                    <Text style={styles.globalAlarmBtnText}>
                      Programar todos los eventos en el calendario
                    </Text>
                  </Pressable>
                )}

                {/* Timeline Representation of Reminders with Margins / Ranges */}
                {store.reminders.length > 0 && (
                  <View style={styles.timelineSection}>
                    <View style={styles.timelineHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="git-commit-outline" size={16} color="#FF9500" />
                        <Text style={[styles.timelineTitle, { color: colors.text }]}>Líneas de Tiempo (Plazos)</Text>
                      </View>
                      
                      {/* Timeline Proximity Adjuster */}
                      <View style={styles.daysAdjusterContainer}>
                        <Pressable
                          onPress={() => setTimelineProximityDays(prev => Math.max(1, prev - 1))}
                          style={[styles.adjusterBtn, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}
                        >
                          <Text style={[styles.adjusterBtnText, { color: '#FF9500' }]}>-</Text>
                        </Pressable>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TextInput
                            keyboardType="numeric"
                            value={String(timelineProximityDays)}
                            onChangeText={(txt) => {
                              const val = parseInt(txt.replace(/[^0-9]/g, '')) || 0;
                              setTimelineProximityDays(val);
                            }}
                            onBlur={() => {
                              if (timelineProximityDays < 1) setTimelineProximityDays(1);
                              if (timelineProximityDays > 365) setTimelineProximityDays(365);
                            }}
                            style={{
                              color: '#FF9500',
                              minWidth: 24,
                              textAlign: 'center',
                              fontWeight: 'bold',
                              fontSize: 12,
                              padding: 0,
                              margin: 0,
                            }}
                          />
                          <Text style={{ color: '#FF9500', fontSize: 12, fontWeight: 'bold' }}> días</Text>
                        </View>
                        
                        <Pressable
                          onPress={() => setTimelineProximityDays(prev => Math.min(365, prev + 1))}
                          style={[styles.adjusterBtn, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}
                        >
                          <Text style={[styles.adjusterBtnText, { color: '#FF9500' }]}>+</Text>
                        </Pressable>
                      </View>
                    </View>

                    {timelineTasks.length === 0 ? (
                      <View style={[styles.emptyUpcomingCard, { borderColor: 'rgba(255, 149, 0, 0.2)', marginHorizontal: 16, marginBottom: 8 }]}>
                        <Text style={[styles.emptyUpcomingText, { color: colors.textSecondary }]}>
                          No hay plazos o líneas de tiempo en los siguientes {timelineProximityDays} días.
                        </Text>
                      </View>
                    ) : (
                      <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}>
                        {timelineTasks.map((t) => renderTimelineItem(t))}
                      </View>
                    )}
                  </View>
                )}

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
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          keyboardType="numeric"
                          value={String(store.proximityDays)}
                          onChangeText={(txt) => {
                            const val = parseInt(txt.replace(/[^0-9]/g, '')) || 0;
                            store.setProximityDays(val);
                          }}
                          onBlur={() => {
                            if (store.proximityDays < 1) store.setProximityDays(1);
                            if (store.proximityDays > 365) store.setProximityDays(365);
                          }}
                          style={{
                            color: '#007AFF',
                            minWidth: 24,
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: 12,
                            padding: 0,
                            margin: 0,
                          }}
                        />
                        <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: 'bold' }}> días</Text>
                      </View>
                      
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
                        const todayStr = getLocalDateStr();
                        const isMarkedToday = item.dates && item.dates.includes(todayStr);
                        const activeDate = isMarkedToday ? todayStr : (getReminderActiveDate(item) || item.date || '');
                        const diff = getDaysDifference(activeDate);
                        const isToday = diff === 0;

                        const useYellow = isToday && isMarkedToday;

                        let diffLabel = '';
                        if (isToday) diffLabel = 'Hoy';
                        else if (diff === 1) diffLabel = 'Mañana';
                        else diffLabel = `En ${diff} d`;
                        const goal = store.goals?.find((g) => g.id === item.goalId);

                        const cardBg = useYellow 
                          ? 'rgba(255, 204, 0, 0.12)' 
                          : isToday 
                            ? 'rgba(255, 59, 48, 0.12)' 
                            : 'rgba(0, 122, 255, 0.08)';

                        const cardBorder = useYellow 
                          ? '#FFCC00' 
                          : isToday 
                            ? '#FF3B30' 
                            : 'rgba(0, 122, 255, 0.3)';

                        const cardTextOrIconColor = useYellow 
                          ? '#FFCC00' 
                          : isToday 
                            ? '#FF3B30' 
                            : '#007AFF';

                        return (
                          <Pressable
                            key={`upcoming-${item.id}`}
                            onPress={() => handleReminderTap(item.id)}
                            style={[
                              styles.gridCard,
                              {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                borderWidth: isToday ? 2 : 1,
                              },
                            ]}
                          >
                            <View style={styles.gridCardHeader}>
                              {isToday ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <View style={{ backgroundColor: useYellow ? '#FFCC00' : '#FF3B30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>HOY</Text>
                                  </View>
                                  {useYellow && item.dates && (
                                    <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                      <Text style={{ color: colors.text, fontSize: 9, fontWeight: '600' }}>
                                        {item.dates.filter(d => d >= todayStr).length} disp.
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              ) : (
                                <Text style={[styles.gridCardDiff, { color: '#007AFF' }]}>{diffLabel}</Text>
                              )}
                              <View style={styles.gridCardTimeGroup}>
                                <Ionicons name="time-outline" size={10} color={cardTextOrIconColor} />
                                <Text style={[styles.gridCardTime, { color: cardTextOrIconColor }]}>{item.time}</Text>
                              </View>
                            </View>
                            <Text
                              numberOfLines={2}
                              style={[styles.gridCardText, { color: colors.text }]}
                            >
                              {item.text}
                            </Text>
                            {goal && (
                              <Text
                                numberOfLines={1}
                                style={{
                                  fontSize: 8,
                                  fontWeight: 'bold',
                                  color: '#FF2D55',
                                  marginTop: 6,
                                  alignSelf: 'flex-start',
                                }}
                              >
                                🎯 {goal.title}
                              </Text>
                            )}
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
                        const goal = store.goals?.find((g) => g.id === item.goalId);

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
                            {goal && (
                              <Text
                                numberOfLines={1}
                                style={{
                                  fontSize: 8,
                                  fontWeight: 'bold',
                                  color: '#FF2D55',
                                  marginTop: 6,
                                  alignSelf: 'flex-start',
                                }}
                              >
                                🎯 {goal.title}
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Cosas que quiero hacer Section (Teal Theme) */}
                <View style={styles.datelessSection}>
                  <View style={styles.datelessHeader}>
                    <View style={styles.datelessTitleGroup}>
                      <Ionicons name="bulb" size={16} color="#30B0C7" />
                      <Text style={[styles.datelessTitle, { color: colors.text }]}>Cosas que quiero hacer</Text>
                    </View>
                  </View>

                  {datelessReminders.length === 0 ? (
                    <View style={[styles.emptyDatelessCard, { borderColor: 'rgba(48, 176, 199, 0.2)', marginHorizontal: 16 }]}>
                      <Text style={[styles.emptyDatelessText, { color: colors.textSecondary }]}>
                        No hay recordatorios sin fecha.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.gridContainer}>
                      {datelessReminders.map((item) => {
                        const goal = store.goals?.find((g) => g.id === item.goalId);
                        return (
                          <Pressable
                            key={`dateless-${item.id}`}
                            onPress={() => handleReminderTap(item.id)}
                            style={[
                              styles.gridCard,
                              {
                                backgroundColor: 'rgba(48, 176, 199, 0.08)',
                                borderColor: 'rgba(48, 176, 199, 0.3)',
                              },
                            ]}
                          >
                            <View style={styles.gridCardHeader}>
                              <Text style={[styles.gridCardDiff, { color: '#30B0C7' }]}>Sin Fecha</Text>
                              <Ionicons name="bulb-outline" size={12} color="#30B0C7" />
                            </View>
                            <Text
                              numberOfLines={2}
                              style={[styles.gridCardText, { color: colors.text }]}
                            >
                              {item.text}
                            </Text>
                            {goal && (
                              <Text
                                numberOfLines={1}
                                style={{
                                  fontSize: 8,
                                  fontWeight: 'bold',
                                  color: '#FF2D55',
                                  marginTop: 6,
                                  alignSelf: 'flex-start',
                                }}
                              >
                                🎯 {goal.title}
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>

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

          {/* Search Bar */}
          <View style={[styles.searchBarContainer, { backgroundColor: colors.backgroundSelected }]}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar recordatorios..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* Chat Message List with Pinch-to-Zoom */}
          <View style={{ flex: 1 }} {...pinchPanResponder.panHandlers}>
            <FlatList
              ref={flatListRef}
              data={filteredSortedReminders}
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
                    {searchQuery.trim() ? 'No se encontraron recordatorios con esa búsqueda.' : 'No hay recordatorios registrados.'}
                  </Text>
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                    {searchQuery.trim() ? 'Intenta escribir otra palabra clave.' : 'Escribe un recordatorio abajo y haz clic en programar.'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>

        {/* Bottom Chat Input Composer */}
        <View style={[styles.composerContainer, { backgroundColor: colors.backgroundElement }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(128, 128, 128, 0.15)', marginBottom: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, letterSpacing: 0.5 }}>PANEL DE CONTROL</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Pressable
                onPress={() => router.push('/slots')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 4 }}
              >
                <Ionicons name="time-outline" size={13} color="#AF52DE" />
                <Text style={{ fontSize: 11, color: colors.text, fontWeight: '600' }}>Horas</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/goals')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 4 }}
              >
                <Ionicons name="ribbon-outline" size={13} color="#FF2D55" />
                <Text style={{ fontSize: 11, color: colors.text, fontWeight: '600' }}>Objetivos</Text>
              </Pressable>
            </View>
          </View>

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                onPress={handleCreatePress}
                style={[styles.composerActionBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                <Ionicons name="calendar" size={18} color="#FF9500" />
                <Text style={[styles.composerActionText, { color: colors.text }]}>
                  {formatDisplayDate(chosenDate)} a las {chosenHour.toString().padStart(2, '0')}:{chosenMinute.toString().padStart(2, '0')}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleCreateDatelessDirectly}
                style={[styles.composerActionBtn, { backgroundColor: 'rgba(48, 176, 199, 0.15)' }]}
              >
                <Ionicons name="bulb" size={18} color="#30B0C7" />
                <Text style={[styles.composerActionText, { color: '#30B0C7' }]}>
                  Sin fecha
                </Text>
              </Pressable>
            </View>

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
                <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
                  {/* Switch for setting date/time */}
                  <Pressable
                    onPress={() => setIsNoDate(!isNoDate)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      marginHorizontal: 16,
                      marginTop: 8,
                      marginBottom: 12,
                      borderRadius: 10,
                      backgroundColor: colors.backgroundSelected,
                      borderWidth: 1,
                      borderColor: !isNoDate ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="calendar-outline" size={18} color={isNoDate ? colors.textSecondary : '#FF9500'} />
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
                        Programar con fecha y hora
                      </Text>
                    </View>
                    <Switch
                      value={!isNoDate}
                      onValueChange={(val) => setIsNoDate(!val)}
                      trackColor={{ false: '#767577', true: '#FF9500' }}
                      thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                    />
                  </Pressable>

                  {isNoDate ? (
                    <View style={{
                      paddingHorizontal: 24,
                      paddingVertical: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}>
                      <Ionicons name="bulb-outline" size={42} color="#30B0C7" style={{ opacity: 0.9 }} />
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
                        Actividad Sin Fecha Definida
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 16 }}>
                        Este recordatorio se guardará en la lista de "Cosas que quiero hacer". Podrás consultarlo y editarlo cuando quieras.
                      </Text>
                    </View>
                  ) : (
                    <>
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
                        {/* Selection Summary */}
                        {chosenDates.length > 0 && (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderTopWidth: 0.5, borderTopColor: 'rgba(255, 255, 255, 0.1)' }}>
                            <Text style={{ fontSize: 13, color: '#FF9500', fontWeight: '700', marginBottom: 2 }}>
                              Rango de Recordatorio:
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600', textAlign: 'center' }}>
                              {getDatesDisplayString({ dates: chosenDates } as Reminder)}
                            </Text>

                            {/* Divider line for clear section separation */}
                            <View style={{ width: '100%', height: 0.5, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginVertical: 16 }} />

                            {/* Estimated Hours Input (Optional) */}
                            <Text style={{ fontSize: 15, color: '#FF9500', fontWeight: 'bold', marginBottom: 8 }}>
                              Tiempo de trabajo estimado:
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundSelected, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, width: 140 }}>
                              <TextInput
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={colors.textSecondary}
                                value={chosenHoursToComplete}
                                onChangeText={setChosenHoursToComplete}
                                style={{
                                  color: colors.text,
                                  fontSize: 14,
                                  fontWeight: '600',
                                  flex: 1,
                                  textAlign: 'center',
                                  padding: 0,
                                }}
                              />
                              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginLeft: 4 }}>horas</Text>
                            </View>
                          </View>
                        )}
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
                    </>
                  )}

                  {/* Goal & Phase Selector */}
                  {store.goals && store.goals.length > 0 && (
                    <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 8, gap: 8 }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Asociar a un Objetivo (Opcional):
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                        <Pressable
                          onPress={() => {
                            setSelectedGoalId(undefined);
                            setSelectedPhaseId(undefined);
                          }}
                          style={{
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            borderRadius: 20,
                            backgroundColor: selectedGoalId === undefined ? '#FF2D55' : colors.backgroundSelected,
                            borderWidth: 1,
                            borderColor: selectedGoalId === undefined ? '#FF2D55' : 'transparent',
                          }}
                        >
                          <Text style={{ color: selectedGoalId === undefined ? '#fff' : colors.text, fontSize: 12, fontWeight: 'bold' }}>
                            Ninguno
                          </Text>
                        </Pressable>
                        {store.goals.filter(g => !g.completed || g.id === selectedGoalId).map((g) => {
                          const isSelected = selectedGoalId === g.id;
                          return (
                            <Pressable
                              key={g.id}
                              onPress={() => {
                                setSelectedGoalId(g.id);
                                setSelectedPhaseId(undefined);
                              }}
                              style={{
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 20,
                                backgroundColor: isSelected ? '#FF2D55' : colors.backgroundSelected,
                                borderWidth: 1,
                                borderColor: isSelected ? '#FF2D55' : 'transparent',
                              }}
                            >
                              <Text style={{ color: isSelected ? '#fff' : colors.text, fontSize: 12, fontWeight: '500' }}>
                                🎯 {g.title}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>

                      {/* Phase Selector (if Goal is selected) */}
                      {selectedGoalId && (
                        <View style={{ gap: 6, marginTop: 4 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Fase del Roadmap:
                          </Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                            <Pressable
                              onPress={() => setSelectedPhaseId(undefined)}
                              style={{
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 20,
                                backgroundColor: selectedPhaseId === undefined ? '#FF9500' : colors.backgroundSelected,
                                borderWidth: 1,
                                borderColor: selectedPhaseId === undefined ? '#FF9500' : 'transparent',
                              }}
                            >
                              <Text style={{ color: selectedPhaseId === undefined ? '#fff' : colors.text, fontSize: 12, fontWeight: 'bold' }}>
                                General (Sin fase)
                              </Text>
                            </Pressable>
                            {store.goals
                              .find((g) => g.id === selectedGoalId)
                              ?.phases.sort((a, b) => a.order - b.order)
                              .map((p) => {
                                const isSelected = selectedPhaseId === p.id;
                                return (
                                  <Pressable
                                    key={p.id}
                                    onPress={() => setSelectedPhaseId(p.id)}
                                    style={{
                                      paddingVertical: 6,
                                      paddingHorizontal: 12,
                                      borderRadius: 20,
                                      backgroundColor: isSelected ? '#FF9500' : colors.backgroundSelected,
                                      borderWidth: 1,
                                      borderColor: isSelected ? '#FF9500' : 'transparent',
                                    }}
                                  >
                                    <Text style={{ color: isSelected ? '#fff' : colors.text, fontSize: 12, fontWeight: '500' }}>
                                      ⚡ {p.name}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>

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
                      {pickerMode === 'create' ? (isNoDate ? 'Guardar' : 'Programar') : 'Guardar Cambios'}
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
                            editingReminder.time,
                            editingReminder.timeSlotId,
                            editingReminder.goalId,
                            editingReminder.phaseId,
                            editingReminder.dates,
                            editingReminder.estimatedHours
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
  timelineSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  timelineItemContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 10,
    gap: 8,
  },
  timelineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  timelineTaskText: {
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  availableDaysBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  availableDaysText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FF9500',
  },
  timelineBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelineDateText: {
    fontSize: 9,
    fontWeight: '600',
    width: 32,
    textAlign: 'center',
  },
  timelineTrackContainer: {
    flex: 1,
    height: 12,
    justifyContent: 'center',
    position: 'relative',
  },
  timelineTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
  },
  timelineProgress: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
  },
  timelineMarker: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: -3,
    marginLeft: -5,
    top: '50%',
    shadowRadius: 2,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  timelineItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineRemainingText: {
    fontSize: 10,
    fontWeight: '600',
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
  datelessSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  datelessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  datelessTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datelessTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyDatelessCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDatelessText: {
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
    gap: 12,
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
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
});
