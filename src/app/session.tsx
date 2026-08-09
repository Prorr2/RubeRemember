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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { useRememberStore, Task } from '@/hooks/use-remember-store';
import { useSessionService } from '@/services/SessionService';
import { Colors } from '@/constants/theme';

export default function SessionScreen() {
  const router = useRouter();
  const store = useRememberStore();
  const sessionService = useSessionService();

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
  const [whatDone, setWhatDone] = useState('');
  const [whatNext, setWhatNext] = useState('');
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  const [progress, setProgress] = useState('0');

  // Timer Ref
  const targetTimeRef = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const sessionNotificationIdRef = useRef<string | null>(null);
  const didInitRef = useRef(false);

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

  // Initialize completed state and input fields exactly once per task load
  useEffect(() => {
    if (task) {
      setIsTaskCompleted(task.completed || false);
      setWhatNext(task.nextStep || '');
      setProgress(String(task.progress || 0));
    }
  }, [task?.id]);

  // Initialize Session in DB exactly ONCE on mount
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const initSession = async () => {
      if (!taskId) {
        Alert.alert('Error', 'No se encontró la tarea especificada.');
        router.back();
        return;
      }
      try {
        const id = await sessionService.createSession(taskId, parseInt(duration || '30', 10), 'Iniciada desde Home');
        setSessionId(id);
      } catch (err) {
        console.error('Error starting session:', err);
      } finally {
        setIsInitializing(false);
      }
    };
    initSession();
  }, [taskId]);

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
      targetTimeRef.current = Date.now() + timeLeft * 1000;
      scheduleSessionNotification(timeLeft);

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

      taskUpdates.lastProgress = new Date().toISOString();
      taskUpdates.nextStep = whatNext.trim();

      const parsedProgress = parseInt(progress, 10);
      taskUpdates.progress = isTaskFullyCompleted ? 100 : (isNaN(parsedProgress) ? 0 : parsedProgress);

      if (isTaskFullyCompleted) {
        taskUpdates.progress = 100;
      } else if (taskUpdates.progress === 100) {
        taskUpdates.progress = 99;
      }

      // 2. End session and apply task updates in a single atomic transaction
      // whatDone is saved in the notes field, whatNext in nextStep
      await sessionService.endSession(sessionId, actualDurationMinutes, isTaskFullyCompleted, whatDone.trim(), taskUpdates);

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
            SESIÓN DE ENFOQUE
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
        <ScrollView contentContainerStyle={{ paddingVertical: 20 }} style={styles.questionsScrollView} showsVerticalScrollIndicator={false}>
          <Text style={[styles.questionsHeader, { color: colors.text }]}>¿Cómo te fue?</Text>
          <Text style={[styles.questionsDesc, { color: colors.textSecondary }]}>
            Registra los resultados de esta sesión para tu roadmap y progreso.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>¿Qué has hecho durante esta sesión? (Opcional)</Text>
            <TextInput
              placeholder="Ej: Programé la autenticación de usuarios y diseño del login"
              placeholderTextColor={colors.textSecondary + '70'}
              value={whatDone}
              onChangeText={setWhatDone}
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, minHeight: 80, textAlignVertical: 'top' }]}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>¿Qué deberías hacer en la siguiente? (Opcional)</Text>
            <TextInput
              placeholder="Ej: Conectar el login con el backend"
              placeholderTextColor={colors.textSecondary + '70'}
              value={whatNext}
              onChangeText={setWhatNext}
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Progreso actual de la tarea (%)</Text>
            <TextInput
              keyboardType="number-pad"
              maxLength={3}
              placeholder="0"
              placeholderTextColor={colors.textSecondary + '70'}
              value={progress}
              onChangeText={(val) => {
                const cleaned = val.replace(/[^0-9]/g, '');
                if (cleaned === '') {
                  setProgress('');
                } else {
                  const num = parseInt(cleaned, 10);
                  setProgress(String(Math.min(100, Math.max(0, num))));
                }
              }}
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>¿Has terminado la tarea?</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <Pressable
                onPress={() => {
                  setIsTaskCompleted(true);
                  setProgress('100');
                }}
                style={[
                  styles.optionBtn,
                  { borderColor: colors.backgroundSelected, backgroundColor: isTaskCompleted ? '#34C759' : colors.backgroundElement }
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color={isTaskCompleted ? '#fff' : colors.textSecondary} />
                <Text style={[styles.optionBtnText, { color: isTaskCompleted ? '#fff' : colors.text }]}>Sí, terminada</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setIsTaskCompleted(false);
                  if (progress === '100') {
                    setProgress(String(task.progress || 0));
                  }
                }}
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

          <Pressable onPress={handleFinishQuestions} style={styles.btnSubmit}>
            <Text style={styles.btnSubmitText}>Finalizar y Guardar Sesión</Text>
          </Pressable>
        </ScrollView>
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
  questionsScrollView: {
    flex: 1,
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
    marginBottom: 16,
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
