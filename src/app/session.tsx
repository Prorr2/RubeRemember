import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  TextInput,
  useColorScheme,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Notifications from 'expo-notifications';

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
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const targetTimeRef = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const sessionNotificationIdRef = useRef<string | null>(null);

  const cancelSessionNotification = async () => {
    if (sessionNotificationIdRef.current) {
      await Notifications.cancelScheduledNotificationAsync(sessionNotificationIdRef.current).catch(() => {});
      sessionNotificationIdRef.current = null;
    }
  };

  const scheduleSessionNotification = async (seconds: number) => {
    await cancelSessionNotification();
    if (seconds > 0) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏱️ ¡Sesión de Enfoque Terminada!',
            body: `Has completado tu sesión de enfoque en "${task?.title || 'tu tarea'}". ¡Buen trabajo!`,
            sound: true,
            vibrate: [0, 500, 250, 500],
          },
          trigger: {
            seconds,
          },
        });
        sessionNotificationIdRef.current = id;
      } catch (err) {
        console.warn('Failed to schedule focus session notification:', err);
      }
    }
  };

  const taskWeight = task ? getTaskWeightLabel(task.estimatedHours, store.hourWeights).toLowerCase() : 'luna';

  // Initialize completed state and input fields based on task
  useEffect(() => {
    if (task) {
      setIsTaskCompleted(task.completed || false);
      
      if (task.nextStep) {
        setSolNextStep(task.nextStep);
      } else {
        setSolNextStep('');
      }

      const computedProgress = task.progress !== undefined && task.progress !== null
        ? task.progress 
        : (task.estimatedHours && task.estimatedHours > 0
           ? Math.min(100, Math.round(((task.workedTime || 0) / (task.estimatedHours * 60)) * 100))
           : 0);
      setTerraProgressPercentage(String(computedProgress));
    }
  }, [task]);

  const handleProgressChange = (text: string) => {
    setTerraProgressPercentage(text);
    const newProgress = parseInt(text, 10);
    if (!isNaN(newProgress)) {
      if (newProgress === 100) {
        setIsTaskCompleted(true);
      } else {
        setIsTaskCompleted(false);
      }
    }
  };

  const handleToggleCompleted = (completed: boolean) => {
    setIsTaskCompleted(completed);
    if (completed) {
      setTerraProgressPercentage('100');
    } else if (!completed && terraProgressPercentage === '100') {
      setTerraProgressPercentage('90');
    }
  };

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

  // AppState foreground listener to recalculate time elapsed in background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (isRunning && targetTimeRef.current) {
          const remaining = Math.max(0, Math.ceil((targetTimeRef.current - Date.now()) / 1000));
          setTimeLeft(remaining);
          if (remaining <= 0) {
            handleTimerComplete();
          }
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isRunning]);

  // Countdown timer logic using absolute system clock and notifications
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0 && !isInitializing && completedState === 'working') {
      // Set absolute target end time
      targetTimeRef.current = Date.now() + timeLeft * 1000;

      // Schedule background notification
      scheduleSessionNotification(timeLeft);

      // Start tick loop
      interval = setInterval(() => {
        if (targetTimeRef.current) {
          const remaining = Math.max(0, Math.ceil((targetTimeRef.current - Date.now()) / 1000));
          setTimeLeft(remaining);
          if (remaining <= 0) {
            if (interval) clearInterval(interval);
            handleTimerComplete();
          }
        }
      }, 500);
    } else {
      // Paused or finished, cancel notification
      cancelSessionNotification();
      targetTimeRef.current = null;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isInitializing, completedState]);

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
            await cancelSessionNotification();
            router.back();
          }
        }
      ]
    );
  };

  const handleForceComplete = () => {
    setIsRunning(false);
    cancelSessionNotification();
    setCompletedState('questions');
  };

  const handleFinishQuestions = async () => {
    if (!sessionId || !task) return;

    const actualDurationMinutes = Math.max(1, Math.round((initialDurationSeconds - timeLeft) / 60));

    try {
      // 1. Process questionnaire responses
      let taskUpdates: Partial<Task> = {};
      let isTaskFullyCompleted = isTaskCompleted;

      const newProgress = parseInt(terraProgressPercentage, 10);
      if (!isNaN(newProgress) && newProgress >= 0 && newProgress <= 100) {
        taskUpdates.progress = newProgress;
        if (newProgress === 100) {
          isTaskFullyCompleted = true;
        }
      }
      taskUpdates.lastProgress = new Date().toISOString();

      if (solNextStep.trim()) {
        taskUpdates.nextStep = solNextStep.trim();
      }

      if (isTaskFullyCompleted) {
        taskUpdates.progress = 100;
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

          {task.nextStep ? (
            <View style={[styles.nextStepCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
              <Text style={{ color: '#FF9500', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>
                🎯 Próximo Hito Planificado:
              </Text>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                "{task.nextStep}"
              </Text>
            </View>
          ) : null}

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

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Progreso de la Tarea (%)</Text>
            <TextInput
              placeholder="Ej: 50"
              placeholderTextColor={colors.textSecondary + '70'}
              keyboardType="number-pad"
              value={terraProgressPercentage}
              onChangeText={handleProgressChange}
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement }]}
            />
          </View>

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

          {/* Completion Status Selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>¿Has completado la tarea?</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <Pressable
                onPress={() => handleToggleCompleted(true)}
                style={[
                  styles.optionBtn,
                  { borderColor: colors.backgroundSelected, backgroundColor: isTaskCompleted ? '#34C759' : colors.backgroundElement }
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color={isTaskCompleted ? '#fff' : colors.textSecondary} />
                <Text style={[styles.optionBtnText, { color: isTaskCompleted ? '#fff' : colors.text }]}>Sí, terminada</Text>
              </Pressable>
              <Pressable
                onPress={() => handleToggleCompleted(false)}
                style={[
                  styles.optionBtn,
                  { borderColor: colors.backgroundSelected, backgroundColor: !isTaskCompleted ? '#FF9500' : colors.backgroundElement }
                ]}
              >
                <Ionicons name="time-outline" size={16} color={!isTaskCompleted ? '#fff' : colors.textSecondary} />
                <Text style={[styles.optionBtnText, { color: !isTaskCompleted ? '#fff' : colors.text }]}>No, seguiré luego</Text>
              </Pressable>
            </View>
          </View>

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
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  optionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  nextStepCard: {
    marginVertical: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
