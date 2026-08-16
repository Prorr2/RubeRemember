import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  useColorScheme,
  Modal,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore, ItemType, Priority, Task, Reminder as ReminderV2, Activity, getLocalDateStr, Memo, Plan, VoiceKeywords, EnergyType, DEFAULT_VOICE_KEYWORDS, TaskState } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';
import { useRecommendationService } from '@/services/RecommendationService';
import { getTaskWeightLabel } from '@/engines/ScoreEngine';

const speak = (text: string) => {
  try {
    const SpeechModule = require('expo-speech');
    if (SpeechModule && SpeechModule.speak) {
      SpeechModule.speak(text, { language: 'es-ES' });
      return;
    }
  } catch (e) {
    // Ignored, fallback below
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Web SpeechSynthesis failed:', e);
    }
  }
};

const parseSpanishWrittenNumber = (words: string[]): number | null => {
  const units: Record<string, number> = {
    'un': 1, 'una': 1, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
    'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9,
    'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
    'dieciseis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19,
    'veintiuno': 21, 'veintidos': 22, 'veintitres': 23, 'veinticuatro': 24, 'veinticinco': 25,
    'veintiseis': 26, 'veintisiete': 27, 'veintiocho': 28, 'veintinueve': 29
  };

  const tens: Record<string, number> = {
    'diez': 10,
    'veinte': 20,
    'treinta': 30,
    'cuarenta': 40,
    'cincuenta': 50,
    'cincuanta': 50
  };

  if (words.length === 0) return null;

  if (words.length === 1) {
    const w = words[0];
    if (units[w] !== undefined) return units[w];
    if (tens[w] !== undefined) return tens[w];
    const directDigit = parseInt(w, 10);
    if (!isNaN(directDigit)) return directDigit;
    return null;
  }

  if (words.length === 3 && words[1] === 'y') {
    const tVal = tens[words[0]];
    const uVal = units[words[2]];
    if (tVal !== undefined && uVal !== undefined) {
      return tVal + uVal;
    }
  }

  if (words.length === 2) {
    const tVal = tens[words[0]];
    const uVal = units[words[1]];
    if (tVal !== undefined && uVal !== undefined) {
      return tVal + uVal;
    }
  }

  return null;
};

const parseColloquialSpanishTime = (timeStr: string): string | undefined => {
  const clean = timeStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // If it's already HH:MM format
  const directMatch = clean.match(/(\d{1,2}):(\d{2})/);
  if (directMatch) {
    let h = parseInt(directMatch[1], 10);
    let m = parseInt(directMatch[2], 10);
    if (clean.includes('tarde') || clean.includes('noche') || clean.includes('pm')) {
      if (h < 12) h += 12;
    } else if (clean.includes('manana') || clean.includes('am')) {
      if (h === 12) h = 0;
    }
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // Word-to-number dictionary for Spanish numbers
  const numberWords: Record<string, number> = {
    'una': 1, 'uno': 1, 'un': 1,
    'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5, 'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
    'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15, 'dieciseis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19,
    'veinte': 20, 'veinticinco': 25, 'media': 30, 'medio': 30, 'cuarto': 15
  };

  const words = clean.split(/\s+/);
  
  let hour: number | null = null;
  let hourWordIdx = -1;

  // Let's first search for digits for hour
  for (let i = 0; i < words.length; i++) {
    const num = parseInt(words[i], 10);
    if (!isNaN(num) && num >= 0 && num <= 24) {
      hour = num;
      hourWordIdx = i;
      break;
    }
  }

  // If no digit hour, search for word number hour
  if (hour === null) {
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (numberWords[word] !== undefined && numberWords[word] >= 1 && numberWords[word] <= 12) {
        hour = numberWords[word];
        hourWordIdx = i;
        break;
      }
    }
  }

  if (hour === null) return undefined;

  let modifier: 'y' | 'menos' | null = null;
  let modifierIdx = -1;

  for (let i = hourWordIdx + 1; i < words.length; i++) {
    if (words[i] === 'y') {
      modifier = 'y';
      modifierIdx = i;
      break;
    }
    if (words[i] === 'menos') {
      modifier = 'menos';
      modifierIdx = i;
      break;
    }
  }

  let minutes = 0;

  if (modifier && modifierIdx !== -1) {
    const nextWords = words.slice(modifierIdx + 1);
    const parsedMin = parseSpanishWrittenNumber(nextWords);
    if (parsedMin !== null) {
      minutes = parsedMin;
    } else {
      const special: Record<string, number> = { 'media': 30, 'medio': 30, 'cuarto': 15 };
      for (const w of nextWords) {
        if (special[w] !== undefined) {
          minutes = special[w];
          break;
        }
      }
    }

    if (modifier === 'menos') {
      hour = hour - 1;
      if (hour < 0) hour = 23;
      minutes = 60 - minutes;
    }
  } else {
    const nextWords = words.slice(hourWordIdx + 1);
    const parsedMin = parseSpanishWrittenNumber(nextWords);
    if (parsedMin !== null) {
      minutes = parsedMin;
    } else {
      const special: Record<string, number> = { 'media': 30, 'medio': 30, 'cuarto': 15 };
      for (const w of nextWords) {
        if (special[w] !== undefined) {
          minutes = special[w];
          break;
        }
      }
    }
  }

  const isPM = clean.includes('tarde') || clean.includes('noche') || clean.includes('pm');
  const isAM = clean.includes('manana') || clean.includes('am');

  if (isPM) {
    if (hour < 12) {
      hour += 12;
    } else if (hour === 12 && clean.includes('noche')) {
      hour = 0;
    }
  } else if (isAM) {
    if (hour === 12) {
      hour = 0;
    }
  } else {
    // Default heuristic for tasks/alarms: if hour >= 1 && hour <= 8, assume afternoon PM
    if (hour >= 1 && hour <= 8) {
      hour += 12;
    }
  }

  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const parseVoiceCommand = (text: string, voiceKeywords?: VoiceKeywords) => {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .trim();

  const normalizePattern = (p: string) => p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Define patterns for keywords
  const keywords = [
    { tag: 'TYPE', patterns: (voiceKeywords?.type || ['tipo de elemento', 'tipo elemento', 'tipo', 'crear']).map(normalizePattern) },
    { tag: 'TITLE', patterns: (voiceKeywords?.title || ['titulo', 'nombre', 'tarea', 'recordatorio', 'alarma', 'ocio', 'actividad', 'plan']).map(normalizePattern) },
    { tag: 'DESCRIPTION', patterns: (voiceKeywords?.description || ['descripcion', 'nota', 'detalle', 'descripcion de', 'nota de']).map(normalizePattern) },
    { tag: 'PRIORITY', patterns: (voiceKeywords?.priority || ['prioridad', 'importancia']).map(normalizePattern) },
    { tag: 'WEIGHT', patterns: (voiceKeywords?.weight || ['peso', 'bloque', 'clasificacion']).map(normalizePattern) },
    { tag: 'HOURS', patterns: (voiceKeywords?.hours || ['horas', 'duracion', 'tiempo', 'horas estimadas']).map(normalizePattern) },
    { tag: 'DATE', patterns: (voiceKeywords?.date || ['fecha', 'dia', 'para el', 'fecha de']).map(normalizePattern) },
    { tag: 'TIME', patterns: (voiceKeywords?.time || ['hora', 'a las']).map(normalizePattern) },
    { tag: 'ENERGY', patterns: (voiceKeywords?.energy || ['energia', 'tipo de energia', 'actitud']).map(normalizePattern) },
    { tag: 'SLOT', patterns: (voiceKeywords?.slot || ['franja', 'horario', 'bloque de tiempo']).map(normalizePattern) },
    { tag: 'GOAL', patterns: (voiceKeywords?.goal || ['meta', 'objetivo']).map(normalizePattern) },
    { tag: 'FAVOURITE', patterns: (voiceKeywords?.favourite || ['favorito', 'destacado', 'importante']).map(normalizePattern) }
  ];

  // Flatten all patterns with their tags
  const flatPatterns: { tag: string; pattern: string }[] = [];
  keywords.forEach(({ tag, patterns }) => {
    patterns.forEach(pattern => {
      flatPatterns.push({ tag, pattern });
    });
  });

  // Sort patterns by length descending to prioritize longer phrases (e.g. "tarea llamada" before "tarea")
  flatPatterns.sort((a, b) => b.pattern.length - a.pattern.length);

  // Find all matches in order of length (longest first)
  const matches: { tag: string; index: number; keywordLength: number; keywordText: string }[] = [];

  flatPatterns.forEach(({ tag, pattern }) => {
    let idx = normalized.indexOf(pattern);
    while (idx !== -1) {
      // Ensure word boundary
      const beforeChar = idx > 0 ? normalized[idx - 1] : ' ';
      const afterChar = idx + pattern.length < normalized.length ? normalized[idx + pattern.length] : ' ';
      const isWordBoundary = /[^a-z0-9]/.test(beforeChar) && /[^a-z0-9]/.test(afterChar);

      if (isWordBoundary) {
        // Since we process longest first, check if this new match overlaps with an already added longer match
        const idxEnd = idx + pattern.length;
        const overlaps = matches.some(m => {
          const mEnd = m.index + m.keywordLength;
          return Math.max(m.index, idx) < Math.min(mEnd, idxEnd);
        });

        if (!overlaps) {
          matches.push({ tag, index: idx, keywordLength: pattern.length, keywordText: pattern });
        }
      }
      idx = normalized.indexOf(pattern, idx + 1);
    }
  });

  // Sort matches by index to parse they in appearance order
  matches.sort((a, b) => a.index - b.index);

  // If no matches, return null to avoid creating accidental items
  if (matches.length === 0) {
    return null;
  }

  // Extract content for each match
  const extracted: Record<string, string> = {};

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const startIndex = current.index + current.keywordLength;
    const endIndex = next ? next.index : normalized.length;

    let content = normalized.substring(startIndex, endIndex).trim();
    content = content.replace(/^[:,\-\s]+|[:,\-\s]+$/g, '').trim();

    if (current.tag === 'TITLE' || current.tag === 'DESCRIPTION') {
      const origStartIndex = current.index + current.keywordLength;
      const origEndIndex = next ? next.index : text.length;
      let origContent = text.substring(origStartIndex, origEndIndex).trim();
      origContent = origContent.replace(/^[:,\-\s]+|[:,\-\s]+$/g, '').trim();
      extracted[current.tag] = origContent;
    } else {
      extracted[current.tag] = content;
    }
  }

  // Determine type
  let type = ItemType.TASK;
  if (normalized.includes('alarma') || normalized.includes('alarm') || normalized.includes('reminder')) {
    type = ItemType.REMINDER;
  } else if (normalized.includes('recordatorio') || normalized.includes('memo') || normalized.includes('nota')) {
    type = ItemType.MEMO;
  } else if (normalized.includes('ocio') || normalized.includes('actividad') || normalized.includes('activity')) {
    type = ItemType.ACTIVITY;
  } else if (normalized.includes('plan')) {
    type = ItemType.PLAN;
  }

  // Title
  let title = extracted['TITLE'] || '';
  
  if (!title) {
    const titleMatch = matches.find(m => m.tag === 'TITLE');
    if (titleMatch) {
      const idx = matches.indexOf(titleMatch);
      const nextMatch = matches[idx + 1];
      const start = titleMatch.index + titleMatch.keywordLength;
      const end = nextMatch ? nextMatch.index : text.length;
      title = text.substring(start, end).trim();
      title = title.replace(/^[:,\-\s]+|[:,\-\s]+$/g, '').trim();
    }
  }

  const description = extracted['DESCRIPTION'] || '';

  // Priority
  let priority = Priority.MEDIUM;
  const prioVal = extracted['PRIORITY'] || '';
  if (prioVal.includes('urgente')) {
    priority = Priority.URGENT;
  } else if (prioVal.includes('alta') || prioVal.includes('alto') || prioVal.includes('high') || prioVal.includes('maxima')) {
    priority = Priority.HIGH;
  } else if (prioVal.includes('baja') || prioVal.includes('bajo') || prioVal.includes('low') || prioVal.includes('minima')) {
    priority = Priority.LOW;
  }

  // Hours
  let hours: number | undefined = undefined;
  const hoursVal = extracted['HOURS'] || '';
  if (hoursVal) {
    const numWords: Record<string, number> = {
      'una': 1, 'uno': 1, 'un': 1, 'dos': 2, 'tres': 3, 'cuatro': 4,
      'cinco': 5, 'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
    };
    if (numWords[hoursVal]) {
      hours = numWords[hoursVal];
    } else {
      const matchNum = hoursVal.match(/[\d\.]+/);
      if (matchNum) {
        hours = parseFloat(matchNum[0]);
      }
    }
  }

  // Weight mapping to hours if hours not specified
  let weightVal = (extracted['WEIGHT'] || '').toLowerCase();
  if (!hours && weightVal) {
    if (weightVal.includes('luna')) hours = 1;
    else if (weightVal.includes('terra')) hours = 5;
    else if (weightVal.includes('sol')) hours = 10;
    else if (weightVal.includes('astra')) hours = 0.3;
  }

  // Date
  let date: string | undefined = undefined;
  const dateVal = extracted['DATE'] || '';
  if (dateVal.includes('hoy')) {
    date = getLocalDateStr();
  } else if (dateVal.includes('manana')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    date = getLocalDateStr(tomorrow);
  } else {
    const dateMatch = dateVal.match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      date = dateMatch[0];
    }
  }

  // Time
  let time: string | undefined = undefined;
  const timeVal = extracted['TIME'] || '';
  if (timeVal) {
    time = parseColloquialSpanishTime(timeVal);
  }

  // EnergyType
  let energyType: EnergyType | undefined = undefined;
  const energyVal = (extracted['ENERGY'] || '').toLowerCase();
  if (energyVal) {
    if (energyVal.includes('creativ')) energyType = EnergyType.CREATIVE;
    else if (energyVal.includes('analit') || energyVal.includes('logic')) energyType = EnergyType.ANALYTICAL;
    else if (energyVal.includes('aprend') || energyVal.includes('estud') || energyVal.includes('learn')) energyType = EnergyType.LEARNING;
    else if (energyVal.includes('social') || energyVal.includes('gente') || energyVal.includes('reun')) energyType = EnergyType.SOCIAL;
    else if (energyVal.includes('admin') || energyVal.includes('gest') || energyVal.includes('pape')) energyType = EnergyType.ADMINISTRATIVE;
    else if (energyVal.includes('fisic') || energyVal.includes('deport') || energyVal.includes('ejerc') || energyVal.includes('cuerp')) energyType = EnergyType.PHYSICAL;
  }

  // Favourite
  let favourite = false;
  if (extracted['FAVOURITE'] !== undefined) {
    const favVal = (extracted['FAVOURITE'] || '').toLowerCase();
    if (favVal.includes('no') || favVal.includes('false') || favVal.includes('desactiv')) {
      favourite = false;
    } else {
      favourite = true;
    }
  } else {
    const hasFavMatch = matches.some(m => m.tag === 'FAVOURITE');
    if (hasFavMatch) {
      favourite = true;
    }
  }

  return {
    type,
    title: title.trim(),
    description: description.trim(),
    priority,
    hours,
    date,
    time,
    energyType,
    slotName: extracted['SLOT'] || '',
    goalName: extracted['GOAL'] || '',
    favourite,
    weight: extracted['WEIGHT'] || ''
  };
};

interface EditableProgressBarProps {
  task: Task;
  colors: any;
  onUpdate: (progress: number) => void;
}

const EditableProgressBar: React.FC<EditableProgressBarProps> = ({ task, colors, onUpdate }) => {
  const [containerWidth, setContainerWidth] = useState(0);

  const taskProgress = task.progress !== undefined && task.progress !== null
    ? task.progress 
    : (task.estimatedHours && task.estimatedHours > 0
       ? Math.min(100, Math.round(((task.workedTime || 0) / (task.estimatedHours * 60)) * 100))
       : 0);

  const handlePress = (event: any) => {
    event.stopPropagation();
    if (containerWidth <= 0) return;
    const x = event.nativeEvent.locationX;
    const percentage = Math.min(100, Math.max(0, Math.round((x / containerWidth) * 100)));
    onUpdate(percentage);
  };

  return (
    <View style={{ marginTop: 8, gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}>Progreso</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 9, opacity: 0.7 }}>
            ({task.workedTime || 0}m de {Math.round((task.estimatedHours || 0) * 60)}m est.)
          </Text>
        </View>
        <Text style={{ color: '#34C759', fontSize: 11, fontWeight: '700' }}>{taskProgress}%</Text>
      </View>
      
      <Pressable
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onPress={handlePress}
        style={{
          height: 14,
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <View style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.backgroundSelected,
          width: '100%',
          overflow: 'hidden',
        }}>
          <View style={{
            height: '100%',
            width: `${taskProgress}%`,
            backgroundColor: '#34C759',
            borderRadius: 4
          }} />
        </View>
      </Pressable>
    </View>
  );
};

export default function DecisionCenterScreen() {
  const store = useRememberStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  // Voice Command Assistant State
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);
  const [voiceInputText, setVoiceInputText] = useState('');
  const [isVoicePrivate, setIsVoicePrivate] = useState(false);

  // Alarm Modal States
  const [alarmTask, setAlarmTask] = useState<Task | null>(null);
  const [alarmHour, setAlarmHour] = useState(new Date().getHours());
  const [alarmMinute, setAlarmMinute] = useState(new Date().getMinutes());

  // Task options and roadmap modal state
  const [selectedTaskOptions, setSelectedTaskOptions] = useState<Task | null>(null);
  const [showProgressRoadmap, setShowProgressRoadmap] = useState<Task | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editNextStep, setEditNextStep] = useState('');
  const [editProgress, setEditProgress] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const todayStr = getLocalDateStr();

  const handleScheduleSystemAlarm = async (taskTitle: string, hours: number, minutes: number) => {
    if (Platform.OS === 'android') {
      try {
        const IntentLauncher = require('expo-intent-launcher');
        await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
          extra: {
            'android.intent.extra.alarm.HOUR': hours,
            'android.intent.extra.alarm.MINUTES': minutes,
            'android.intent.extra.alarm.MESSAGE': taskTitle,
            'android.intent.extra.alarm.SKIP_UI': true,
          },
        });
        Alert.alert('Alarma Programada', `Se programó la alarma para hoy a las ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} para "${taskTitle}".`);
      } catch (err: any) {
        console.warn('Failed to start system alarm intent:', err);
        Alert.alert('Error', `No se pudo programar la alarma: ${err?.message || String(err)}`);
      }
    } else {
      Alert.alert('No soportado', 'La programación de alarmas del sistema con esta hora solo está soportada en Android.');
    }
  };

  const handleOpenAlarmDialog = (task: Task) => {
    const now = new Date();
    setAlarmHour(now.getHours());
    setAlarmMinute(now.getMinutes());
    setAlarmTask(task);
  };

  // Clear voice input when modal is closed
  React.useEffect(() => {
    if (!isVoiceModalVisible) {
      setVoiceInputText('');
    }
  }, [isVoiceModalVisible]);

  // Undo support state for voice actions
  const [lastCreatedItem, setLastCreatedItem] = useState<{
    id: string;
    type: 'item' | 'list_item';
    title: string;
    listId?: string;
  } | null>(null);

  React.useEffect(() => {
    if (lastCreatedItem) {
      const timer = setTimeout(() => {
        setLastCreatedItem(null);
      }, 10000); // 10 seconds timeout
      return () => clearTimeout(timer);
    }
  }, [lastCreatedItem]);

  const handleUndo = async () => {
    if (!lastCreatedItem) return;
    try {
      if (lastCreatedItem.type === 'item') {
        await store.deleteItemPermanently(lastCreatedItem.id);
      } else if (lastCreatedItem.type === 'list_item' && lastCreatedItem.listId) {
        await store.deleteListItem(lastCreatedItem.listId, lastCreatedItem.id);
      }
      const undoMsg = `Deshecho: se ha eliminado "${lastCreatedItem.title}".`;
      speak(undoMsg);
      Alert.alert('Deshacer', undoMsg);
    } catch (err) {
      console.error('Failed to undo voice action:', err);
    } finally {
      setLastCreatedItem(null);
    }
  };

  const handleExecuteVoiceCommand = async (command: string) => {
    Keyboard.dismiss();
    if (!command.trim()) {
      const msg = 'El comando de voz está vacío.';
      speak(msg);
      Alert.alert('Error', msg);
      return;
    }

    try {
      const cleanCommand = command.trim();
      const normalized = cleanCommand
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      const vk = store.userSettings.voiceKeywords || DEFAULT_VOICE_KEYWORDS;
      const normalizePattern = (p: string) => p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

      const queryListsPatterns = (vk.queryLists || ['nombre de todas las listas', 'cuales son mis listas', 'que listas tengo', 'listas', 'cuales son las listas']).map(normalizePattern);
      const queryListItemsPatterns = (vk.queryListItems || ['elementos de la lista', 'que tiene la lista', 'ver lista', 'contenido de la lista', 'que elementos tiene la lista']).map(normalizePattern);

      // Check if it's a list names query
      let isQueryLists = false;
      for (const pattern of queryListsPatterns) {
        if (normalized.includes(pattern)) {
          isQueryLists = true;
          break;
        }
      }

      if (isQueryLists) {
        const listNames = store.lists.map(l => l.name);
        let voiceMsg = '';
        if (listNames.length === 0) {
          voiceMsg = 'No tienes ninguna lista creada todavía.';
        } else {
          voiceMsg = `Las listas que tienes son: ${listNames.join(', ')}.`;
        }
        speak(voiceMsg);
        Alert.alert('Consulta de Listas', voiceMsg);
        setIsVoiceModalVisible(false);
        setVoiceInputText('');
        return;
      }

      // Check if it's a list items query
      let matchedPattern: string | null = null;
      let patternIndex = -1;
      for (const pattern of queryListItemsPatterns) {
        const idx = normalized.indexOf(pattern);
        if (idx !== -1) {
          matchedPattern = pattern;
          patternIndex = idx;
          break;
        }
      }

      if (matchedPattern !== null) {
        const sortedLists = [...store.lists].sort((a, b) => b.name.length - a.name.length);
        
        const findBestMatchingList = (text: string) => {
          const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          
          for (const list of sortedLists) {
            const normListName = list.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            if (normalizedText.includes(normListName)) {
              return list;
            }
          }

          const wordsToIgnore = new Set(['lista', 'de', 'la', 'el', 'del', 'ver', 'añade', 'añadir', 'agregar', 'agrega', 'poner', 'en', 'los', 'las', 'un', 'una', 'elementos', 'contenido', 'que', 'tiene']);
          const cleanTextWords = normalizedText.split(/\s+/).filter(w => !wordsToIgnore.has(w) && w.length > 1);

          if (cleanTextWords.length > 0) {
            for (const list of sortedLists) {
              const normListName = list.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
              for (const word of cleanTextWords) {
                if (normListName.includes(word)) {
                  return list;
                }
              }
            }
          }
          return null;
        };

        const matchedList = findBestMatchingList(cleanCommand);

        let voiceMsg = '';
        if (matchedList) {
          const itemsText = matchedList.items.map(it => it.text);
          if (itemsText.length === 0) {
            voiceMsg = `La lista ${matchedList.name} está vacía.`;
          } else {
            voiceMsg = `La lista ${matchedList.name} tiene ${itemsText.length} elementos: ${itemsText.join(', ')}.`;
          }
        } else {
          let listNameQuery = cleanCommand.substring(patternIndex + matchedPattern.length).trim();
          listNameQuery = listNameQuery.replace(/^(de la|de el|del|de|la|el)\s+/i, '').trim();
          if (!listNameQuery) {
            listNameQuery = cleanCommand.substring(0, patternIndex).trim();
          }
          voiceMsg = `No pude encontrar ninguna lista que coincida con "${listNameQuery || cleanCommand}".`;
        }

        speak(voiceMsg);
        Alert.alert('Consulta de Lista', voiceMsg);
        setIsVoiceModalVisible(false);
        setVoiceInputText('');
        return;
      }

      // Check if it's an add item to list command
      let matchedAddPattern: string | null = null;
      let addPatternIndex = -1;
      const addListItemPatterns = (vk.addListItem || ['añadir elemento a la lista', 'añade a la lista', 'agregar a la lista', 'poner en la lista', 'añadir a la lista', 'agrega a la lista']).map(normalizePattern);

      for (const pattern of addListItemPatterns) {
        const idx = normalized.indexOf(pattern);
        if (idx !== -1) {
          matchedAddPattern = pattern;
          addPatternIndex = idx;
          break;
        }
      }

      if (matchedAddPattern !== null) {
        const sortedLists = [...store.lists].sort((a, b) => b.name.length - a.name.length);

        const findBestMatchingList = (text: string) => {
          const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          
          for (const list of sortedLists) {
            const normListName = list.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            if (normalizedText.includes(normListName)) {
              return { list, matchedText: normListName };
            }
          }

          const wordsToIgnore = new Set(['lista', 'de', 'la', 'el', 'del', 'ver', 'añade', 'añadir', 'agregar', 'agrega', 'poner', 'en', 'los', 'las', 'un', 'una', 'elementos', 'contenido', 'que', 'tiene']);
          const cleanTextWords = normalizedText.split(/\s+/).filter(w => !wordsToIgnore.has(w) && w.length > 1);

          if (cleanTextWords.length > 0) {
            for (const list of sortedLists) {
              const normListName = list.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
              for (const word of cleanTextWords) {
                if (normListName.includes(word)) {
                  return { list, matchedText: word };
                }
              }
            }
          }
          return null;
        };

        const removeSubstrings = (source: string, sub1: string, sub2: string): string => {
          const normSource = source.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const normSub1 = sub1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const normSub2 = sub2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

          const idx1 = normSource.indexOf(normSub1);
          const idx2 = normSource.indexOf(normSub2);

          const ranges: { start: number; end: number }[] = [];
          if (idx1 !== -1) {
            ranges.push({ start: idx1, end: idx1 + sub1.length });
          }
          if (idx2 !== -1) {
            ranges.push({ start: idx2, end: idx2 + sub2.length });
          }

          if (ranges.length === 0) return source;

          ranges.sort((a, b) => a.start - b.start);
          const merged: { start: number; end: number }[] = [];
          for (const r of ranges) {
            if (merged.length === 0) {
              merged.push(r);
            } else {
              const last = merged[merged.length - 1];
              if (r.start <= last.end) {
                last.end = Math.max(last.end, r.end);
              } else {
                merged.push(r);
              }
            }
          }

          let result = '';
          let lastIdx = 0;
          for (const r of merged) {
            result += source.substring(lastIdx, r.start);
            lastIdx = r.end;
          }
          result += source.substring(lastIdx);
          return result.trim();
        };

        const matchResult = findBestMatchingList(cleanCommand);

        if (matchResult) {
          const { list, matchedText } = matchResult;
          let itemText = removeSubstrings(cleanCommand, matchedAddPattern, matchedText);

          itemText = itemText.replace(/^(añadir|añade|agregar|agrega|poner|poner en|a la|a)\s+/i, '').trim();
          itemText = itemText.replace(/^(el elemento|un elemento|la tarea|el|la|un|una|que se llama|llamado|llamada|de la|de el|del|de)\s+/i, '').trim();

          if (itemText) {
            const newItemId = await store.addListItem(list.id, itemText);
            setLastCreatedItem({
              id: newItemId,
              type: 'list_item',
              title: itemText,
              listId: list.id
            });
            const voiceMsg = `Añadido "${itemText}" a la lista "${list.name}".`;
            speak(voiceMsg);
            Alert.alert('Éxito', voiceMsg);
            setIsVoiceModalVisible(false);
            setVoiceInputText('');
            return;
          }
        }

        const voiceMsg = `No pude encontrar la lista o el elemento a añadir en tu comando.`;
        speak(voiceMsg);
        Alert.alert('Error de comando', voiceMsg);
        return;
      }

      const parsed = parseVoiceCommand(command, store.userSettings.voiceKeywords);

      if (!parsed || !parsed.title) {
        const msg = 'No pude entender el comando. Asegúrate de incluir palabras clave como "tarea", "recordatorio" o "crear".';
        speak(msg);
        Alert.alert('Comando no reconocido', msg);
        return;
      }

      if (parsed.type === ItemType.TASK) {
        let timeSlotId: string | undefined = undefined;
        if (parsed.slotName) {
          const cleanSlotName = parsed.slotName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const matchedSlot = store.timeSlots.find(s => 
            s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(cleanSlotName)
          );
          if (matchedSlot) {
            timeSlotId = matchedSlot.id;
          }
        }

        let goalId: string | undefined = undefined;
        if (parsed.goalName) {
          const cleanGoalName = parsed.goalName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const matchedGoal = store.goals.find(g => 
            g.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(cleanGoalName)
          );
          if (matchedGoal) {
            goalId = matchedGoal.id;
          }
        }

        const newId = await store.createTask(
          parsed.title,
          parsed.description || '',
          parsed.date || undefined,
          parsed.date || undefined,
          parsed.hours,
          parsed.priority,
          goalId,
          undefined, // phaseId
          timeSlotId,
          parsed.energyType
        );

        setLastCreatedItem({
          id: newId,
          type: 'item',
          title: parsed.title
        });

        if (parsed.favourite) {
          setTimeout(async () => {
            const lastItem = store.items.filter(i => i.title === parsed.title).sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0];
            if (lastItem) {
              await store.updateItem(lastItem.id, { favourite: true });
            }
          }, 300);
        }

        let paramsText = [];
        if (parsed.weight) {
          paramsText.push(`peso ${parsed.weight}`);
        } else if (parsed.hours) {
          paramsText.push(`duración de ${parsed.hours} ${parsed.hours === 1 ? 'hora' : 'horas'}`);
        }
        if (parsed.priority) {
          const prioLabel = parsed.priority === Priority.HIGH ? 'alta' : parsed.priority === Priority.LOW ? 'baja' : 'media';
          paramsText.push(`prioridad ${prioLabel}`);
        }
        if (parsed.energyType) {
          const energyLabels: Record<string, string> = {
            CREATIVE: 'creativa', ANALYTICAL: 'analítica', LEARNING: 'aprendizaje',
            SOCIAL: 'social', ADMINISTRATIVE: 'administrativa', PHYSICAL: 'física'
          };
          paramsText.push(`energía ${energyLabels[parsed.energyType] || parsed.energyType}`);
        }
        if (parsed.date) {
          paramsText.push(`fecha ${parsed.date}`);
        }
        const paramsSuffix = paramsText.length > 0 ? ` con ${paramsText.join(', ')}` : '';
        const voiceMsg = `Creada la tarea "${parsed.title}"${paramsSuffix}.`;
        speak(voiceMsg);
        Alert.alert('Éxito', voiceMsg);
      } else if (parsed.type === ItemType.REMINDER) {
        const timeStr = parsed.time || '12:00';
        const dateStr = parsed.date || getLocalDateStr();
        const newId = await store.createReminder(
          parsed.title,
          parsed.description || '',
          dateStr,
          timeStr,
          [dateStr],
          true
        );

        setLastCreatedItem({
          id: newId,
          type: 'item',
          title: parsed.title
        });

        if (parsed.favourite) {
          setTimeout(async () => {
            const lastItem = store.items.filter(i => i.title === parsed.title).sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0];
            if (lastItem) {
              await store.updateItem(lastItem.id, { favourite: true });
            }
          }, 300);
        }

        let paramsText = [];
        if (timeStr) paramsText.push(`a las ${timeStr}`);
        if (dateStr) paramsText.push(`para el día ${dateStr}`);
        const paramsSuffix = paramsText.length > 0 ? ` para ${paramsText.join(' ')}` : '';
        const voiceMsg = `Creada la alarma "${parsed.title}"${paramsSuffix}.`;
        speak(voiceMsg);
        Alert.alert('Éxito', voiceMsg);
      } else if (parsed.type === ItemType.MEMO) {
        const dateStr = parsed.date || getLocalDateStr();
        const newId = await store.createMemo(
          parsed.title,
          parsed.description || '',
          dateStr,
          dateStr,
          false,
          '12:00'
        );

        setLastCreatedItem({
          id: newId,
          type: 'item',
          title: parsed.title
        });

        if (parsed.favourite) {
          setTimeout(async () => {
            const lastItem = store.items.filter(i => i.title === parsed.title).sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0];
            if (lastItem) {
              await store.updateItem(lastItem.id, { favourite: true });
            }
          }, 300);
        }

        let paramsText = [];
        if (dateStr) paramsText.push(`para el día ${dateStr}`);
        const paramsSuffix = paramsText.length > 0 ? ` para ${paramsText.join(' ')}` : '';
        const voiceMsg = `Creado el recordatorio "${parsed.title}"${paramsSuffix}.`;
        speak(voiceMsg);
        Alert.alert('Éxito', voiceMsg);
      } else if (parsed.type === ItemType.ACTIVITY) {
        const newId = await store.createActivity(
          parsed.title,
          'OTHER',
          parsed.description || '',
          [],
          parsed.favourite
        );

        setLastCreatedItem({
          id: newId,
          type: 'item',
          title: parsed.title
        });

        const voiceMsg = `Creada la idea de ocio "${parsed.title}".`;
        speak(voiceMsg);
        Alert.alert('Éxito', voiceMsg);
      } else if (parsed.type === ItemType.PLAN) {
        const today = new Date();
        const newId = await store.createPlan(
          parsed.title,
          parsed.description || '',
          today.getMonth() + 1,
          today.getFullYear(),
          today.getMonth() + 1,
          today.getFullYear()
        );

        setLastCreatedItem({
          id: newId,
          type: 'item',
          title: parsed.title
        });

        if (parsed.favourite) {
          setTimeout(async () => {
            const lastItem = store.items.filter(i => i.title === parsed.title).sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0];
            if (lastItem) {
              await store.updateItem(lastItem.id, { favourite: true });
            }
          }, 300);
        }

        const voiceMsg = `Creado el plan futuro "${parsed.title}".`;
        speak(voiceMsg);
        Alert.alert('Éxito', voiceMsg);
      }

      setIsVoiceModalVisible(false);
      setVoiceInputText('');
    } catch (error: any) {
      const errorMsg = `Error al crear el elemento: ${error.message}`;
      speak('Ocurrió un error al procesar el comando.');
      Alert.alert('Error', errorMsg);
    }
  };

  // 1. Dynamic Greeting based on hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días!';
    if (hour < 20) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  }, []);

  // 2. Recommendation Engine Integration
  const { recommendations, triggerRecalculate, rejectRecommendation } = useRecommendationService();
  const primaryRec = recommendations[0];

  const recommendedTask = useMemo(() => {
    if (!primaryRec || !primaryRec.taskId) return null;
    return store.getTasks().find((t) => t.id === primaryRec.taskId) || null;
  }, [primaryRec, store.items]);

  // Fetch active focus tasks (focusLocked === true)
  const focusTasks = useMemo(() => {
    return store.getTasks().filter((t) => t.focusLocked && !t.completed);
  }, [store.items]);

  React.useEffect(() => {
    triggerRecalculate();
  }, [store.items, store.sessions]);

  // 3. Today's Recordatorios (Memos active today)
  const todayMemos = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return store.getMemos().filter((memo) => {
      if (memo.completed || memo.trash || memo.archived) return false;
      const start = memo.startDate || '';
      const end = memo.endDate || '';
      const effectiveEnd = end ? end : (start ? start : '');
      if (start && effectiveEnd) {
        return todayStr >= start && todayStr <= effectiveEnd;
      }
      if (effectiveEnd) {
        return todayStr <= effectiveEnd;
      }
      return true;
    }).slice(0, 3);
  }, [store.items]);

  // 4. Activity Suggestion
  const [randomSuggestionIndex, setRandomSuggestionIndex] = useState(0);
  
  const suggestedActivity = useMemo(() => {
    const suggestions = store.getSuggestedActivities();
    if (suggestions.length === 0) return null;
    return suggestions[randomSuggestionIndex % suggestions.length];
  }, [store.items, randomSuggestionIndex]);

  const handleNextSuggestion = () => {
    setRandomSuggestionIndex((prev) => prev + 1);
  };

  // Helper stats
  const pendingTasksCount = useMemo(() => store.getTasks().filter((t) => !t.completed).length, [store.items]);
  const activeMemosCount = useMemo(() => store.getMemos().filter((m) => !m.completed).length, [store.items]);
  const pendingPlansCount = useMemo(() => store.getPlans().filter((p) => !p.completed).length, [store.items]);
  const trashCount = useMemo(() => store.getTrashItems().length, [store.items]);

  const handleQuickCreate = (type: ItemType) => {
    router.push({
      pathname: '/editor',
      params: { type },
    });
  };

  const handleChangePriority = (task: Task) => {
    Alert.alert(
      'Cambiar Prioridad',
      `Selecciona la nueva prioridad para "${task.title}":`,
      [
        {
          text: 'Urgente (URGENT)',
          onPress: async () => {
            await store.updateItem(task.id, { priority: Priority.URGENT });
          },
        },
        {
          text: 'Alta (HIGH)',
          onPress: async () => {
            await store.updateItem(task.id, { priority: Priority.HIGH });
          },
        },
        {
          text: 'Media (MEDIUM)',
          onPress: async () => {
            await store.updateItem(task.id, { priority: Priority.MEDIUM });
          },
        },
        {
          text: 'Baja (LOW)',
          onPress: async () => {
            await store.updateItem(task.id, { priority: Priority.LOW });
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting}</Text>
          <Text style={[styles.title, { color: colors.text }]}>RubeRemember</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => router.push('/sync')} style={[styles.iconButton, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="arrow-up-circle-outline" size={20} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => router.push('/search')} style={[styles.iconButton, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="search-outline" size={20} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => router.push('/statistics')} style={[styles.iconButton, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} style={[styles.iconButton, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Dynamic Stats Banner */}
        <View style={[styles.statsBanner, { backgroundColor: colors.backgroundElement }]}>
          <Pressable onPress={() => router.push('/tasks')} style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#FF9500' }]}>{pendingTasksCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tareas</Text>
          </Pressable>
          <View style={[styles.statDivider, { backgroundColor: colors.backgroundSelected }]} />
          <Pressable onPress={() => router.push('/memos')} style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#00C7BE' }]}>{activeMemosCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Recs</Text>
          </Pressable>
          <View style={[styles.statDivider, { backgroundColor: colors.backgroundSelected }]} />
          <Pressable onPress={() => router.push('/activities')} style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#5856D6' }]}>{store.getActivities().length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ocio</Text>
          </Pressable>
          <View style={[styles.statDivider, { backgroundColor: colors.backgroundSelected }]} />
          <Pressable onPress={() => router.push('/plans')} style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#BF5AF2' }]}>{pendingPlansCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Planes</Text>
          </Pressable>
        </View>

        {/* BOTÓN VER LISTAS */}
        <Pressable
          onPress={() => router.push('/lists')}
          style={({ pressed }) => [
            {
              backgroundColor: colors.backgroundElement,
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: pressed ? 0.9 : 1,
              marginTop: 12,
              marginBottom: 4,
              borderWidth: 1,
              borderColor: colors.backgroundSelected,
            }
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ 
              width: 38, 
              height: 38, 
              borderRadius: 12, 
              backgroundColor: 'rgba(52, 199, 89, 0.15)', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Ionicons name="list" size={20} color="#34C759" />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Mis Listas</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                Organiza tus notas, compras y tareas rápidas
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>

        {/* 1. RECOMMENDATION CARD */}
        <View style={[styles.sectionContainer]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🎯 Recomendación Principal</Text>
          
          {primaryRec ? (
            recommendedTask ? (
              // Task Recommendation
              <Pressable
                onPress={() => setSelectedTaskOptions(recommendedTask)}
                style={[styles.focusCard, { backgroundColor: colors.backgroundElement, borderColor: primaryRec.priorityLevel === 'ALTA' ? '#FF3B30' : '#FF9500' }]}
              >
                <View style={styles.focusHeader}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <View style={[styles.priorityBadge, { backgroundColor: primaryRec.priorityLevel === 'ALTA' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 149, 0, 0.15)' }]}>
                      <Text style={[styles.priorityBadgeText, { color: primaryRec.priorityLevel === 'ALTA' ? '#FF3B30' : '#FF9500' }]}>
                        {primaryRec.priorityLevel}
                      </Text>
                    </View>
                    {primaryRec.confidenceLevel && (
                      <View style={{ backgroundColor: 'rgba(52, 199, 89, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ color: '#34C759', fontSize: 10, fontWeight: '700' }}>
                          {primaryRec.confidenceLevel}% Coincidencia
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                    ⌛ {primaryRec.recommendedDuration} min ({primaryRec.sessionType})
                  </Text>
                </View>

                <Text style={[styles.focusTitle, { color: colors.text }]} numberOfLines={2}>
                  {recommendedTask.title}
                </Text>
                
                <EditableProgressBar
                  task={recommendedTask}
                  colors={colors}
                  onUpdate={async (newProgress) => {
                    await store.updateItems([recommendedTask.id], {
                      progress: newProgress,
                      taskState: newProgress === 100 ? TaskState.COMPLETED : recommendedTask.taskState
                    });
                  }}
                />
                
                <Text style={[styles.recReason, { color: colors.text }]} numberOfLines={3}>
                  {primaryRec.reason}
                </Text>

                {primaryRec.reasonsSecondary && primaryRec.reasonsSecondary.length > 0 && (
                  <View style={styles.secondaryReasonsContainer}>
                    {primaryRec.reasonsSecondary.map((sec, idx) => (
                      <Text key={idx} style={[styles.secReasonText, { color: colors.textSecondary }]}>
                        • {sec}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={[styles.cardFooter, { justifyContent: 'space-between', marginTop: 12 }]}>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push({
                        pathname: '/session',
                        params: { taskId: recommendedTask.id, duration: primaryRec.recommendedDuration }
                      });
                    }}
                    style={[styles.completeButton, { backgroundColor: '#34C759' }]}
                  >
                    <Ionicons name="play" size={16} color="#fff" />
                    <Text style={styles.completeButtonText}>{primaryRec.actionSuggested || 'Comenzar'}</Text>
                  </Pressable>

                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      rejectRecommendation(primaryRec.id);
                    }}
                    style={[styles.completeButton, { backgroundColor: 'rgba(255, 59, 48, 0.15)' }]}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#FF3B30" />
                    <Text style={[styles.completeButtonText, { color: '#FF3B30' }]}>No ahora</Text>
                  </Pressable>
                </View>
              </Pressable>
            ) : (
              // Active Reminder Card
              <View style={[styles.focusCard, { backgroundColor: colors.backgroundElement, borderColor: '#007AFF' }]}>
                <View style={styles.focusHeader}>
                  <View style={[styles.priorityBadge, { backgroundColor: 'rgba(0, 122, 255, 0.15)' }]}>
                    <Text style={[styles.priorityBadgeText, { color: '#007AFF' }]}>ATENCIÓN</Text>
                  </View>
                </View>

                <Text style={[styles.focusTitle, { color: colors.text }]} numberOfLines={2}>
                  {primaryRec.reason}
                </Text>

                {primaryRec.reasonsSecondary && primaryRec.reasonsSecondary.map((sec, idx) => (
                  <Text key={idx} style={[styles.secReasonText, { color: colors.textSecondary, marginTop: 4 }]}>
                    {sec}
                  </Text>
                ))}

                <View style={[styles.cardFooter, { marginTop: 12, flexDirection: 'row', gap: 10 }]}>
                  <Pressable
                    onPress={async () => {
                      if (primaryRec.taskId) {
                        await store.toggleItemCompleted(primaryRec.taskId);
                        triggerRecalculate();
                      } else {
                        const reminder = store.getMemos().find(r => primaryRec.reason.includes(r.title));
                        if (reminder) {
                          await store.toggleItemCompleted(reminder.id);
                          triggerRecalculate();
                        } else {
                          const todayStr = new Date().toISOString().split('T')[0];
                          const activeRem = store.getMemos().find(m => {
                            if (m.completed || !m.hasAlarm) return false;
                            const start = m.startDate || '';
                            const end = m.endDate || '';
                            const effEnd = end ? end : (start ? start : '');
                            return (!start || start <= todayStr) && (!effEnd || effEnd >= todayStr);
                          });
                          if (activeRem) {
                            await store.toggleItemCompleted(activeRem.id);
                            triggerRecalculate();
                          }
                        }
                      }
                    }}
                    style={[styles.completeButton, { backgroundColor: '#34C759', flex: 1, justifyContent: 'center', height: 40, borderRadius: 10 }]}
                  >
                    <Ionicons name="checkmark-done" size={16} color="#fff" />
                    <Text style={styles.completeButtonText}>Completar</Text>
                  </Pressable>

                  <Pressable
                    onPress={async () => {
                      let rId: string | undefined = primaryRec.taskId;
                      if (!rId) {
                        const reminder = store.getMemos().find(r => primaryRec.reason.includes(r.title));
                        if (reminder) {
                          rId = reminder.id;
                        } else {
                          const todayStr = new Date().toISOString().split('T')[0];
                          const activeRem = store.getMemos().find(m => {
                            if (m.completed || !m.hasAlarm) return false;
                            const start = m.startDate || '';
                            const end = m.endDate || '';
                            const effEnd = end ? end : (start ? start : '');
                            return (!start || start <= todayStr) && (!effEnd || effEnd >= todayStr);
                          });
                          if (activeRem) {
                            rId = activeRem.id;
                          }
                        }
                      }
                      if (rId) {
                        const now = new Date();
                        now.setMinutes(now.getMinutes() + 15);
                        const hh = String(now.getHours()).padStart(2, '0');
                        const mm = String(now.getMinutes()).padStart(2, '0');
                        const newTime = `${hh}:${mm}`;
                        await store.updateItem(rId, { alarmTime: newTime });
                        triggerRecalculate();
                        Alert.alert('Pospuesto', 'El recordatorio se ha pospuesto 15 minutos.');
                      } else {
                        Alert.alert('Error', 'No se encontró el recordatorio a posponer.');
                      }
                    }}
                    style={[styles.completeButton, { backgroundColor: '#FF9500', flex: 1, justifyContent: 'center', height: 40, borderRadius: 10 }]}
                  >
                    <Ionicons name="timer-outline" size={16} color="#fff" />
                    <Text style={styles.completeButtonText}>Posponer (15m)</Text>
                  </Pressable>
                </View>
              </View>
            )
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="sparkles-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
                No hay recomendaciones listas.
              </Text>
              <Pressable
                onPress={() => triggerRecalculate()}
                style={[styles.emptyCardBtn, { borderColor: '#FF9500' }]}
              >
                <Text style={{ color: '#FF9500', fontWeight: '700', fontSize: 13 }}>Calcular</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 1.2. FOCUS TASKS SECTION */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📌 Tareas en Enfoque (Focus)</Text>
            <Pressable onPress={() => router.push('/tasks')}>
              <Text style={{ color: '#FF9500', fontWeight: '600', fontSize: 13 }}>Gestionar</Text>
            </Pressable>
          </View>

          {focusTasks.length > 0 ? (
            <View style={{ gap: 8 }}>
              {focusTasks.map(task => (
                <Pressable
                  key={task.id}
                  onPress={() => setSelectedTaskOptions(task)}
                  style={[styles.reminderItem, { backgroundColor: colors.backgroundElement }]}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.reminderTitle, { color: colors.text }]} numberOfLines={1}>
                      {task.title}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                      {task.energyType} • {task.priority.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenAlarmDialog(task);
                      }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="alarm-outline" size={22} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        const weightLabel = getTaskWeightLabel(task.estimatedHours, store.hourWeights).toLowerCase();
                        let dur = 30;
                        if (weightLabel === 'luna') {
                          dur = store.userSettings.lunaDuration || 30;
                        } else if (weightLabel === 'terra') {
                          dur = store.userSettings.terraDuration || 45;
                        } else if (weightLabel === 'sol') {
                          dur = store.userSettings.solDuration || 90;
                        } else if (weightLabel === 'astra') {
                          dur = store.userSettings.astraDuration || 20;
                        }

                        router.push({
                          pathname: '/session',
                          params: { taskId: task.id, duration: String(dur) }
                        });
                      }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="play-circle-outline" size={26} color="#34C759" />
                    </Pressable>
                    <Pressable
                      onPress={async (e) => {
                        e.stopPropagation();
                        await store.toggleItemCompleted(task.id);
                        triggerRecalculate();
                      }}
                      style={styles.reminderCheckBtn}
                    >
                      <Ionicons name="ellipse-outline" size={24} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
                No tienes tareas marcadas como Focus. El motor seleccionará las mejores automáticamente.
              </Text>
            </View>
          )}
        </View>

        {/* 1.3. ALTERNATIVES SECTION */}
        {primaryRec && primaryRec.alternatives && primaryRec.alternatives.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🔄 Otras opciones para hoy</Text>
            <View style={{ gap: 8 }}>
              {primaryRec.alternatives.map(altId => {
                const altTask = store.getTasks().find(t => t.id === altId);
                if (!altTask) return null;
                return (
                  <Pressable
                    key={altTask.id}
                    onPress={() => setSelectedTaskOptions(altTask)}
                    style={[styles.reminderItem, { backgroundColor: colors.backgroundElement, opacity: 0.8 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reminderTitle, { color: colors.text, fontSize: 14 }]} numberOfLines={1}>
                        {altTask.title}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                        {altTask.priority.toUpperCase()} • {altTask.energyType}
                      </Text>
                    </View>
                    <Ionicons name="play-circle-outline" size={24} color="#34C759" />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* 2. TODAY'S RECORDATORIOS (MEMOS) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🔖 Recordatorios de Hoy</Text>
            <Pressable onPress={() => router.push('/memos')}>
              <Text style={{ color: '#00C7BE', fontWeight: '600', fontSize: 13 }}>Ver todos</Text>
            </Pressable>
          </View>

          {todayMemos.length > 0 ? (
            <View style={styles.remindersList}>
              {todayMemos.map((memo) => (
                <View key={memo.id} style={[styles.reminderItem, { backgroundColor: colors.backgroundElement }]}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.reminderTitle, { color: colors.text }]} numberOfLines={1}>
                      {memo.title}
                    </Text>
                    <View style={styles.reminderMetaRow}>
                      <Ionicons name={memo.hasAlarm ? "alarm-outline" : "bookmark-outline"} size={12} color="#00C7BE" />
                      <Text style={[styles.reminderTimeText, { color: '#00C7BE' }]}>
                        {memo.hasAlarm ? `Acción: ${memo.alarmTime || '12:00'}` : 'Nota'}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={async () => {
                      await store.toggleItemCompleted(memo.id);
                    }}
                    style={styles.reminderCheckBtn}
                  >
                    <Ionicons name="ellipse-outline" size={24} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="bookmark-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
                No hay recordatorios activos para hoy.
              </Text>
            </View>
          )}
        </View>

        {/* 3. SMART ACTIVITY SUGGESTION */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>✨ Tiempo Libre</Text>
            <Pressable onPress={() => router.push('/activities')}>
              <Text style={{ color: '#5856D6', fontWeight: '600', fontSize: 13 }}>Ver ideas</Text>
            </Pressable>
          </View>

          {suggestedActivity ? (
            <View style={[styles.suggestionCard, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.suggestionHeader}>
                <Text style={styles.suggestionBadge}>💡 SUGERENCIA</Text>
                <Pressable onPress={handleNextSuggestion} style={styles.shuffleBtn}>
                  <Ionicons name="shuffle" size={16} color="#5856D6" />
                  <Text style={{ color: '#5856D6', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>Otra</Text>
                </Pressable>
              </View>
              
              <Text style={[styles.suggestionTitle, { color: colors.text }]}>
                {suggestedActivity.title}
              </Text>

              {suggestedActivity.description ? (
                <Text style={[styles.suggestionDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {suggestedActivity.description}
                </Text>
              ) : null}

              <View style={[styles.row, { gap: 10, marginTop: 12 }]}>
                <Pressable
                  onPress={async () => {
                    await store.registerActivityDone(suggestedActivity.id);
                    Alert.alert('¡Excelente!', `Registraste "${suggestedActivity.title}" como realizada.`);
                  }}
                  style={[styles.suggestedActionBtn, { backgroundColor: '#5856D6' }]}
                >
                  <Ionicons name="play" size={14} color="#fff" />
                  <Text style={styles.suggestedActionBtnText}>¡Hacer!</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="sparkles-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
                Agrega ideas de ocio (libros, pelis, deportes) para recibir recomendaciones.
              </Text>
              <Pressable
                onPress={() => router.push({ pathname: '/editor', params: { type: ItemType.ACTIVITY } })}
                style={[styles.emptyCardBtn, { borderColor: '#5856D6' }]}
              >
                <Text style={{ color: '#5856D6', fontWeight: '700', fontSize: 13 }}>Nueva Idea</Text>
              </Pressable>
            </View>
          )}
        </View>



        {/* Group 3: Roadmaps, Franjas, Papelera */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>🎯 Organización</Text>
          <View style={[styles.listGroup, { backgroundColor: colors.backgroundElement }]}>
            {/* Roadmaps */}
            <Pressable 
              onPress={() => router.push('/goals')} 
              style={[styles.listGroupItem, { borderBottomWidth: 1, borderBottomColor: colors.backgroundSelected }]}
            >
              <View style={styles.listGroupLeft}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 45, 85, 0.1)' }]}>
                  <Ionicons name="trophy" size={18} color="#FF2D55" />
                </View>
                <View>
                  <Text style={[styles.listGroupTitle, { color: colors.text }]}>Roadmaps</Text>
                  <Text style={[styles.listGroupSubtitle, { color: colors.textSecondary }]}>Metas a largo plazo y objetivos</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>

            {/* Planes a Largo Plazo */}
            <Pressable 
              onPress={() => router.push('/plans')} 
              style={[styles.listGroupItem, { borderBottomWidth: 1, borderBottomColor: colors.backgroundSelected }]}
            >
              <View style={styles.listGroupLeft}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(191, 90, 242, 0.1)' }]}>
                  <Ionicons name="compass" size={18} color="#BF5AF2" />
                </View>
                <View>
                  <Text style={[styles.listGroupTitle, { color: colors.text }]}>Planes a Largo Plazo</Text>
                  <Text style={[styles.listGroupSubtitle, { color: colors.textSecondary }]}>Aspiraciones y metas futuras</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {pendingPlansCount > 0 && (
                  <View style={[styles.inlineTrashBadge, { backgroundColor: 'rgba(191, 90, 242, 0.15)' }]}>
                    <Text style={[styles.inlineTrashBadgeText, { color: '#BF5AF2' }]}>{pendingPlansCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            </Pressable>

            {/* Papelera */}
            <Pressable 
              onPress={() => router.push('/trash')} 
              style={styles.listGroupItem}
            >
              <View style={styles.listGroupLeft}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                  <Ionicons name="trash" size={18} color="#FF3B30" />
                </View>
                <View>
                  <Text style={[styles.listGroupTitle, { color: colors.text }]}>Papelera</Text>
                  <Text style={[styles.listGroupSubtitle, { color: colors.textSecondary }]}>Elementos eliminados recientemente</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {trashCount > 0 && (
                  <View style={styles.inlineTrashBadge}>
                    <Text style={styles.inlineTrashBadgeText}>{trashCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Group 4: Guía y Ayuda */}
        <View style={[styles.sectionContainer, { marginBottom: 20 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>🔍 Manual de Ayuda Inteligente</Text>
          <Pressable 
            onPress={() => router.push('/help')}
            style={[styles.docCard, { backgroundColor: colors.backgroundElement, borderLeftWidth: 4, borderLeftColor: '#00C7BE' }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.docDescription, { color: colors.text, fontWeight: '600', marginBottom: 4 }]}>
                  Explorar Guías y Funcionamiento
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Consulta el manual completo sobre el motor cognitivo, algoritmos de enfoque, recordatorios y más.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
        </View>

        <View style={{ height: 100 + insets.bottom }} />
      </ScrollView>

      {/* QUICK COMPOSER BAR */}
      <View style={[styles.composerContainer, { backgroundColor: colors.backgroundElement, borderTopColor: colors.backgroundSelected, paddingBottom: (insets.bottom || 24) + 12 }]}>
        <View style={styles.composerActions}>
          <Pressable onPress={() => handleQuickCreate(ItemType.TASK)} style={[styles.composerBtn, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#FF9500" />
          </Pressable>
          <Pressable onPress={() => handleQuickCreate(ItemType.REMINDER)} style={[styles.composerBtn, { backgroundColor: 'rgba(0, 122, 255, 0.15)' }]}>
            <Ionicons name="notifications" size={24} color="#007AFF" />
          </Pressable>
          <Pressable onPress={() => setIsVoiceModalVisible(true)} style={[styles.composerBtn, { backgroundColor: 'rgba(255, 45, 85, 0.15)' }]}>
            <Ionicons name="mic" size={24} color="#FF2D55" />
          </Pressable>
          <Pressable onPress={() => handleQuickCreate(ItemType.MEMO)} style={[styles.composerBtn, { backgroundColor: 'rgba(0, 199, 190, 0.15)' }]}>
            <Ionicons name="bookmark" size={24} color="#00C7BE" />
          </Pressable>
          <Pressable onPress={() => handleQuickCreate(ItemType.ACTIVITY)} style={[styles.composerBtn, { backgroundColor: 'rgba(88, 86, 214, 0.15)' }]}>
            <Ionicons name="sparkles" size={24} color="#5856D6" />
          </Pressable>
        </View>
      </View>

      {/* VOICE COMMAND ASSISTANT MODAL */}
      <Modal
        visible={isVoiceModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsVoiceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundElement }]}>
            <View style={[styles.modalHeader, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="mic" size={24} color="#FF2D55" />
                <Text style={[styles.modalDocTitle, { color: colors.text }]}>Asistente de Voz Inteligente</Text>
              </View>
              <Pressable onPress={() => setIsVoiceModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                Dicta o escribe un comando en lenguaje natural. Utiliza palabras clave para definir propiedades:
              </Text>
              
              <Pressable
                onPress={() => handleExecuteVoiceCommand(voiceInputText)}
                style={[styles.modalActionBtn, { backgroundColor: '#FF2D55' }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={[styles.modalActionBtnText, { color: '#fff' }]}>Procesar Comando</Text>
                </View>
              </Pressable>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 }}>
                  Presiona el icono de micrófono del teclado para dictar:
                </Text>
                <Pressable
                  onPress={() => setIsVoicePrivate(!isVoicePrivate)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}
                >
                  <Ionicons name={isVoicePrivate ? 'eye-off-outline' : 'eye-outline'} size={16} color={isVoicePrivate ? '#FF9500' : colors.textSecondary} />
                  <Text style={{ fontSize: 11, color: isVoicePrivate ? '#FF9500' : colors.textSecondary, fontWeight: '600' }}>
                    {isVoicePrivate ? 'Ocultar' : 'Mostrar'}
                  </Text>
                </Pressable>
              </View>

              <TextInput
                placeholder="Escribe o dicta aquí tu comando..."
                placeholderTextColor={colors.textSecondary + '80'}
                value={voiceInputText}
                onChangeText={setVoiceInputText}
                multiline={!isVoicePrivate}
                secureTextEntry={isVoicePrivate}
                numberOfLines={isVoicePrivate ? 1 : 4}
                autoFocus={true}
                style={[
                  styles.voiceTextInput, 
                  { 
                    color: colors.text, 
                    backgroundColor: colors.background, 
                    borderColor: colors.backgroundSelected,
                    minHeight: isVoicePrivate ? 44 : 100
                  }
                ]}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {lastCreatedItem && (
        <View style={[styles.undoToast, { backgroundColor: colors.backgroundElement }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Ionicons name="checkmark-circle" size={20} color="#4CD964" />
            <Text style={[styles.undoText, { color: colors.text }]} numberOfLines={1}>
              Creado: "{lastCreatedItem.title}"
            </Text>
          </View>
          <Pressable onPress={handleUndo} style={styles.undoBtn}>
            <Ionicons name="arrow-undo-outline" size={16} color="#007AFF" />
            <Text style={[styles.undoBtnText, { color: '#007AFF' }]}>Deshacer</Text>
          </Pressable>
          <Pressable onPress={() => setLastCreatedItem(null)} style={{ padding: 4 }}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}
      {/* TASK OPTIONS MODAL */}
      <Modal
        visible={selectedTaskOptions !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedTaskOptions(null)}
      >
        <Pressable 
          style={styles.bottomModalOverlay}
          onPress={() => setSelectedTaskOptions(null)}
        >
          <View 
            style={[styles.optionsModalContent, { backgroundColor: colors.backgroundElement }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.bottomModalHeaderLine} />
            <Text style={[styles.bottomModalTitle, { color: colors.text, marginBottom: 4 }]}>
              Opciones de Tarea
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
              {selectedTaskOptions?.title}
            </Text>

            <View style={{ gap: 12, width: '100%' }}>
              {(() => {
                const t = selectedTaskOptions;
                if (!t) return null;
                const weightLabel = getTaskWeightLabel(t.estimatedHours, store.hourWeights).toLowerCase();
                let dur = 30;
                if (weightLabel === 'luna') {
                  dur = store.userSettings.lunaDuration || 30;
                } else if (weightLabel === 'terra') {
                  dur = store.userSettings.terraDuration || 45;
                } else if (weightLabel === 'sol') {
                  dur = store.userSettings.solDuration || 90;
                } else if (weightLabel === 'astra') {
                  dur = store.userSettings.astraDuration || 20;
                }

                return (
                  <Pressable
                    onPress={() => {
                      setSelectedTaskOptions(null);
                      router.push({
                        pathname: '/session',
                        params: { taskId: t.id, duration: String(dur) }
                      });
                    }}
                    style={[styles.bottomModalOptionBtn, { backgroundColor: colors.background }]}
                  >
                    <View style={[styles.bottomModalIconCircle, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
                      <Ionicons name="play" size={22} color="#34C759" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bottomModalOptionTitle, { color: colors.text }]}>Iniciar Enfoque ({dur}m)</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Comienza un temporizador enfocado para esta tarea</Text>
                    </View>
                  </Pressable>
                );
              })()}

              <Pressable
                onPress={() => {
                  const t = selectedTaskOptions;
                  setSelectedTaskOptions(null);
                  if (t) {
                    router.push({
                      pathname: '/editor',
                      params: { id: t.id, type: t.type }
                    });
                  }
                }}
                style={[styles.bottomModalOptionBtn, { backgroundColor: colors.background }]}
              >
                <View style={[styles.bottomModalIconCircle, { backgroundColor: 'rgba(0, 122, 255, 0.15)' }]}>
                  <Ionicons name="create" size={22} color="#007AFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bottomModalOptionTitle, { color: colors.text }]}>Editar Tarea</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Modifica el título, duración estimada o prioridad</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  const t = selectedTaskOptions;
                  setSelectedTaskOptions(null);
                  if (t) {
                    setShowProgressRoadmap(t);
                  }
                }}
                style={[styles.bottomModalOptionBtn, { backgroundColor: colors.background }]}
              >
                <View style={[styles.bottomModalIconCircle, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
                  <Ionicons name="analytics" size={22} color="#34C759" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bottomModalOptionTitle, { color: colors.text }]}>Ver Progreso & Roadmap</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Revisa el historial de hitos y sesiones de enfoque</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  const t = selectedTaskOptions;
                  setSelectedTaskOptions(null);
                  if (t) {
                    handleOpenAlarmDialog(t);
                  }
                }}
                style={[styles.bottomModalOptionBtn, { backgroundColor: colors.background }]}
              >
                <View style={[styles.bottomModalIconCircle, { backgroundColor: 'rgba(255, 59, 48, 0.15)' }]}>
                  <Ionicons name="alarm-outline" size={22} color="#FF3B30" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bottomModalOptionTitle, { color: colors.text }]}>Fijar Alarma</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Programa una alarma del sistema para esta tarea hoy</Text>
                </View>
              </Pressable>
            </View>

            <Pressable 
              onPress={() => setSelectedTaskOptions(null)}
              style={[styles.bottomModalCloseBtn, { backgroundColor: colors.backgroundSelected }]}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ALARM PROGRAMMING MODAL */}
      <Modal
        visible={alarmTask !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAlarmTask(null)}
      >
        <Pressable 
          style={styles.bottomModalOverlay}
          onPress={() => setAlarmTask(null)}
        >
          <View 
            style={[styles.optionsModalContent, { backgroundColor: colors.backgroundElement }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.bottomModalHeaderLine} />
            <Text style={[styles.bottomModalTitle, { color: colors.text, marginBottom: 8 }]}>
              Programar Alarma del Sistema
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
              Fijar para hoy para: "{alarmTask?.title}"
            </Text>

            {/* Time Pickers (Increment/Decrement style) */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 30 }}>
              {/* Hour control */}
              <View style={{ alignItems: 'center' }}>
                <Pressable
                  onPress={() => setAlarmHour((h) => (h + 1) % 24)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.backgroundSelected,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8
                  }}
                >
                  <Ionicons name="chevron-up" size={24} color={colors.text} />
                </Pressable>
                <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text }}>
                  {alarmHour.toString().padStart(2, '0')}
                </Text>
                <Pressable
                  onPress={() => setAlarmHour((h) => (h - 1 + 24) % 24)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.backgroundSelected,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 8
                  }}
                >
                  <Ionicons name="chevron-down" size={24} color={colors.text} />
                </Pressable>
              </View>

              <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text, marginBottom: 8 }}>:</Text>

              {/* Minute control */}
              <View style={{ alignItems: 'center' }}>
                <Pressable
                  onPress={() => setAlarmMinute((m) => (m + 5) % 60)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.backgroundSelected,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8
                  }}
                >
                  <Ionicons name="chevron-up" size={24} color={colors.text} />
                </Pressable>
                <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text }}>
                  {alarmMinute.toString().padStart(2, '0')}
                </Text>
                <Pressable
                  onPress={() => setAlarmMinute((m) => (m - 5 + 60) % 60)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.backgroundSelected,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 8
                  }}
                >
                  <Ionicons name="chevron-down" size={24} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <View style={{ gap: 12, width: '100%' }}>
              <Pressable
                onPress={async () => {
                  if (alarmTask) {
                    await handleScheduleSystemAlarm(alarmTask.title, alarmHour, alarmMinute);
                    setAlarmTask(null);
                  }
                }}
                style={[styles.bottomModalOptionBtn, { backgroundColor: '#FF3B30', justifyContent: 'center', height: 50 }]}
              >
                <Ionicons name="alarm" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 }}>
                  Programar Alarma
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setAlarmTask(null)}
                style={[styles.bottomModalCloseBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* PROGRESS & ROADMAP MODAL */}
      <Modal
        visible={showProgressRoadmap !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProgressRoadmap(null)}
      >
        <View style={styles.bottomModalOverlay}>
          <Pressable 
            style={StyleSheet.absoluteFill}
            onPress={() => setShowProgressRoadmap(null)}
          />
          <View 
            style={[styles.roadmapModalContent, { backgroundColor: colors.backgroundElement }]}
          >
            <View style={styles.bottomModalHeaderLine} />
            <Text style={[styles.bottomModalTitle, { color: colors.text, marginBottom: 4 }]}>
              🗺️ Historial y Roadmap de la Tarea
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 16 }}>
              {showProgressRoadmap?.title}
            </Text>

            {showProgressRoadmap && (
              <ScrollView 
                style={{ flex: 1, width: '100%' }} 
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              >
                <View style={{ gap: 10, marginBottom: 12 }}>
                  {showAddNote ? (
                    <>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>📝 Nueva Nota</Text>
                      <TextInput
                        value={newNoteText}
                        onChangeText={setNewNoteText}
                        placeholder="Escribe una nota sobre esta tarea..."
                        placeholderTextColor={colors.textSecondary + '70'}
                        autoFocus
                        multiline
                        style={{
                          color: colors.text,
                          backgroundColor: colors.background,
                          borderColor: colors.backgroundSelected,
                          borderWidth: 1,
                          borderRadius: 12,
                          padding: 10,
                          fontSize: 13,
                          minHeight: 60,
                          textAlignVertical: 'top'
                        }}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={async () => {
                            const text = newNoteText.trim();
                            if (text && showProgressRoadmap) {
                              await store.createSession(showProgressRoadmap.id, 0, text);
                            }
                            setNewNoteText('');
                            setShowAddNote(false);
                          }}
                          style={{ flex: 1, backgroundColor: '#FF9500', padding: 12, borderRadius: 10, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Guardar Nota</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setNewNoteText('');
                            setShowAddNote(false);
                          }}
                          style={{ flex: 1, backgroundColor: colors.backgroundSelected, padding: 12, borderRadius: 10, alignItems: 'center' }}
                        >
                          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <Pressable
                      onPress={() => setShowAddNote(true)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        backgroundColor: 'rgba(255, 149, 0, 0.12)',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 149, 0, 0.4)',
                        borderStyle: 'dashed',
                        borderRadius: 12,
                        paddingVertical: 12
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#FF9500" />
                      <Text style={{ color: '#FF9500', fontSize: 13, fontWeight: '700' }}>Añadir Nota</Text>
                    </Pressable>
                  )}
                </View>

                {(() => {
                  const taskSessions = store.sessions
                    .filter(s => String(s.taskId) === String(showProgressRoadmap.id))
                    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

                  if (taskSessions.length === 0) {
                    return (
                      <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="trail-sign-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
                        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 }}>
                          Aún no hay sesiones registradas en el roadmap de esta tarea.
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', paddingHorizontal: 24, marginTop: 8, opacity: 0.7 }}>
                          Completa una sesión de enfoque o añade una nota para comenzar a construir el roadmap.
                        </Text>
                      </View>
                    );
                  }

                  return (
                    <View style={{ gap: 16, paddingHorizontal: 4 }}>
                      {taskSessions.map((session) => {
                        const sessionDate = session.endTime || session.startTime || session.createdAt;
                        const dateStr = sessionDate
                          ? new Date(sessionDate).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Fecha desconocida';

                        const isEditing = editingSessionId === session.id;
                        const isNoteOnly = !session.realDuration && !session.plannedDuration;

                        return (
                          <View 
                            key={session.id} 
                            style={{ 
                              backgroundColor: colors.background, 
                              borderRadius: 16, 
                              padding: 16, 
                              borderWidth: 1, 
                              borderColor: colors.backgroundSelected,
                              gap: 12
                            }}
                          >
                            {/* Header row with date and duration */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.backgroundSelected, paddingBottom: 8 }}>
                              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                                📅 {dateStr}
                              </Text>
                              {isNoteOnly ? (
                                <View style={{ backgroundColor: 'rgba(0, 122, 255, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                  <Text style={{ color: '#007AFF', fontSize: 10, fontWeight: '800' }}>
                                    📝 Nota
                                  </Text>
                                </View>
                              ) : (
                                <View style={{ backgroundColor: 'rgba(255, 149, 0, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                  <Text style={{ color: '#FF9500', fontSize: 10, fontWeight: '800' }}>
                                    ⏱️ {session.realDuration || session.plannedDuration} min
                                  </Text>
                                </View>
                              )}
                            </View>

                            {isEditing ? (
                              <View style={{ gap: 10 }}>
                                <View style={{ gap: 4 }}>
                                  <Text style={{ color: '#34C759', fontSize: 11, fontWeight: '800' }}>¿QUÉ SE HIZO?</Text>
                                  <TextInput
                                    value={editNotes}
                                    onChangeText={setEditNotes}
                                    placeholder="Escribe qué hiciste..."
                                    placeholderTextColor={colors.textSecondary + '70'}
                                    style={{
                                      color: colors.text,
                                      backgroundColor: colors.backgroundSelected,
                                      borderRadius: 8,
                                      padding: 8,
                                      fontSize: 13,
                                      minHeight: 50,
                                      textAlignVertical: 'top'
                                    }}
                                    multiline
                                  />
                                </View>

                                <View style={{ gap: 4 }}>
                                  <Text style={{ color: '#FF9500', fontSize: 11, fontWeight: '800' }}>SIGUIENTE PASO PLANIFICADO</Text>
                                  <TextInput
                                    value={editNextStep}
                                    onChangeText={setEditNextStep}
                                    placeholder="Escribe el siguiente paso..."
                                    placeholderTextColor={colors.textSecondary + '70'}
                                    style={{
                                      color: colors.text,
                                      backgroundColor: colors.backgroundSelected,
                                      borderRadius: 8,
                                      padding: 8,
                                      fontSize: 13
                                    }}
                                  />
                                </View>

                                <View style={{ gap: 4 }}>
                                  <Text style={{ color: '#007AFF', fontSize: 11, fontWeight: '800' }}>PROGRESO DE LA TAREA (%)</Text>
                                  <TextInput
                                    value={editProgress}
                                    onChangeText={(val) => {
                                      const cleaned = val.replace(/[^0-9]/g, '');
                                      if (cleaned === '') {
                                        setEditProgress('');
                                      } else {
                                        const num = parseInt(cleaned, 10);
                                        setEditProgress(String(Math.min(100, Math.max(0, num))));
                                      }
                                    }}
                                    keyboardType="number-pad"
                                    maxLength={3}
                                    style={{
                                      color: colors.text,
                                      backgroundColor: colors.backgroundSelected,
                                      borderRadius: 8,
                                      padding: 8,
                                      fontSize: 13
                                    }}
                                  />
                                </View>

                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                                  <Pressable
                                    onPress={async () => {
                                      const prog = parseInt(editProgress, 10) || 0;
                                      await store.updateSession(session.id, {
                                        notes: editNotes.trim(),
                                        nextStep: editNextStep.trim(),
                                        progress: prog
                                      });

                                      if (taskSessions[0]?.id === session.id) {
                                        await store.updateItem(showProgressRoadmap.id, {
                                          progress: prog,
                                          nextStep: editNextStep.trim(),
                                          completed: prog === 100,
                                          taskState: prog === 100 ? TaskState.COMPLETED : TaskState.IN_PROGRESS
                                        });
                                        setShowProgressRoadmap(prev => prev ? {
                                          ...prev,
                                          progress: prog,
                                          nextStep: editNextStep.trim(),
                                          completed: prog === 100
                                        } : null);
                                      }

                                      setEditingSessionId(null);
                                    }}
                                    style={{
                                      flex: 1,
                                      backgroundColor: '#34C759',
                                      padding: 10,
                                      borderRadius: 8,
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Guardar</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => setEditingSessionId(null)}
                                    style={{
                                      flex: 1,
                                      backgroundColor: colors.backgroundSelected,
                                      padding: 10,
                                      borderRadius: 8,
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>Cancelar</Text>
                                  </Pressable>
                                </View>
                              </View>
                            ) : (
                              <>
                                {/* What was done */}
                                <View style={{ gap: 4 }}>
                                  <Text style={{ color: '#34C759', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                                    {isNoteOnly ? '📝 Nota' : '✅ ¿Qué se hizo?'}
                                  </Text>
                                  {session.notes ? (
                                    <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
                                      {session.notes}
                                    </Text>
                                  ) : (
                                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                                      No especificado
                                    </Text>
                                  )}
                                </View>

                                {/* What to do next */}
                                {!isNoteOnly && (
                                  <View style={{ gap: 4 }}>
                                    <Text style={{ color: '#FF9500', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                                      🎯 Siguiente paso planificado:
                                    </Text>
                                    {session.nextStep ? (
                                      <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
                                        {session.nextStep}
                                      </Text>
                                    ) : (
                                      <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                                        No especificado
                                      </Text>
                                    )}
                                  </View>
                                )}

                                {/* Progress Percentage */}
                                {!isNoteOnly && (
                                  <View style={{ gap: 4 }}>
                                    <Text style={{ color: '#007AFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                                      📈 Progreso de la tarea:
                                    </Text>
                                    <Text style={{ color: colors.text, fontSize: 13 }}>
                                      {session.progress !== undefined ? `${session.progress}%` : '0%'}
                                    </Text>
                                  </View>
                                )}

                                {/* Actions row */}
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, borderTopWidth: 1, borderTopColor: colors.backgroundSelected, paddingTop: 10, marginTop: 4 }}>
                                  <Pressable
                                    onPress={() => {
                                      setEditingSessionId(session.id);
                                      setEditNotes(session.notes || '');
                                      setEditNextStep(session.nextStep || '');
                                      setEditProgress(String(session.progress || 0));
                                    }}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                  >
                                    <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Editar</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => {
                                      Alert.alert(
                                        'Eliminar bloque de progreso',
                                        '¿Estás seguro de que deseas eliminar este bloque de progreso del roadmap? Esta acción no se puede deshacer.',
                                        [
                                          { text: 'Cancelar', style: 'cancel' },
                                          {
                                            text: 'Eliminar',
                                            style: 'destructive',
                                            onPress: async () => {
                                              await store.deleteSession(session.id);
                                            }
                                          }
                                        ]
                                      );
                                    }}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                  >
                                    <Ionicons name="trash-outline" size={14} color="#FF3B30" />
                                    <Text style={{ color: '#FF3B30', fontSize: 12, fontWeight: '600' }}>Eliminar</Text>
                                  </Pressable>
                                </View>
                              </>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}
              </ScrollView>
            )}

            <Pressable 
              onPress={() => setShowProgressRoadmap(null)}
              style={[styles.bottomModalCloseBtn, { backgroundColor: colors.backgroundSelected, marginTop: 16 }]}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cerrar</Text>
            </Pressable>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 20,
  },
  statsBanner: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  sectionContainer: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  focusCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  focusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  focusDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  goalInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  goalInfoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyCardText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: '80%',
  },
  emptyCardBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  remindersList: {
    gap: 8,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  reminderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  reminderTimeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reminderCheckBtn: {
    padding: 4,
  },
  suggestionCard: {
    borderRadius: 20,
    padding: 18,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  suggestionBadge: {
    color: '#5856D6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(88, 86, 214, 0.1)',
  },
  suggestionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  suggestionDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
  },
  suggestedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  suggestedActionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  groupContainer: {
    gap: 12,
  },
  bannerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  halfGridItem: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  gridItemText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listGroup: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  listGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  listGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  listGroupTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  listGroupSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  inlineTrashBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  inlineTrashBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  composerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  composerActions: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recReason: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    fontWeight: '500',
  },
  secondaryReasonsContainer: {
    marginTop: 6,
    paddingLeft: 4,
    gap: 4,
  },
  secReasonText: {
    fontSize: 12,
    lineHeight: 16,
  },
  docCard: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  docDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  docSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  docSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  clearDocBtn: {
    padding: 2,
  },
  docResultsList: {
    marginTop: 8,
    gap: 8,
  },
  noDocText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
    fontStyle: 'italic',
  },
  docResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  docResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  docResultCategory: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    paddingBottom: 12,
    gap: 12,
  },
  modalDocCategory: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalDocTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScrollBody: {
    paddingVertical: 8,
  },
  modalDocTextContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  modalActionBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  voiceTextInput: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  undoToast: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  undoText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  undoBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Calendar Widget Styles
  calendarWidgetCard: {
    borderRadius: 20,
    paddingTop: 16,
    overflow: 'hidden',
  },
  calendarWidgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  calendarHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarWidgetTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  calendarHeaderBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapSelectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  calendarSubTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 6,
  },
  calendarEmptySlots: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarConfigBtn: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 6,
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  timeColumn: {
    width: 48,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  timeLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeLabelLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
    borderRadius: 1,
  },
  slotBoxCard: {
    flex: 1,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 65,
  },
  slotNameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  calendarTaskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 6,
  },
  calendarTaskChipText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  separator: {
    height: 1,
    width: '100%',
  },
  shelfSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
    marginBottom: 8,
  },
  shelfSearchInput: {
    fontSize: 12,
    flex: 1,
    padding: 0,
  },
  shelfTaskCard: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: 'center',
  },
  shelfTaskText: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 130,
  },
  floatingDragItem: {
    position: 'absolute',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 99999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  floatingDragText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 160,
  },
  bottomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    width: '100%',
  },
  roadmapModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    width: '100%',
    height: '75%',
  },
  bottomModalHeaderLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  bottomModalOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  bottomModalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomModalOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  bottomModalCloseBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
});
