import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  TextInput,
  useColorScheme,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useRememberStore, Task, TaskState } from '@/hooks/use-remember-store';
import { useSessionService } from '@/services/SessionService';
import { useTaskService } from '@/services/TaskService';
import { Colors } from '@/constants/theme';
import { getTaskWeightLabel } from '@/engines/ScoreEngine';

export default function SessionScreen() {
  const router = useRouter();
  const store = useRememberStore();
  const sessionService = useSessionService();
  const taskService = useTaskService();

  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  // Parameters
  const { taskId, duration } = useLocalSearchParams<{ taskId: string; duration: string }>();

  // Find task
  const task = useMemo(() => {
    return store.getTasks().find(t => t.id === taskId);
  }, [taskId, store.items]);

  // Session duration (in seconds)
  const initialDurationSeconds = useMemo(() => {
    const d = parseInt(duration || '30', 10);
    return d * 60;
  }, [duration]);

  // Timer states
  const [timeLeft, setTimeLeft] = useState(initialDurationSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [completedState, setCompletedState] = useState<'working' | 'questions' | 'done'>('working');

  // Question states
  const [terraProgressPercentage, setTerraProgressPercentage] = useState('');
  const [solNextStep, setSolNextStep] = useState('');
  const [notes, setNotes] = useState('');

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Session in DB
  useEffect(() => {
    const initSession = async () => {
      if (!task) {
        Alert.alert('Error', 'No se encontró la tarea especificada.');
        router.back();
        return;
      }
      try {
        const id = await sessionService.createSession(task.id, parseInt(duration || '30', 10), 'Iniciada desde Home');
        setSessionId(id);
      } catch (err) {
        console.error('Error starting session:', err);
      } finally {
        setIsInitializing(false);
      }
    };
    initSession();
  }, [task]);

  // Countdown timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0 && !isInitializing && completedState === 'working') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && completedState === 'working') {
      handleTimerComplete();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft, isInitializing, completedState]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    setCompletedState('questions');
  };

  const handlePauseToggle = () => {
    setIsRunning(prev => !prev);
  };

  const handleCancelSession = () => {
    Alert.alert(
      'Cancelar Sesión',
      '¿Seguro que deseas cancelar esta sesión? No se guardará el progreso.',
      [
        { text: 'No, continuar', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            if (sessionId) {
              await sessionService.cancelSession(sessionId);
            }
            router.back();
          }
        }
      ]
    );
  };

  const handleForceComplete = () => {
    setIsRunning(false);
    setCompletedState('questions');
  };

  const handleFinishQuestions = async () => {
    if (!sessionId || !task) return;

    const actualDurationMinutes = Math.max(1, Math.round((initialDurationSeconds - timeLeft) / 60));
    const weightLabel = getTaskWeightLabel(task.estimatedHours, store.hourWeights).toLowerCase();

    try {
      // 1. Process questionnaire responses
      let taskUpdates: Partial<Task> = {};
      let isTaskFullyCompleted = false;

      if (weightLabel === 'terra') {
        const newProgress = parseInt(terraProgressPercentage, 10);
        if (!isNaN(newProgress) && newProgress >= 0 && newProgress <= 100) {
          taskUpdates.progress = newProgress;
          if (newProgress === 100) {
            isTaskFullyCompleted = true;
          }
        }
        taskUpdates.lastProgress = new Date().toISOString();
      } else if (weightLabel === 'sol') {
        if (solNextStep.trim()) {
          taskUpdates.nextStep = solNextStep.trim();
        }
        taskUpdates.lastProgress = new Date().toISOString();
      } else if (weightLabel === 'luna') {
        isTaskFullyCompleted = true; // Luna tasks are intended to be completed
      } else if (weightLabel === 'astra') {
        // Astra updates streaks, not percentage
        taskUpdates.lastSession = new Date().toISOString();
      }

      // 2. End session and apply task updates in a single atomic transaction
      await sessionService.endSession(sessionId, actualDurationMinutes, isTaskFullyCompleted, notes, taskUpdates);

      setCompletedState('done');
      setTimeout(() => {
        router.replace('/');
      }, 1500);
    } catch (err) {
      console.error('Error ending session:', err);
      Alert.alert(
        'Error',
        `Ocurrió un error al guardar la sesión: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  // Helpers
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const taskWeight = task ? getTaskWeightLabel(task.estimatedHours, store.hourWeights).toLowerCase() : 'luna';

  if (isInitializing || !task) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Preparando sesión de enfoque...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {completedState === 'working' && (
        <View style={styles.content}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            SESIÓN DE ENFOQUE • {taskWeight.toUpperCase()}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{task.title}</Text>

          <View style={styles.timerCircle}>
            <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(timeLeft)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
              {isRunning ? 'Enfocado...' : 'Pausado'}
            </Text>
          </View>

          <View style={styles.controlsRow}>
            <Pressable onPress={handleCancelSession} style={[styles.btnCircle, { backgroundColor: 'rgba(255, 59, 48, 0.15)' }]}>
              <Ionicons name="close-outline" size={24} color="#FF3B30" />
            </Pressable>

            <Pressable onPress={handlePauseToggle} style={[styles.btnPlay, { backgroundColor: '#FF9500' }]}>
              <Ionicons name={isRunning ? 'pause-outline' : 'play-outline'} size={32} color="#fff" />
            </Pressable>

            <Pressable onPress={handleForceComplete} style={[styles.btnCircle, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
              <Ionicons name="checkmark-outline" size={24} color="#34C759" />
            </Pressable>
          </View>
        </View>
      )}

      {completedState === 'questions' && (
        <View style={styles.questionsContainer}>
          <Text style={[styles.questionsHeader, { color: colors.text }]}>¿Cómo te fue?</Text>
          <Text style={[styles.questionsDesc, { color: colors.textSecondary }]}>
            Registra los resultados de esta sesión para entrenar tu motor cognitivo.
          </Text>

          {taskWeight === 'terra' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Progreso de la Tarea (%)</Text>
              <TextInput
                placeholder="Ej: 50"
                placeholderTextColor={colors.textSecondary + '70'}
                keyboardType="number-pad"
                value={terraProgressPercentage}
                onChangeText={setTerraProgressPercentage}
                style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement }]}
              />
            </View>
          )}

          {taskWeight === 'sol' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Próximo Hito / Paso concreto</Text>
              <TextInput
                placeholder="Ej: Programar módulo de facturación"
                placeholderTextColor={colors.textSecondary + '70'}
                value={solNextStep}
                onChangeText={setSolNextStep}
                style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement }]}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Notas de la sesión (Opcional)</Text>
            <TextInput
              placeholder="¿Hubo alguna complicación o descubrimiento?"
              placeholderTextColor={colors.textSecondary + '70'}
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, minHeight: 60 }]}
              multiline
            />
          </View>

          <Pressable onPress={handleFinishQuestions} style={styles.btnSubmit}>
            <Text style={styles.btnSubmitText}>Finalizar y Guardar Sesión</Text>
          </Pressable>
        </View>
      )}

      {completedState === 'done' && (
        <View style={styles.loadingContainer}>
          <Ionicons name="ribbon-outline" size={80} color="#FF9500" />
          <Text style={[styles.title, { color: colors.text, marginTop: 16 }]}>¡Buen Trabajo!</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Progreso y estadísticas actualizadas.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  timerCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 6,
    borderColor: '#FF9500',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.03)',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  btnCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPlay: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  questionsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  questionsHeader: {
    fontSize: 28,
    fontWeight: '900',
  },
  questionsDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  btnSubmit: {
    backgroundColor: '#FF9500',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
