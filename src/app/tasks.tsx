import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  useColorScheme,
  TextInput,
  ScrollView,
  Animated,
  PanResponder,
  Modal,
  Clipboard,
  Platform,
  Image,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { useRememberStore, ItemType, Priority, Task, EnergyType, getLocalDateStr, TaskState } from '@/hooks/use-remember-store';
import { Colors, Accent } from '@/constants/theme';
import { ScoreEngine, getTaskWeightLabel } from '@/engines/ScoreEngine';
import { RichText } from '@/components/rich-text';
import { ScreenHeader } from '@/components/ui/screen-header';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useRecommendationService } from '@/services/RecommendationService';
import { useImageCapture, resolveImageUri } from '@/hooks/use-image-capture';
import { MaskableTextInput, maskTextContent } from '@/components/maskable-text-input';
import { HabitCalendar } from '@/components/habit-calendar';

const threadTasks = (tasksToThread: Task[], visibleParents?: ReadonlySet<string> | null): any[] => {
  const parentList: Task[] = [];
  const subtaskMap = new Map<string, Task[]>();
  const presentIds = new Set(tasksToThread.map((t) => t.id));

  tasksToThread.forEach((t) => {
    if (t.parentTaskId && presentIds.has(t.parentTaskId)) {
      const arr = subtaskMap.get(t.parentTaskId) || [];
      arr.push(t);
      subtaskMap.set(t.parentTaskId, arr);
    } else {
      parentList.push(t);
    }
  });

  const out: any[] = [];
  parentList.forEach((parent) => {
    const children = subtaskMap.get(parent.id) || [];
    const show = !visibleParents || visibleParents.has(parent.id);
    out.push({ ...parent, isSubtask: false, isThreadParent: show && children.length > 0 });
    if (show && children.length > 0) {
      children.forEach((st, idx) => {
        out.push({
          ...st,
          isSubtask: true,
          isLastSubtask: idx === children.length - 1,
          subtaskIndex: idx,
          totalSubtasks: children.length,
        });
      });
    }
  });

  return out;
};

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

interface EditableProgressBarProps {
  task: Task;
  colors: any;
  hourWeights: any[];
  onUpdate: (progress: number) => void;
}

const EditableProgressBar: React.FC<EditableProgressBarProps> = ({ task, colors, hourWeights, onUpdate }) => {
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
        <Text style={{ color: Accent, fontSize: 11, fontWeight: '700' }}>{taskProgress}%</Text>
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
            backgroundColor: Accent,
            borderRadius: 4
          }} />
        </View>
      </Pressable>
    </View>
  );
};

interface TaskRoadmapProps {
  task: Task;
  colors: any;
  store: any;
  handleAddImage: (onImageSelected: (base64Url: string) => void) => Promise<void>;
  isMasked?: boolean;
}

const TaskRoadmap: React.FC<TaskRoadmapProps> = ({ task, colors, store, handleAddImage, isMasked = false }) => {
  const router = useRouter();
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editNotesImages, setEditNotesImages] = useState<string[]>([]);
  const [editNextStep, setEditNextStep] = useState('');
  const [editNextStepImages, setEditNextStepImages] = useState<string[]>([]);
  const [editProgress, setEditProgress] = useState('');

  const currentTask = store.items.find((item: any) => item.id === task.id) || task;

  const subtasks: Task[] = (store.items || []).filter(
    (i: any) => i.type === ItemType.TASK && !i.trash && i.parentTaskId === currentTask.id
  );

  const taskSessions = store.sessions
    .filter((s: any) => String(s.taskId) === String(currentTask.id))
    .sort((a: any, b: any) => {
      const ta = new Date(a.endTime || a.startTime || a.createdAt || 0).getTime();
      const tb = new Date(b.endTime || b.startTime || b.createdAt || 0).getTime();
      return tb - ta;
    });

  return (
    <View style={{ width: '100%' }}>
      {/* Subtasks Section - Displayed at the very top with violet styling */}
      {subtasks.length > 0 && (
        <View style={{ marginBottom: 16, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="flash" size={14} color="#BF5AF2" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#BF5AF2', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Subtareas ({subtasks.filter((st) => st.completed).length}/{subtasks.length})
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>
              Arriba de notas
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            {subtasks.map((st) => {
              const priorityColor =
                st.priority === Priority.URGENT ? '#C20000' : st.priority === Priority.HIGH ? '#FF3B30' : st.priority === Priority.MEDIUM ? '#FF9500' : '#34C759';
              const priorityLabel =
                st.priority === Priority.URGENT ? 'URGENTE' : st.priority === Priority.HIGH ? 'ALTA' : st.priority === Priority.MEDIUM ? 'MEDIA' : 'BAJA';

              return (
                <View
                  key={st.id}
                  style={{
                    backgroundColor: 'rgba(191, 90, 242, 0.12)',
                    borderColor: 'rgba(191, 90, 242, 0.35)',
                    borderWidth: 1.5,
                    borderRadius: 12,
                    padding: 12,
                    gap: 8,
                  }}
                >
                  {/* Top row: badge + priority + actions */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <View style={{ backgroundColor: '#BF5AF2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>⚡ SUBTAREA</Text>
                      </View>
                      <View style={{ backgroundColor: colors.backgroundSelected, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: priorityColor }}>
                          {priorityLabel}
                        </Text>
                      </View>
                      {st.estimatedHours ? (
                        <View style={{ backgroundColor: colors.backgroundSelected, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 9, fontWeight: '600' }}>
                            ⌛ {st.estimatedHours}h
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Pressable
                        onPress={() => router.push({ pathname: '/editor', params: { id: st.id } })}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            'Eliminar subtarea',
                            '¿Estás seguro de que deseas eliminar esta subtarea?',
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Eliminar',
                                style: 'destructive',
                                onPress: async () => {
                                  await store.deleteItem(st.id);
                                }
                              }
                            ]
                          );
                        }}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Title and Checkbox */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable
                      onPress={async () => await store.toggleItemCompleted(st.id)}
                      style={{ padding: 2 }}
                    >
                      <Ionicons
                        name={st.completed ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={st.completed ? '#BF5AF2' : colors.textSecondary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => router.push({ pathname: '/editor', params: { id: st.id } })}
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: colors.text,
                          textDecorationLine: st.completed ? 'line-through' : 'none',
                          opacity: st.completed ? 0.6 : 1,
                        }}
                      >
                        {isMasked ? maskTextContent(st.title) : st.title}
                      </Text>
                    </Pressable>
                  </View>

                  {st.description ? (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 30 }} numberOfLines={2}>
                      {isMasked ? maskTextContent(st.description) : st.description}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      )}
      {taskSessions.length === 0 ? (
        <View style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="trail-sign-outline" size={36} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
          <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', paddingHorizontal: 16, lineHeight: 18 }}>
            Aún no hay sesiones registradas en el roadmap de esta tarea.
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center', paddingHorizontal: 16, marginTop: 6, opacity: 0.7 }}>
            Completa una sesión de enfoque o escribe en la sección de notas de abajo para comenzar a construir el roadmap.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {taskSessions.map((session: any) => {
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
                  borderRadius: 12, 
                  padding: 12, 
                  borderWidth: 1, 
                  borderColor: colors.backgroundSelected,
                  gap: 10
                }}
              >
                {/* Header row with date and duration */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.backgroundSelected, paddingBottom: 6 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700' }}>
                    📅 {dateStr}
                  </Text>
                  {isNoteOnly ? (
                    <View style={{ backgroundColor: 'rgba(0, 122, 255, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: Accent, fontSize: 9, fontWeight: '800' }}>
                        📝 Nota
                      </Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: 'rgba(255, 149, 0, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: '#FF9500', fontSize: 9, fontWeight: '800' }}>
                        ⏱️ {session.realDuration || session.plannedDuration} min
                      </Text>
                    </View>
                  )}
                </View>

                {session.title ? (
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                    {isMasked ? maskTextContent(session.title) : session.title}
                  </Text>
                ) : null}

                {isEditing ? (
                  <View style={{ gap: 8 }}>
                    <View style={{ gap: 3 }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '800' }}>TÍTULO (OPCIONAL)</Text>
                      <MaskableTextInput
                        isMasked={isMasked}
                        value={editTitle}
                        onChangeText={setEditTitle}
                        placeholder="Título de la nota..."
                        placeholderTextColor={colors.textSecondary + '70'}
                        style={{
                          color: colors.text,
                          backgroundColor: colors.backgroundSelected,
                          borderRadius: 8,
                          padding: 6,
                          fontSize: 14,
                          fontWeight: '700'
                        }}
                      />
                    </View>
                    
                    <View style={{ gap: 3 }}>
                      <Text style={{ color: '#34C759', fontSize: 10, fontWeight: '800' }}>¿QUÉ SE HIZO?</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                        <MaskableTextInput
                          isMasked={isMasked}
                          value={editNotes}
                          onChangeText={setEditNotes}
                          placeholder="Escribe qué hiciste..."
                          placeholderTextColor={colors.textSecondary + '70'}
                          style={{
                            flex: 1,
                            color: colors.text,
                            backgroundColor: colors.backgroundSelected,
                            borderRadius: 8,
                            padding: 6,
                            fontSize: 12,
                            minHeight: 44,
                            textAlignVertical: 'top'
                          }}
                          multiline
                        />
                        <Pressable
                          onPress={() => handleAddImage((img) => {
                            setEditNotesImages((prev) => [...prev, img]);
                          })}
                          style={{
                            backgroundColor: colors.backgroundSelected,
                            padding: 6,
                            borderRadius: 8,
                            height: 44,
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: 36,
                          }}
                        >
                          <Ionicons name="image-outline" size={16} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                    </View>

                    {editNotesImages.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginVertical: 2 }}>
                        {editNotesImages.map((img, idx) => (
                          <View key={idx} style={{ position: 'relative', width: 44, height: 44, borderRadius: 6, overflow: 'hidden' }}>
                            <Image source={{ uri: resolveImageUri(img) }} style={{ width: '100%', height: '100%' }} />
                            <Pressable
                              onPress={() => setEditNotesImages((prev) => prev.filter((_, i) => i !== idx))}
                              style={{
                                position: 'absolute',
                                top: 1,
                                right: 1,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                borderRadius: 8,
                                width: 14,
                                height: 14,
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}
                            >
                              <Ionicons name="close" size={8} color="#fff" />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={{ gap: 3 }}>
                      <Text style={{ color: '#FF9500', fontSize: 10, fontWeight: '800' }}>SIGUIENTE PASO PLANIFICADO</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                        <MaskableTextInput
                          isMasked={isMasked}
                          value={editNextStep}
                          onChangeText={setEditNextStep}
                          placeholder="Escribe el siguiente paso..."
                          placeholderTextColor={colors.textSecondary + '70'}
                          style={{
                            flex: 1,
                            color: colors.text,
                            backgroundColor: colors.backgroundSelected,
                            borderRadius: 8,
                            padding: 6,
                            fontSize: 12,
                            minHeight: 44,
                            textAlignVertical: 'top'
                          }}
                          multiline
                        />
                        <Pressable
                          onPress={() => handleAddImage((img) => {
                            setEditNextStepImages((prev) => [...prev, img]);
                          })}
                          style={{
                            backgroundColor: colors.backgroundSelected,
                            padding: 6,
                            borderRadius: 8,
                            height: 44,
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: 36,
                          }}
                        >
                          <Ionicons name="image-outline" size={16} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                    </View>

                    {editNextStepImages.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginVertical: 2 }}>
                        {editNextStepImages.map((img, idx) => (
                          <View key={idx} style={{ position: 'relative', width: 44, height: 44, borderRadius: 6, overflow: 'hidden' }}>
                            <Image source={{ uri: resolveImageUri(img) }} style={{ width: '100%', height: '100%' }} />
                            <Pressable
                              onPress={() => setEditNextStepImages((prev) => prev.filter((_, i) => i !== idx))}
                              style={{
                                position: 'absolute',
                                top: 1,
                                right: 1,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                borderRadius: 8,
                                width: 14,
                                height: 14,
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}
                            >
                              <Ionicons name="close" size={8} color="#fff" />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={{ gap: 3 }}>
                      <Text style={{ color: Accent, fontSize: 10, fontWeight: '800' }}>PROGRESO DE LA TAREA (%)</Text>
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
                          padding: 6,
                          fontSize: 12
                        }}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <Pressable
                        onPress={async () => {
                          const prog = parseInt(editProgress, 10) || 0;

                          await store.updateSession(session.id, {
                            notes: editNotes.trim(),
                            title: editTitle.trim() || undefined,
                            notesImages: editNotesImages,
                            nextStep: editNextStep.trim(),
                            nextStepImages: editNextStepImages,
                            progress: prog
                          });

                          if (taskSessions[0]?.id === session.id) {
                            await store.updateItem(currentTask.id, {
                              progress: prog,
                              nextStep: editNextStep.trim(),
                              completed: prog === 100,
                              taskState: prog === 100 ? TaskState.COMPLETED : TaskState.IN_PROGRESS
                            });
                          }

                          setEditingSessionId(null);
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: '#34C759',
                          padding: 8,
                          borderRadius: 6,
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
                          padding: 8,
                          borderRadius: 6,
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
                    <View style={{ gap: 3 }}>
                      {!isNoteOnly && (
                        <Text style={{ color: '#34C759', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                          ✅ ¿Qué se hizo?
                        </Text>
                      )}
                      {(session.notes || (session.notesImages && session.notesImages.length > 0)) ? (
                        <RichText
                          text={session.notes}
                          images={session.notesImages}
                          colors={colors}
                          isMasked={isMasked}
                          textStyle={{ color: colors.text, fontSize: 12, lineHeight: 16 }}
                        />
                      ) : (
                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontStyle: 'italic' }}>
                          No especificado
                        </Text>
                      )}
                    </View>

                    {/* What to do next */}
                    {!isNoteOnly && (
                      <View style={{ gap: 3 }}>
                        <Text style={{ color: '#FF9500', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                          🎯 Siguiente paso planificado:
                        </Text>
                        {(session.nextStep || (session.nextStepImages && session.nextStepImages.length > 0)) ? (
                          <RichText
                            text={session.nextStep}
                            images={session.nextStepImages}
                            colors={colors}
                            isMasked={isMasked}
                            textStyle={{ color: colors.text, fontSize: 12, lineHeight: 16 }}
                          />
                        ) : (
                          <Text style={{ color: colors.textSecondary, fontSize: 12, fontStyle: 'italic' }}>
                            No especificado
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Progress Percentage */}
                    {!isNoteOnly && (
                      <View style={{ gap: 3 }}>
                        <Text style={{ color: Accent, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                          📈 Progreso de la tarea:
                        </Text>
                        <Text style={{ color: colors.text, fontSize: 12 }}>
                          {session.progress !== undefined ? `${session.progress}%` : '0%'}
                        </Text>
                      </View>
                    )}

                    {/* Actions row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: colors.backgroundSelected, paddingTop: 8, marginTop: 2 }}>
                      <Pressable
                        onPress={() => {
                          setEditingSessionId(session.id);
                          setEditTitle(session.title || '');
                          setEditNotes(session.notes || '');
                          setEditNextStep(session.nextStep || '');
                          setEditProgress(String(session.progress || 0));
                          setEditNotesImages(session.notesImages || []);
                          setEditNextStepImages(session.nextStepImages || []);
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Ionicons name="create-outline" size={12} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Editar</Text>
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
                        <Ionicons name="trash-outline" size={12} color="#FF3B30" />
                        <Text style={{ color: '#FF3B30', fontSize: 11, fontWeight: '600' }}>Eliminar</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default function TasksScreen() {
  const store = useRememberStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const { recommendations, triggerRecalculate } = useRecommendationService();

  const { handleAddImage } = useImageCapture();

  // Alarm Modal States
  const [alarmTask, setAlarmTask] = useState<Task | null>(null);
  const [alarmHour, setAlarmHour] = useState(new Date().getHours());
  const [alarmMinute, setAlarmMinute] = useState(new Date().getMinutes());

  // Habit Time Config Modal States
  const [habitTimeTask, setHabitTimeTask] = useState<Task | null>(null);
  const [habitTimeHour, setHabitTimeHour] = useState(9);
  const [habitTimeMinute, setHabitTimeMinute] = useState(0);
  const [expandedHabitCalendarId, setExpandedHabitCalendarId] = useState<string | null>(null);

  // Task options and roadmap modal state
  const [selectedTaskOptions, setSelectedTaskOptions] = useState<Task | null>(null);
  const [showProgressRoadmap, setShowProgressRoadmap] = useState<Task | null>(null);
  const currentRoadmapTask = showProgressRoadmap
    ? (store.items.find((i) => i.id === showProgressRoadmap.id) as Task) || showProgressRoadmap
    : null;

  const prepareForEdit = (fullText: string) => {
    if (!fullText) return { cleanText: '', images: [] };
    const lines = fullText.split('\n');
    const images: string[] = [];
    const textLines: string[] = [];
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('data:image/') && trimmed.includes(';base64,')) {
        images.push(trimmed);
      } else {
        textLines.push(line);
      }
    });
    return {
      cleanText: textLines.join('\n').trim(),
      images
    };
  };

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

  // Filters
  const [filterPriorities, setFilterPriorities] = useState<Priority[]>([]);
  const [filterGoalId, setFilterGoalId] = useState<string>('ALL');
  const [filterWeightIds, setFilterWeightIds] = useState<string[]>([]);
  const [filterDateRange, setFilterDateRange] = useState<'ALL' | 'TODAY_OVERDUE' | 'WEEK' | 'MONTH' | 'FUTURE' | 'UNSCHEDULED'>('ALL');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'PENDING' | 'COMPLETED' | 'HABITS'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'score' | 'goals'>('goals');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [openFilterDropdown, setOpenFilterDropdown] = useState<'sort' | 'date' | 'goal' | 'priority' | 'weight' | null>(null);
  const [expandedSubtaskParents, setExpandedSubtaskParents] = useState<Set<string>>(() => new Set());

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (sortBy !== 'goals') count++;
    if (filterDateRange !== 'ALL') count++;
    if (filterPriorities.length > 0) count++;
    if (filterWeightIds.length > 0) count++;
    if (filterGoalId !== 'ALL') count++;
    return count;
  }, [sortBy, filterDateRange, filterPriorities, filterWeightIds, filterGoalId]);

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Comments/Detail expansion
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentImages, setCommentImages] = useState<Record<string, string[]>>({});
  const [commentTitles, setCommentTitles] = useState<Record<string, string>>({});
  const [isNotesMasked, setIsNotesMasked] = useState(false);

  // Subtask creation state in notes modal
  const [bottomNoteTab, setBottomNoteTab] = useState<'note' | 'subtask'>('note');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskDesc, setSubtaskDesc] = useState('');
  const [subtaskPriority, setSubtaskPriority] = useState<Priority>(Priority.MEDIUM);
  const [subtaskHours, setSubtaskHours] = useState('');
  const [subtaskEnergy, setSubtaskEnergy] = useState<EnergyType>(EnergyType.CREATIVE);

  const handleCreateSubtask = async (parentTask: Task) => {
    const cleanTitle = subtaskTitle.trim();
    if (!cleanTitle) {
      Alert.alert('Título requerido', 'Por favor ingresa un título para la subtarea.');
      return;
    }
    const hoursNum = subtaskHours.trim() ? parseFloat(subtaskHours.replace(',', '.')) : undefined;
    await store.createTask(
      cleanTitle,
      subtaskDesc.trim() || undefined,
      undefined,
      undefined,
      hoursNum,
      subtaskPriority,
      parentTask.goalId || undefined,
      parentTask.phaseId || undefined,
      undefined,
      subtaskEnergy,
      [],
      undefined,
      parentTask.id
    );
    setSubtaskTitle('');
    setSubtaskDesc('');
    setSubtaskHours('');
    setSubtaskPriority(Priority.MEDIUM);
    setSubtaskEnergy(EnergyType.CREATIVE);
  };

  const activeTasks = useMemo(() => {
    return (store.items.filter(
      (i) => i.type === ItemType.TASK && !i.completed && !i.archived && !i.trash && (i as Task).active
    ) as Task[]).sort(
      (a, b) =>
        (a.activeOrder ?? Infinity) - (b.activeOrder ?? Infinity) ||
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  }, [store.items]);

  const activeParentIds = useMemo(() => {
    return new Set(activeTasks.map((t) => t.id));
  }, [activeTasks]);

  const activeThreaded = useMemo(() => {
    const focus = (store.items.filter(
      (i) =>
        i.type === ItemType.TASK &&
        !i.completed && !i.archived && !i.trash &&
        ((i as Task).active || ((i as Task).parentTaskId && activeParentIds.has((i as Task).parentTaskId!)))
    ) as Task[]).sort(
      (a, b) =>
        (a.activeOrder ?? Infinity) - (b.activeOrder ?? Infinity) ||
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
    return threadTasks(focus, expandedSubtaskParents);
  }, [store.items, activeParentIds, expandedSubtaskParents]);

  const subtaskCounts = useMemo(() => {
    const m = new Map<string, number>();
    (store.items.filter((i) => i.type === ItemType.TASK) as Task[]).forEach((t) => {
      if (t.parentTaskId) m.set(t.parentTaskId, (m.get(t.parentTaskId) || 0) + 1);
    });
    return m;
  }, [store.items]);

  const toggleSubtaskExpand = (taskId: string) => {
    setExpandedSubtaskParents((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const tasksList = useMemo(() => {
    let list = store.items.filter((i) => i.type === ItemType.TASK && !i.trash) as Task[];

    if (taskStatusFilter === 'PENDING') {
      list = list.filter((t) => !t.completed && !t.archived && !t.active && !(t.parentTaskId && activeParentIds.has(t.parentTaskId)));
    } else if (taskStatusFilter === 'COMPLETED') {
      list = list.filter((t) => t.completed && !t.archived);
    } else if (taskStatusFilter === 'HABITS') {
      list = list.filter((t) => t.habit === true);
    }

    if (filterPriorities.length > 0) {
      list = list.filter((t) => filterPriorities.includes(t.priority));
    }

    if (filterGoalId !== 'ALL') {
      if (filterGoalId.startsWith('tcat-')) {
        list = list.filter((t) => t.categoryId === filterGoalId);
      } else {
        list = list.filter((t) => t.goalId === filterGoalId);
      }
    }

    if (filterWeightIds.length > 0) {
      list = list.filter((t) => {
        if (!t.estimatedHours || t.estimatedHours <= 0) return false;
        const sortedWeights = [...store.hourWeights].sort((a, b) => b.minHours - a.minHours);
        const matched = sortedWeights.find((w) => t.estimatedHours! >= w.minHours);
        const labelId = matched ? matched.id : (sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1].id : null);
        return labelId ? filterWeightIds.includes(labelId) : false;
      });
    }

    if (filterDateRange === 'TODAY_OVERDUE') {
      const todayStr = getLocalDateStr(new Date());
      list = list.filter((t) => t.dueDate && t.dueDate <= todayStr);
    } else if (filterDateRange === 'WEEK') {
      const today = new Date();
      const todayStr = getLocalDateStr(today);
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      const nextWeekStr = getLocalDateStr(nextWeek);
      
      list = list.filter((t) => t.dueDate && t.dueDate >= todayStr && t.dueDate <= nextWeekStr);
    } else if (filterDateRange === 'MONTH') {
      const today = new Date();
      const todayStr = getLocalDateStr(today);
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 30);
      const nextMonthStr = getLocalDateStr(nextMonth);
      
      list = list.filter((t) => t.dueDate && t.dueDate >= todayStr && t.dueDate <= nextMonthStr);
    } else if (filterDateRange === 'FUTURE') {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 30);
      const nextMonthStr = getLocalDateStr(nextMonth);
      
      list = list.filter((t) => t.dueDate && t.dueDate > nextMonthStr);
    } else if (filterDateRange === 'UNSCHEDULED') {
      list = list.filter((t) => !t.dueDate);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => 
        t.title.toLowerCase().includes(q) || 
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'goals') {
      // Group tasks by goal / roadmap and task categories
      const groupMap = new Map<string, { key: string; title: string; tasks: Task[]; maxScore: number }>();

      list.forEach((t) => {
        const score = ScoreEngine.calculateScore(t, store.hourWeights, store.userSettings?.scoreFormula);
        let key = 'no_group';
        let title = 'Sin Categorizar / Objetivo';

        if (t.goalId) {
          const goal = store.goals.find((g) => g.id === t.goalId);
          if (goal) {
            key = `goal_${goal.id}`;
            title = `${goal.emoji || '🎯'} ${goal.title}`;
          }
        } else if (t.categoryId) {
          const category = store.taskCategories.find((c) => c.id === t.categoryId);
          if (category) {
            key = `cat_${category.id}`;
            title = `${category.emoji || '📁'} ${category.name}`;
          }
        }

        if (!groupMap.has(key)) {
          groupMap.set(key, {
            key,
            title,
            tasks: [],
            maxScore: score,
          });
        }

        const group = groupMap.get(key)!;
        group.tasks.push(t);
        if (score > group.maxScore) {
          group.maxScore = score;
        }
      });

      // Sort tasks within each group by score descending
      groupMap.forEach((group) => {
        group.tasks.sort((a, b) => {
          const scoreA = ScoreEngine.calculateScore(a, store.hourWeights, store.userSettings?.scoreFormula);
          const scoreB = ScoreEngine.calculateScore(b, store.hourWeights, store.userSettings?.scoreFormula);
          if (scoreA !== scoreB) return scoreB - scoreA;
          return b.createdAt.localeCompare(a.createdAt);
        });
      });

      // Order groups by highest task score descending
      const sortedGroups = Array.from(groupMap.values()).sort((a, b) => {
        if (b.maxScore !== a.maxScore) {
          return b.maxScore - a.maxScore;
        }
        return a.title.localeCompare(b.title);
      });

      // Build sectioned list
      const result: any[] = [];
      sortedGroups.forEach((group) => {
        result.push({
          isHeader: true,
          title: group.title,
          id: `header-group-${group.key}`,
        });
        result.push(...threadTasks(group.tasks, expandedSubtaskParents));
      });

      return result;
    }

    // Sort by Mayor Score:
    // 1. Sort by score descending
    // 2. Closest completion date (earliest dueDate first; undated tasks go to the end)
    // 3. Priority (HIGH -> MEDIUM -> LOW)
    // 4. Newest first (createdAt)
    const sorted = list.sort((a, b) => {
      const scoreA = ScoreEngine.calculateScore(a, store.hourWeights, store.userSettings?.scoreFormula);
      const scoreB = ScoreEngine.calculateScore(b, store.hourWeights, store.userSettings?.scoreFormula);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      const dateA = a.dueDate || '';
      const dateB = b.dueDate || '';

      if (dateA && dateB) {
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
      } else if (dateA) {
        return -1;
      } else if (dateB) {
        return 1;
      }

      const weights = { [Priority.URGENT]: 4, [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
      const wA = weights[a.priority] || 2;
      const wB = weights[b.priority] || 2;
      if (wA !== wB) return wB - wA;
      
      return b.createdAt.localeCompare(a.createdAt);
    });

    const todayStr = getLocalDateStr(new Date());
    if (taskStatusFilter === 'HABITS') {
      return sorted;
    }
    const currentTasks = sorted.filter((t) => !t.startDate || t.startDate <= todayStr);
    const futureTasks = sorted.filter((t) => t.startDate && t.startDate > todayStr);

    const result: any[] = [];
    if (currentTasks.length > 0) {
      result.push(...threadTasks(currentTasks, expandedSubtaskParents));
    }
    if (futureTasks.length > 0) {
      result.push({ isHeader: true, title: 'Tareas para un futuro', id: 'header-future' });
      result.push(...threadTasks(futureTasks, expandedSubtaskParents));
    }
    return result;
  }, [store.items, store.goals, store.taskCategories, store.hourWeights, store.userSettings, filterPriorities, filterGoalId, filterWeightIds, filterDateRange, taskStatusFilter, searchQuery, sortBy, expandedSubtaskParents]);

  const handleBulkDelete = () => {
    Alert.alert(
      'Mover a la papelera',
      `¿Deseas mover ${selectedIds.length} tareas a la papelera?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover',
          style: 'destructive',
          onPress: async () => {
            await store.updateItems(selectedIds, {
              trash: true,
              deletedAt: new Date().toISOString(),
            });
            setSelectedIds([]);
          },
        },
      ]
    );
  };

  const handleBulkCopy = () => {
    const texts: string[] = [];
    store.items.forEach((item) => {
      if (selectedIds.includes(item.id) && item.type === ItemType.TASK) {
        const task = item as Task;
        texts.push(task.title + (task.description ? ` - ${task.description}` : ''));
      }
    });

    if (texts.length === 0) return;
    Clipboard.setString(texts.join('\n\n'));
    setSelectedIds([]);
  };

  const handleCopyItemText = (task: Task) => {
    Clipboard.setString(task.title + (task.description ? ` - ${task.description}` : ''));
  };

  const handleAddComment = async (taskId: string) => {
    const text = commentInputs[taskId]?.trim() || '';
    const title = commentTitles[taskId]?.trim() || '';
    const images = commentImages[taskId] || [];
    if (!text && !title && images.length === 0) return;
    
    await store.createSession(taskId, 0, text, title || undefined, images);
    setCommentInputs((prev) => ({ ...prev, [taskId]: '' }));
    setCommentTitles((prev) => ({ ...prev, [taskId]: '' }));
    setCommentImages((prev) => ({ ...prev, [taskId]: [] }));
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Mover a la Papelera',
      `¿Deseas mover la tarea "${task.title}" a la papelera?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover',
          style: 'destructive',
          onPress: async () => {
            await store.deleteItem(task.id);
          },
        },
      ]
    );
  };

  const handleToggleHabit = async (task: Task) => {
    const isHabit = !!task.habit;
    await store.updateItem(task.id, { habit: !isHabit });
    Alert.alert(
      isHabit ? 'Quitada de Hábitos' : 'Guardada como Hábito',
      `"${task.title}" ${isHabit ? 'ya no aparece' : 'ahora aparece'} en la sección de Hábitos.`
    );
  };

  const handleToggleActive = async (task: Task) => {
    const isActive = !!task.active;
    if (!isActive) {
      const orders = activeTasks
        .filter(t => t.activeOrder !== undefined)
        .map(t => t.activeOrder as number);
      const min = orders.length > 0 ? Math.min(...orders) : 1;
      await store.updateItem(task.id, { active: true, activeOrder: min - 1 });
    } else {
      await store.updateItem(task.id, { active: false });
    }
  };

  const handleMoveActive = (id: string, dir: -1 | 1) => {
    const ordered = activeTasks.slice();
    const i = ordered.findIndex(t => t.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    const tmp = ordered[i];
    ordered[i] = ordered[j];
    ordered[j] = tmp;
    void store.updateItemsWithPatches(
      ordered.map((t, index) => ({ id: t.id, updates: { activeOrder: index } }))
    );
  };

  const handleOpenHabitTime = (task: Task) => {
    const [h, m] = (task.habitTime || '09:00').split(':').map(Number);
    setHabitTimeHour(isNaN(h) ? 9 : h);
    setHabitTimeMinute(isNaN(m) ? 0 : m);
    setHabitTimeTask(task);
  };

  const handleSaveHabitTime = async () => {
    if (!habitTimeTask) return;
    const timeStr = `${habitTimeHour.toString().padStart(2, '0')}:${habitTimeMinute.toString().padStart(2, '0')}`;
    await store.updateItem(habitTimeTask.id, { habitTime: timeStr });
    setHabitTimeTask(null);
  };

  const handleOpenHabitAlarmDialog = (task: Task) => {
    const [h, m] = (task.habitTime || '09:00').split(':').map(Number);
    setAlarmHour(isNaN(h) ? 9 : h);
    setAlarmMinute(isNaN(m) ? 0 : m);
    setAlarmTask(task);
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

  const renderDateBadge = (task: Task) => {
    if (!task.dueDate) return null;

    const todayStr = getLocalDateStr(new Date());
    let badgeText = '';
    let isOverdue = false;
    let isToday = false;

    const formatShortDate = (dateStr: string) => {
      if (dateStr === todayStr) return 'Hoy';
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dateStr === getLocalDateStr(tomorrow)) return 'Mañana';
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (dateStr === getLocalDateStr(yesterday)) return 'Ayer';

      const [y, m, d] = dateStr.split('-');
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthLabel = months[parseInt(m, 10) - 1] || m;
      return `${parseInt(d, 10)} ${monthLabel}`;
    };

    isOverdue = task.dueDate < todayStr && !task.completed;
    isToday = task.dueDate === todayStr;
    badgeText = formatShortDate(task.dueDate);

    const badgeBgColor = isOverdue 
      ? 'rgba(255, 59, 48, 0.15)' 
      : isToday 
        ? 'rgba(255, 149, 0, 0.15)' 
        : 'rgba(52, 199, 89, 0.12)';
        
    const badgeTextColor = isOverdue 
      ? '#FF3B30' 
      : isToday 
        ? '#FF9500' 
        : '#34C759';

    return (
      <View style={[styles.metaBadge, { backgroundColor: badgeBgColor }]}>
        <Text style={{ color: badgeTextColor, fontSize: 10, fontWeight: '700' }}>
          {isOverdue ? '⚠️ Finalización vencida: ' : '🏁 Finalización: '}{badgeText}
        </Text>
      </View>
    );
  };

  const renderTaskItem = ({ item }: { item: any }) => {
    if (item.isHeader) {
      return (
        <View style={{
          marginTop: 24,
          marginBottom: 8,
          paddingHorizontal: 4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8
        }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 }}>
            {item.title.toUpperCase()}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.backgroundSelected, opacity: 0.5 }} />
        </View>
      );
    }
    const latestItem = (store.items.find((i) => i.id === item.id) as Task) || item;
    const isExpanded = expandedTaskId === latestItem.id;
    const goal = store.goals.find((g) => g.id === latestItem.goalId);
    const phase = goal?.phases.find((p) => p.id === latestItem.phaseId);
    const isCalendarExpanded = expandedHabitCalendarId === latestItem.id;
    const parentTask = latestItem.parentTaskId ? (store.items.find((i) => i.id === latestItem.parentTaskId) as Task | undefined) : undefined;

    const priorityColor =
      latestItem.priority === Priority.URGENT ? '#C20000' : latestItem.priority === Priority.HIGH ? '#FF3B30' : latestItem.priority === Priority.MEDIUM ? '#FF9500' : '#34C759';

    const isSelected = selectedIds.includes(latestItem.id);

    const handleToggleHabitDate = async (dateStr: string) => {
      const currentTask = (store.items.find((i) => i.id === latestItem.id) as Task) || latestItem;
      const currentCompleted: string[] = currentTask.completedDates || [];
      const exists = currentCompleted.includes(dateStr);
      const updated = exists
        ? currentCompleted.filter((d: string) => d !== dateStr)
        : [...currentCompleted, dateStr];
      await store.updateItem(latestItem.id, { completedDates: updated });
    };

    const isSubtask = !!item.isSubtask;

    const cardContent = (
      <View
        style={[
          styles.taskCard,
          { backgroundColor: colors.backgroundElement, flexDirection: 'column' },
          isSelected && { borderColor: '#FF9500', borderWidth: 1.5 },
          isSubtask
            ? {
                borderLeftWidth: 3,
                borderLeftColor: '#BF5AF2',
                borderRadius: 12,
              }
            : (latestItem.parentTaskId ? { borderLeftWidth: 3.5, borderLeftColor: '#BF5AF2' } : null),
        ]}
      >
        <Pressable
          onLongPress={() => handleToggleSelect(latestItem.id)}
          onPress={() => {
            if (selectedIds.length > 0) {
              handleToggleSelect(latestItem.id);
            } else if (latestItem.habit) {
              setExpandedHabitCalendarId((prev) => (prev === latestItem.id ? null : latestItem.id));
            } else {
              setSelectedTaskOptions(latestItem);
            }
          }}
          style={[styles.cardMain, isSubtask && { paddingVertical: 10, paddingHorizontal: 10 }]}
        >
          {selectedIds.length > 0 ? (
            <View style={styles.checkboxContainer}>
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={isSubtask ? 20 : 24}
                color={isSelected ? '#FF9500' : colors.textSecondary}
              />
            </View>
          ) : (
            <View style={[styles.leftRail, isSubtask && { justifyContent: 'center' }]}>
              <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <Pressable
                  onPress={() => handleOpenAlarmDialog(latestItem)}
                  style={{ padding: 3 }}
                >
                  <Ionicons name="alarm-outline" size={isSubtask ? 17 : 20} color={colors.textSecondary} />
                </Pressable>

                <Pressable
                  onPress={async () => await store.toggleItemCompleted(latestItem.id)}
                  style={styles.checkboxContainer}
                >
                  <Ionicons
                    name={latestItem.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={isSubtask ? 21 : 24}
                    color={latestItem.completed ? '#FF9500' : colors.textSecondary}
                  />
                </Pressable>
              </View>

              {latestItem.active && (
                <View style={styles.activeArrows}>
                  <Pressable
                    hitSlop={6}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleMoveActive(latestItem.id, -1);
                    }}
                    style={styles.activeArrowBtn}
                  >
                    <Ionicons name="chevron-up" size={14} color="#34C759" />
                  </Pressable>
                  <Pressable
                    hitSlop={6}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleMoveActive(latestItem.id, 1);
                    }}
                    style={styles.activeArrowBtn}
                  >
                    <Ionicons name="chevron-down" size={14} color="#34C759" />
                  </Pressable>
                </View>
              )}

              {!isSubtask && (subtaskCounts.get(latestItem.id) || 0) > 0 && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleSubtaskExpand(latestItem.id);
                  }}
                  style={[
                    styles.subtaskToggleBtn,
                    expandedSubtaskParents.has(latestItem.id) && { backgroundColor: '#BF5AF2' },
                  ]}
                  hitSlop={6}
                >
                  <Ionicons
                    name={expandedSubtaskParents.has(latestItem.id) ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={expandedSubtaskParents.has(latestItem.id) ? '#fff' : '#BF5AF2'}
                  />
                  <Text
                    style={{
                      color: expandedSubtaskParents.has(latestItem.id) ? '#fff' : '#BF5AF2',
                      fontSize: 11,
                      fontWeight: '800',
                    }}
                  >
                    {subtaskCounts.get(latestItem.id)}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={{ flex: 1, marginHorizontal: isSubtask ? 6 : 8 }}>
            {latestItem.parentTaskId ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: 'rgba(191, 90, 242, 0.2)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
                  <Text style={{ fontSize: isSubtask ? 8.5 : 9, fontWeight: '800', color: '#BF5AF2' }}>
                    ⚡ SUBTAREA
                  </Text>
                </View>
                {!isSubtask && parentTask ? (
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }} numberOfLines={1}>
                    ↳ {parentTask.title}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Roadmap or Category indicator ABOVE title */}
            {goal ? (
              <Text style={{ fontSize: isSubtask ? 10 : 11, fontWeight: '700', color: '#FF2D55', marginBottom: 2 }}>
                {goal.emoji || '🎯'} {goal.title}
              </Text>
            ) : (!latestItem.parentTaskId && latestItem.categoryId) ? (
              (() => {
                const cat = store.taskCategories.find((c: any) => c.id === latestItem.categoryId);
                return cat ? (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#34C759', marginBottom: 2 }}>
                    {cat.emoji || '📁'} {cat.name}
                  </Text>
                ) : null;
              })()
            ) : null}

            <Text
              style={[
                styles.taskTitle,
                { color: colors.text },
                isSubtask && { fontSize: 13.5, marginBottom: 2 },
                latestItem.completed && { textDecorationLine: 'line-through', opacity: 0.6 },
              ]}
            >
              {isNotesMasked ? maskTextContent(latestItem.title) : latestItem.title}
            </Text>
            
            <View style={styles.tagRow}>
              {latestItem.parentTaskId && (
                <View style={[styles.metaBadge, { backgroundColor: 'rgba(191, 90, 242, 0.15)' }]}>
                  <Text style={{ color: '#BF5AF2', fontSize: isSubtask ? 9 : 10, fontWeight: '700' }}>
                    ⚡ Subtarea
                  </Text>
                </View>
              )}

              {/* Score */}
              <View style={[styles.metaBadge, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                <Text style={{ color: scheme === 'dark' ? '#FFD700' : '#D4AF37', fontSize: isSubtask ? 9 : 10, fontWeight: '800' }}>
                  ⭐ Score: {ScoreEngine.calculateScore(latestItem, store.hourWeights, store.userSettings?.scoreFormula)}
                </Text>
              </View>

              {/* Date Badge */}
              {renderDateBadge(latestItem)}

              {/* Hours & Weight */}
              {latestItem.estimatedHours ? (
                <>
                  <View style={[styles.metaBadge, { backgroundColor: colors.backgroundSelected }]}>
                    <Text style={{ color: colors.textSecondary, fontSize: isSubtask ? 9 : 10, fontWeight: '600' }}>
                      ⌛ {latestItem.estimatedHours}h
                    </Text>
                  </View>
                  {(() => {
                    const sortedWeights = [...(store.hourWeights || [])].sort((a, b) => b.minHours - a.minHours);
                    const matched = sortedWeights.find((w) => latestItem.estimatedHours! >= w.minHours);
                    const label = matched ? matched.name : (sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1].name : null);
                    if (!label) return null;
                    return (
                      <View style={[styles.metaBadge, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                        <Text style={{ color: Accent, fontSize: isSubtask ? 9 : 10, fontWeight: '700' }}>
                          {label}
                        </Text>
                      </View>
                    );
                  })()}
                </>
              ) : null}
            </View>
            
            <EditableProgressBar
              task={latestItem}
              colors={colors}
              hourWeights={store.hourWeights || []}
              onUpdate={async (newProgress) => {
                await store.updateItems([latestItem.id], {
                  progress: newProgress,
                  taskState: newProgress === 100 ? TaskState.COMPLETED : latestItem.taskState
                });
              }}
            />
          </View>

          <View style={styles.cardActions}>
            {selectedIds.length === 0 && (
              <>
                <Pressable
                  onPress={() => router.push({ pathname: '/editor', params: { id: latestItem.id } })}
                  style={styles.actionBtn}
                >
                  <Ionicons name="create-outline" size={isSubtask ? 17 : 20} color={colors.textSecondary} />
                </Pressable>

                <Pressable
                  onPress={() => setShowProgressRoadmap(latestItem)}
                  style={styles.actionBtn}
                >
                  <Ionicons name="chevron-down" size={isSubtask ? 17 : 20} color={colors.textSecondary} />
                </Pressable>

                <Pressable
                  onPress={async () => await handleToggleHabit(latestItem)}
                  style={styles.actionBtn}
                >
                  <Ionicons name={latestItem.habit ? 'pin' : 'pin-outline'} size={isSubtask ? 17 : 20} color={latestItem.habit ? '#FF9500' : colors.textSecondary} />
                </Pressable>

                <Pressable
                  onPress={async () => await handleToggleActive(latestItem)}
                  style={styles.actionBtn}
                >
                  <Ionicons name={latestItem.active ? 'flash' : 'flash-outline'} size={isSubtask ? 17 : 20} color={latestItem.active ? '#34C759' : colors.textSecondary} />
                </Pressable>
              </>
            )}
          </View>
        </Pressable>

        {latestItem.habit && isCalendarExpanded && (
          <HabitCalendar
            completedDates={latestItem.completedDates || []}
            onToggleDate={handleToggleHabitDate}
            colors={colors}
          />
        )}
      </View>
    );

    if (isSubtask) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
          {/* Thread Connector (Forum/Reddit Tree Style) */}
          <View style={{ width: 28, position: 'relative' }}>
            {/* Vertical Line */}
            <View
              style={{
                position: 'absolute',
                left: 10,
                top: -12,
                width: 2,
                height: item.isLastSubtask ? 36 : '100%',
                backgroundColor: 'rgba(191, 90, 242, 0.45)',
              }}
            />
            {/* Elbow Curve */}
            <View
              style={{
                position: 'absolute',
                left: 10,
                top: -12,
                width: 17,
                height: 36,
                borderLeftWidth: 2,
                borderBottomWidth: 2,
                borderBottomLeftRadius: 8,
                borderColor: 'rgba(191, 90, 242, 0.45)',
              }}
            />
          </View>

          {/* Subtask Card */}
          <View style={{ flex: 1, minWidth: 0 }}>
            {cardContent}
          </View>
        </View>
      );
    }

    if (item.isThreadParent) {
      return (
        <View style={{ position: 'relative' }}>
          {cardContent}
          <View
            style={{
              position: 'absolute',
              left: 10,
              bottom: -14,
              width: 2,
              height: 14,
              backgroundColor: 'rgba(191, 90, 242, 0.5)',
            }}
          />
        </View>
      );
    }

    return cardContent;
  };

  const renderHabitItem = ({ item }: { item: any }) => {
    if (item.isHeader) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8, gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 }}>
            {item.title}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.backgroundSelected, opacity: 0.5 }} />
        </View>
      );
    }

    const latestItem = (store.items.find((i) => i.id === item.id) as Task) || item;
    const isSelected = selectedIds.includes(latestItem.id);
    const isCalendarExpanded = expandedHabitCalendarId === latestItem.id;
    const habitTime = latestItem.habitTime || '09:00';

    const handleToggleHabitDate = async (dateStr: string) => {
      const currentTask = (store.items.find((i) => i.id === latestItem.id) as Task) || latestItem;
      const currentCompleted: string[] = currentTask.completedDates || [];
      const exists = currentCompleted.includes(dateStr);
      const updated = exists
        ? currentCompleted.filter((d: string) => d !== dateStr)
        : [...currentCompleted, dateStr];
      await store.updateItem(latestItem.id, { completedDates: updated });
    };

    return (
      <View
        style={[
          styles.taskCard,
          { backgroundColor: colors.backgroundElement, flexDirection: 'column' },
          isSelected && { borderColor: '#FF9500', borderWidth: 1.5 },
        ]}
      >
        <Pressable
          onLongPress={() => handleToggleSelect(latestItem.id)}
          onPress={() => {
            if (selectedIds.length > 0) {
              handleToggleSelect(latestItem.id);
            } else {
              setExpandedHabitCalendarId((prev) => (prev === latestItem.id ? null : latestItem.id));
            }
          }}
          style={styles.cardMain}
        >
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="pin" size={14} color="#FF9500" />
              <Text style={[styles.taskTitle, { color: colors.text, marginBottom: 0 }]}>
                {isNotesMasked ? maskTextContent(latestItem.title) : latestItem.title}
              </Text>
              {latestItem.favourite && <Ionicons name="star" size={14} color="#FFCC00" />}
            </View>

            {latestItem.description ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                {isNotesMasked ? maskTextContent(latestItem.description) : latestItem.description}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {/* Visible and configurable time */}
              <Pressable
                onPress={() => handleOpenHabitTime(latestItem)}
                style={[styles.utilityBtn, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}
              >
                <Ionicons name="time-outline" size={14} color="#FF9500" />
                <Text style={[styles.utilityBtnText, { color: '#FF9500' }]}>{habitTime}</Text>
              </Pressable>

              {/* Schedule system alarm for today */}
              <Pressable
                onPress={() => handleOpenHabitAlarmDialog(latestItem)}
                style={[styles.utilityBtn, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
              >
                <Ionicons name="alarm-outline" size={14} color="#FF3B30" />
                <Text style={[styles.utilityBtnText, { color: '#FF3B30' }]}>Alarma</Text>
              </Pressable>

              {/* Toggle Habit Calendar Button */}
              <Pressable
                onPress={() => setExpandedHabitCalendarId((prev) => (prev === latestItem.id ? null : latestItem.id))}
                style={[
                  styles.utilityBtn,
                  { backgroundColor: isCalendarExpanded ? 'rgba(52, 199, 89, 0.25)' : 'rgba(52, 199, 89, 0.12)' },
                ]}
              >
                <Ionicons name={isCalendarExpanded ? 'calendar' : 'calendar-outline'} size={14} color="#34C759" />
                <Text style={[styles.utilityBtnText, { color: '#34C759', fontWeight: isCalendarExpanded ? '700' : '400' }]}>
                  {isCalendarExpanded ? 'Ocultar Calendario' : 'Calendario'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.cardActions}>
            {selectedIds.length === 0 && (
              <>
                <Pressable
                  onPress={async () => await handleToggleHabit(latestItem)}
                  style={styles.actionBtn}
                >
                  <Ionicons name="pin" size={20} color="#FF9500" />
                </Pressable>
                <Pressable
                  onPress={() => router.push({ pathname: '/editor', params: { id: latestItem.id } })}
                  style={styles.actionBtn}
                >
                  <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                </Pressable>
              </>
            )}
          </View>
        </Pressable>

        {/* Render compact calendar ONLY when card is clicked/expanded */}
        {isCalendarExpanded && (
          <HabitCalendar
            completedDates={latestItem.completedDates || []}
            onToggleDate={handleToggleHabitDate}
            colors={colors}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {selectedIds.length > 0 ? (
        <View style={[styles.header, { borderBottomColor: colors.backgroundElement, backgroundColor: colors.backgroundElement }]}>
          <Pressable onPress={() => setSelectedIds([])} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{selectedIds.length} seleccionadas</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={handleBulkCopy} style={styles.headerButton}>
              <Ionicons name="copy-outline" size={24} color="#FF9500" />
            </Pressable>
            <Pressable onPress={handleBulkDelete} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </Pressable>
          </View>
        </View>
      ) : (
        <ScreenHeader
          title="Mis Tareas"
          right={
            <PressableScale onPress={() => router.push({ pathname: '/editor', params: { type: ItemType.TASK } })} style={styles.headerButton}>
              <Ionicons name="add" size={26} color="#FF9500" />
            </PressableScale>
          }
        />
      )}

      {/* Search Bar */}
      <View style={[styles.searchBarContainer, { borderBottomColor: colors.backgroundSelected }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar tareas por nombre..."
          placeholderTextColor={colors.textSecondary + '80'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: colors.text, backgroundColor: colors.backgroundElement }]}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Debug Info */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 4, backgroundColor: colors.backgroundElement, borderBottomWidth: 1, borderBottomColor: colors.backgroundSelected }}>
        <Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: 'monospace' }} numberOfLines={1}>
          Formula: {store.userSettings?.scoreFormula || 'default (undefined)'}
        </Text>
      </View>

      {/* Status Filter Tabs (Always Visible) */}
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setTaskStatusFilter('PENDING')}
          style={[styles.tabBtn, taskStatusFilter === 'PENDING' && { borderBottomColor: '#FF9500', borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabText, { color: taskStatusFilter === 'PENDING' ? '#FF9500' : colors.textSecondary }]}>Pendientes</Text>
        </Pressable>
        <Pressable
          onPress={() => setTaskStatusFilter('COMPLETED')}
          style={[styles.tabBtn, taskStatusFilter === 'COMPLETED' && { borderBottomColor: '#FF9500', borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabText, { color: taskStatusFilter === 'COMPLETED' ? '#FF9500' : colors.textSecondary }]}>Completadas</Text>
        </Pressable>
        <Pressable
          onPress={() => setTaskStatusFilter('HABITS')}
          style={[styles.tabBtn, taskStatusFilter === 'HABITS' && { borderBottomColor: '#FF9500', borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabText, { color: taskStatusFilter === 'HABITS' ? '#FF9500' : colors.textSecondary }]}>Hábitos</Text>
        </Pressable>
      </View>

      {/* Collapsible Filters Header */}
      <Pressable 
        onPress={() => setIsFiltersExpanded(!isFiltersExpanded)} 
        style={[styles.filtersCollapsibleHeader, { backgroundColor: colors.backgroundElement, borderBottomColor: colors.backgroundSelected }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="funnel-outline" size={15} color={colors.textSecondary} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Filtros y Ordenación</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </View>
        <Ionicons name={isFiltersExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
      </Pressable>

      {isFiltersExpanded && (
        <ScrollView
          nestedScrollEnabled={true}
          style={[styles.filterSection, { backgroundColor: colors.backgroundElement, maxHeight: 340, flexGrow: 0, paddingVertical: 0 }]}
          contentContainerStyle={{ paddingVertical: 0 }}
          showsVerticalScrollIndicator={true}
        >
          {/* Bulk Configuration Mode Indicator */}
          {selectedIds.length > 0 && (
            <View style={[styles.bulkEditBanner, { backgroundColor: colors.backgroundSelected, borderColor: '#FF9500', margin: 12 }]}>
              <Ionicons name="information-circle-outline" size={18} color="#FF9500" />
              <Text style={[styles.bulkEditText, { color: colors.text }]}>
                Configuración masiva activa: Toca una opción para asignarla a las tareas seleccionadas.
              </Text>
            </View>
          )}

          {/* 1. Ordenar por */}
          <View style={[styles.filterRowContainer, { borderBottomColor: colors.backgroundSelected }]}>
            <Pressable
              onPress={() => setOpenFilterDropdown(openFilterDropdown === 'sort' ? null : 'sort')}
              style={styles.filterRowHeader}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={openFilterDropdown === 'sort' ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                <Text style={[styles.filterRowTitle, { color: colors.text }]}>Ordenar por:</Text>
              </View>
              <Text style={[styles.filterRowValue, { color: '#FF9500' }]} numberOfLines={1}>
                {sortBy === 'goals' ? 'Objetivos y categorías' : '⭐ Mayor Score'}
              </Text>
            </Pressable>

            {openFilterDropdown === 'sort' && (
              <View style={styles.filterOptionsVertical}>
                <Pressable
                  onPress={() => { setSortBy('goals'); setOpenFilterDropdown(null); }}
                  style={[styles.filterOptionItem, sortBy === 'goals' && { backgroundColor: 'rgba(255,149,0,0.15)' }]}
                >
                  <Text style={[styles.filterOptionText, { color: sortBy === 'goals' ? '#FF9500' : colors.text }, sortBy === 'goals' && { fontWeight: '700' }]}>
                    🎯 Objetivos y categorías
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { setSortBy('score'); setOpenFilterDropdown(null); }}
                  style={[styles.filterOptionItem, sortBy === 'score' && { backgroundColor: 'rgba(255,149,0,0.15)' }]}
                >
                  <Text style={[styles.filterOptionText, { color: sortBy === 'score' ? '#FF9500' : colors.text }, sortBy === 'score' && { fontWeight: '700' }]}>
                    ⭐ Mayor Score
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* 2. Finalización */}
          <View style={[styles.filterRowContainer, { borderBottomColor: colors.backgroundSelected }]}>
            <Pressable
              onPress={() => setOpenFilterDropdown(openFilterDropdown === 'date' ? null : 'date')}
              style={styles.filterRowHeader}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={openFilterDropdown === 'date' ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                <Text style={[styles.filterRowTitle, { color: colors.text }]}>Finalización:</Text>
              </View>
              <Text style={[styles.filterRowValue, { color: filterDateRange !== 'ALL' ? '#FF9500' : colors.textSecondary }]} numberOfLines={1}>
                {filterDateRange === 'ALL' ? 'Cualquiera' :
                 filterDateRange === 'TODAY_OVERDUE' ? '🏁 Hoy y Atrasadas' :
                 filterDateRange === 'WEEK' ? '🗓️ Esta semana' :
                 filterDateRange === 'MONTH' ? '📅 Este mes' :
                 filterDateRange === 'FUTURE' ? '🚀 Más adelante' :
                 '❓ Sin fecha'}
              </Text>
            </Pressable>

            {openFilterDropdown === 'date' && (
              <View style={styles.filterOptionsVertical}>
                {[
                  { id: 'ALL', label: 'Cualquiera' },
                  { id: 'TODAY_OVERDUE', label: '🏁 Hoy y Atrasadas' },
                  { id: 'WEEK', label: '🗓️ Esta semana' },
                  { id: 'MONTH', label: '📅 Este mes' },
                  { id: 'FUTURE', label: '🚀 Más adelante' },
                  { id: 'UNSCHEDULED', label: '❓ Sin fecha' },
                ].map((opt) => (
                  <Pressable
                    key={opt.id}
                    onPress={() => { setFilterDateRange(opt.id as any); setOpenFilterDropdown(null); }}
                    style={[styles.filterOptionItem, filterDateRange === opt.id && { backgroundColor: 'rgba(255,149,0,0.15)' }]}
                  >
                    <Text style={[styles.filterOptionText, { color: filterDateRange === opt.id ? '#FF9500' : colors.text }, filterDateRange === opt.id && { fontWeight: '700' }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* 3. Objetivo / Categoría */}
          <View style={[styles.filterRowContainer, { borderBottomColor: colors.backgroundSelected }]}>
            <Pressable
              onPress={() => setOpenFilterDropdown(openFilterDropdown === 'goal' ? null : 'goal')}
              style={styles.filterRowHeader}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                <Ionicons name={openFilterDropdown === 'goal' ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                <Text style={[styles.filterRowTitle, { color: colors.text }]}>Objetivo / Categoría:</Text>
              </View>
              <Text style={[styles.filterRowValue, { color: filterGoalId !== 'ALL' ? '#FF9500' : colors.textSecondary }]} numberOfLines={1}>
                {(() => {
                  if (filterGoalId === 'ALL') return 'Todos los objetivos y categorías';
                  const g = store.goals.find((item) => item.id === filterGoalId);
                  if (g) return `${g.emoji || '🎯'} ${g.title}`;
                  const c = store.taskCategories.find((item) => item.id === filterGoalId);
                  if (c) return `${c.emoji || '📁'} ${c.name}`;
                  return 'Todos los objetivos y categorías';
                })()}
              </Text>
            </Pressable>

            {openFilterDropdown === 'goal' && (
              <View style={styles.filterOptionsVertical}>
                <Pressable
                  onPress={() => {
                    if (selectedIds.length > 0) {
                      Alert.alert('Desvincular Objetivo/Categoría', `¿Deseas desvincular las ${selectedIds.length} tareas seleccionadas?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Confirmar',
                          onPress: async () => {
                            await store.updateItems(selectedIds, { goalId: undefined, phaseId: undefined, categoryId: undefined });
                            setSelectedIds([]);
                          },
                        },
                      ]);
                    } else {
                      setFilterGoalId('ALL');
                    }
                    setOpenFilterDropdown(null);
                  }}
                  style={[styles.filterOptionItem, filterGoalId === 'ALL' && { backgroundColor: 'rgba(255,149,0,0.15)' }]}
                >
                  <Text style={[styles.filterOptionText, { color: filterGoalId === 'ALL' ? '#FF9500' : colors.text }, filterGoalId === 'ALL' && { fontWeight: '700' }]}>
                    Todos los objetivos y categorías
                  </Text>
                </Pressable>

                {store.goals.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      if (selectedIds.length > 0) {
                        Alert.alert('Asociar Objetivo', `¿Deseas asociar las ${selectedIds.length} tareas seleccionadas al objetivo "${g.title}"?`, [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Confirmar',
                            onPress: async () => {
                              await store.updateItems(selectedIds, { goalId: g.id, phaseId: undefined, categoryId: undefined });
                              setSelectedIds([]);
                            },
                          },
                        ]);
                      } else {
                        setFilterGoalId(g.id);
                      }
                      setOpenFilterDropdown(null);
                    }}
                    style={[styles.filterOptionItem, filterGoalId === g.id && { backgroundColor: 'rgba(255,149,0,0.15)' }]}
                  >
                    <Text style={[styles.filterOptionText, { color: filterGoalId === g.id ? '#FF9500' : colors.text }, filterGoalId === g.id && { fontWeight: '700' }]}>
                      {g.emoji || '🎯'} {g.title}
                    </Text>
                  </Pressable>
                ))}

                {store.taskCategories.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      if (selectedIds.length > 0) {
                        Alert.alert('Asociar Categoría', `¿Deseas asociar las ${selectedIds.length} tareas seleccionadas a la categoría "${c.name}"?`, [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Confirmar',
                            onPress: async () => {
                              await store.updateItems(selectedIds, { categoryId: c.id, goalId: undefined, phaseId: undefined });
                              setSelectedIds([]);
                            },
                          },
                        ]);
                      } else {
                        setFilterGoalId(c.id);
                      }
                      setOpenFilterDropdown(null);
                    }}
                    style={[styles.filterOptionItem, filterGoalId === c.id && { backgroundColor: 'rgba(52,199,89,0.15)' }]}
                  >
                    <Text style={[styles.filterOptionText, { color: filterGoalId === c.id ? '#34C759' : colors.text }, filterGoalId === c.id && { fontWeight: '700' }]}>
                      {c.emoji || '📁'} {c.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* 4. Prioridad */}
          <View style={[styles.filterRowContainer, { borderBottomColor: colors.backgroundSelected }]}>
            <Pressable
              onPress={() => setOpenFilterDropdown(openFilterDropdown === 'priority' ? null : 'priority')}
              style={styles.filterRowHeader}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={openFilterDropdown === 'priority' ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                <Text style={[styles.filterRowTitle, { color: colors.text }]}>Prioridad:</Text>
              </View>
              <Text style={[styles.filterRowValue, { color: filterPriorities.length > 0 ? '#FF9500' : colors.textSecondary }]} numberOfLines={1}>
                {filterPriorities.length === 0
                  ? 'Todas'
                  : filterPriorities
                      .map((p) => (p === Priority.URGENT ? 'Urgente' : p === Priority.HIGH ? 'Alta' : p === Priority.MEDIUM ? 'Media' : 'Baja'))
                      .join(', ')}
              </Text>
            </Pressable>

            {openFilterDropdown === 'priority' && (
              <View style={styles.filterOptionsVertical}>
                <Pressable
                  onPress={() => {
                    if (selectedIds.length === 0) {
                      setFilterPriorities([]);
                    }
                    setOpenFilterDropdown(null);
                  }}
                  style={[styles.filterOptionItem, filterPriorities.length === 0 && { backgroundColor: 'rgba(255,149,0,0.15)' }]}
                >
                  <Text style={[styles.filterOptionText, { color: filterPriorities.length === 0 ? '#FF9500' : colors.text }, filterPriorities.length === 0 && { fontWeight: '700' }]}>
                    Todas
                  </Text>
                </Pressable>
                {([Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW] as Priority[]).map((p) => {
                  const isActive = filterPriorities.includes(p);
                  const label = p === Priority.URGENT ? 'Urgente' : p === Priority.HIGH ? 'Alta' : p === Priority.MEDIUM ? 'Media' : 'Baja';
                  return (
                    <Pressable
                      key={p}
                      onPress={() => {
                        if (selectedIds.length > 0) {
                          Alert.alert('Cambiar Prioridad', `¿Deseas cambiar la prioridad de las ${selectedIds.length} tareas seleccionadas a "${label}"?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Confirmar',
                              onPress: async () => {
                                await store.updateItems(selectedIds, { priority: p });
                                setSelectedIds([]);
                              },
                            },
                          ]);
                        } else {
                          if (isActive) {
                            setFilterPriorities(filterPriorities.filter((x) => x !== p));
                          } else {
                            setFilterPriorities([p]);
                          }
                        }
                        setOpenFilterDropdown(null);
                      }}
                      style={[styles.filterOptionItem, isActive && { backgroundColor: 'rgba(255,149,0,0.15)' }]}
                    >
                      <Text style={[styles.filterOptionText, { color: isActive ? '#FF9500' : colors.text }, isActive && { fontWeight: '700' }]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* 5. Peso */}
          <View style={[styles.filterRowContainer, { borderBottomColor: colors.backgroundSelected, borderBottomWidth: 0 }]}>
            <Pressable
              onPress={() => setOpenFilterDropdown(openFilterDropdown === 'weight' ? null : 'weight')}
              style={styles.filterRowHeader}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={openFilterDropdown === 'weight' ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                <Text style={[styles.filterRowTitle, { color: colors.text }]}>Peso:</Text>
              </View>
              <Text style={[styles.filterRowValue, { color: filterWeightIds.length > 0 ? '#FF9500' : colors.textSecondary }]} numberOfLines={1}>
                {filterWeightIds.length === 0
                  ? 'Todos los pesos'
                  : store.hourWeights
                      .filter((w) => filterWeightIds.includes(w.id))
                      .map((w) => w.name)
                      .join(', ') || 'Todos los pesos'}
              </Text>
            </Pressable>

            {openFilterDropdown === 'weight' && (
              <View style={styles.filterOptionsVertical}>
                <Pressable
                  onPress={() => {
                    if (selectedIds.length === 0) {
                      setFilterWeightIds([]);
                    }
                    setOpenFilterDropdown(null);
                  }}
                  style={[styles.filterOptionItem, filterWeightIds.length === 0 && { backgroundColor: 'rgba(255,149,0,0.15)' }]}
                >
                  <Text style={[styles.filterOptionText, { color: filterWeightIds.length === 0 ? '#FF9500' : colors.text }, filterWeightIds.length === 0 && { fontWeight: '700' }]}>
                    Todos los pesos
                  </Text>
                </Pressable>
                {store.hourWeights.map((w) => {
                  const isActive = filterWeightIds.includes(w.id);
                  return (
                    <Pressable
                      key={w.id}
                      onPress={() => {
                        if (selectedIds.length > 0) {
                          Alert.alert('Cambiar Peso/Horas', `¿Deseas cambiar el peso de las ${selectedIds.length} tareas seleccionadas a "${w.name}" (${w.minHours}h)?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Confirmar',
                              onPress: async () => {
                                await store.updateItems(selectedIds, { estimatedHours: w.minHours });
                                setSelectedIds([]);
                              },
                            },
                          ]);
                        } else {
                          if (isActive) {
                            setFilterWeightIds(filterWeightIds.filter((x) => x !== w.id));
                          } else {
                            setFilterWeightIds([w.id]);
                          }
                        }
                        setOpenFilterDropdown(null);
                      }}
                      style={[styles.filterOptionItem, isActive && { backgroundColor: 'rgba(255,149,0,0.15)' }]}
                    >
                      <Text style={[styles.filterOptionText, { color: isActive ? '#FF9500' : colors.text }, isActive && { fontWeight: '700' }]}>
                        {w.name} ({w.minHours}h)
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        style={{ flex: 1 }}
      >
        <FlatList
          data={tasksList}
          renderItem={taskStatusFilter === 'HABITS' ? renderHabitItem : renderTaskItem}
          keyExtractor={(item) => item.isHeader ? (item.id || ('header-' + item.title)) : item.id}
          extraData={[selectedIds, store.items, expandedHabitCalendarId, isNotesMasked, store.userSettings, alarmTask, activeTasks]}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            activeTasks.length > 0 && taskStatusFilter === 'PENDING' ? (
              <View style={{ marginBottom: 16 }}>
                <View style={{
                  marginTop: 8,
                  marginBottom: 12,
                  paddingHorizontal: 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Ionicons name="flash" size={16} color="#34C759" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, letterSpacing: 0.5 }}>
                    TRABAJANDO EN ESTE MOMENTO
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.backgroundSelected, opacity: 0.5 }} />
                </View>
                {activeThreaded.map((task) => (
                  <View key={task.id} style={{ marginBottom: 8 }}>
                    {renderTaskItem({ item: task })}
                  </View>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkbox-outline" size={48} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                {taskStatusFilter === 'HABITS'
                  ? 'No tienes hábitos todavía. Usa el pin 📌 de una tarea para guardarla como hábito.'
                  : 'No se encontraron tareas.'}
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
      {/* TASK OPTIONS MODAL */}
      <Modal
        visible={selectedTaskOptions !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedTaskOptions(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setSelectedTaskOptions(null)}
        >
          <View 
            style={[styles.optionsModalContent, { backgroundColor: colors.backgroundElement }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderLine} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedTaskOptions?.title}
            </Text>
            
            <View style={{ gap: 12, marginTop: 16 }}>
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
                    style={[styles.modalOptionBtn, { backgroundColor: colors.background }]}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(52, 120, 246, 0.15)' }]}>
                      <Ionicons name="play" size={22} color={Accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Iniciar Enfoque ({dur}m)</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Comienza una sesión de enfoque de {dur} minutos para esta tarea</Text>
                    </View>
                  </Pressable>
                );
              })()}

              <Pressable
                onPress={() => {
                  const t = selectedTaskOptions;
                  setSelectedTaskOptions(null);
                  if (t) {
                    router.push({ pathname: '/editor', params: { id: t.id } });
                  }
                }}
                style={[styles.modalOptionBtn, { backgroundColor: colors.background }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
                  <Ionicons name="create" size={22} color="#FF9500" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Editar Tarea</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Modifica título, prioridad, horas o fecha</Text>
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
                style={[styles.modalOptionBtn, { backgroundColor: colors.background }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
                  <Ionicons name="analytics" size={22} color="#34C759" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Ver Progreso & Roadmap</Text>
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
                style={[styles.modalOptionBtn, { backgroundColor: colors.background }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 59, 48, 0.15)' }]}>
                  <Ionicons name="alarm-outline" size={22} color="#FF3B30" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Fijar Alarma</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Programa una alarma del sistema para esta tarea hoy</Text>
                </View>
              </Pressable>
            </View>

            <Pressable 
              onPress={() => setSelectedTaskOptions(null)}
              style={[styles.modalCloseBtn, { backgroundColor: colors.backgroundSelected }]}
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
          style={styles.modalOverlay}
          onPress={() => setAlarmTask(null)}
        >
          <View 
            style={[styles.optionsModalContent, { backgroundColor: colors.backgroundElement }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderLine} />
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 8 }]}>
              Programar Alarma del Sistema
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
              Fijar para hoy para: "{alarmTask?.title}"
            </Text>

            {/* Time Pickers (Increment/Decrement style to match editor.tsx) */}
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
                style={[styles.modalOptionBtn, { backgroundColor: '#FF3B30', justifyContent: 'center', height: 50 }]}
              >
                <Ionicons name="alarm" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 }}>
                  Programar Alarma
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setAlarmTask(null)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* HABIT TIME CONFIG MODAL */}
      <Modal
        visible={habitTimeTask !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setHabitTimeTask(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setHabitTimeTask(null)}
        >
          <View
            style={[styles.optionsModalContent, { backgroundColor: colors.backgroundElement }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderLine} />
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 8 }]}>
              Configurar Hora del Hábito
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
              Hora para: "{habitTimeTask?.title}"
            </Text>

            {/* Time Pickers */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 30 }}>
              {/* Hour control */}
              <View style={{ alignItems: 'center' }}>
                <Pressable
                  onPress={() => setHabitTimeHour((h) => (h + 1) % 24)}
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
                  {habitTimeHour.toString().padStart(2, '0')}
                </Text>
                <Pressable
                  onPress={() => setHabitTimeHour((h) => (h - 1 + 24) % 24)}
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
                  onPress={() => setHabitTimeMinute((m) => (m + 5) % 60)}
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
                  {habitTimeMinute.toString().padStart(2, '0')}
                </Text>
                <Pressable
                  onPress={() => setHabitTimeMinute((m) => (m - 5 + 60) % 60)}
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
                onPress={handleSaveHabitTime}
                style={[styles.modalOptionBtn, { backgroundColor: '#FF9500', justifyContent: 'center', height: 50 }]}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 }}>
                  Guardar Hora
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setHabitTimeTask(null)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* FULL SCREEN TASK DETAIL & ROADMAP MODAL */}
      <Modal
        visible={showProgressRoadmap !== null}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowProgressRoadmap(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom + 25 : (insets.bottom > 0 ? insets.bottom + 35 : 45)}
            style={{ flex: 1 }}
          >
            {/* Header section (closeable at all times) */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.backgroundSelected,
              backgroundColor: colors.backgroundElement
            }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>
                  {currentRoadmapTask?.title}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  Historial, Roadmap y Notas de la Tarea
                </Text>
              </View>

              <Pressable
                onPress={() => setIsNotesMasked(!isNotesMasked)}
                style={{
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: isNotesMasked ? 'rgba(255, 149, 0, 0.2)' : colors.backgroundSelected,
                  marginRight: 6
                }}
              >
                <Ionicons
                  name={isNotesMasked ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={isNotesMasked ? '#FF9500' : colors.text}
                />
              </Pressable>

              <Pressable
                onPress={() => setShowProgressRoadmap(null)}
                style={{
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: colors.backgroundSelected
                }}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            {/* Scrollable Content Body */}
            {currentRoadmapTask && (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, gap: 16 }}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {/* Description & metadata if present */}
                {currentRoadmapTask.description ? (
                  <View style={{
                    backgroundColor: colors.backgroundElement,
                    borderRadius: 12,
                    padding: 12,
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>
                      Descripción
                    </Text>
                    <RichText
                      text={currentRoadmapTask.description}
                      images={currentRoadmapTask.images}
                      colors={colors}
                      isMasked={isNotesMasked}
                      textStyle={{ color: colors.text, fontSize: 14 }}
                    />
                  </View>
                ) : null}

                {currentRoadmapTask.startDate || currentRoadmapTask.dueDate ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    📅 Rango: {currentRoadmapTask.startDate || '?'} a {currentRoadmapTask.dueDate || '?'}
                  </Text>
                ) : null}

                {/* Utility action buttons inside Modal */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable
                    onPress={() => {
                      const taskId = currentRoadmapTask.id;
                      setShowProgressRoadmap(null);
                      router.push({ pathname: '/editor', params: { id: taskId } });
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: colors.backgroundSelected
                    }}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.text} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Editar</Text>
                  </Pressable>

                  <Pressable
                    onPress={async () => {
                      const taskToDelete = currentRoadmapTask;
                      setShowProgressRoadmap(null);
                      await handleDeleteTask(taskToDelete);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: 'rgba(255, 59, 48, 0.1)'
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#FF3B30' }}>Papelera</Text>
                  </Pressable>
                </View>

                {/* History & Roadmap */}
                <View style={{ borderTopWidth: 1, borderTopColor: colors.backgroundSelected, paddingTop: 16 }}>
                  <TaskRoadmap
                    task={currentRoadmapTask}
                    colors={colors}
                    store={store}
                    handleAddImage={handleAddImage}
                    isMasked={isNotesMasked}
                  />
                </View>

                {/* Past Comments / Notes */}
                {(currentRoadmapTask.comments || []).length > 0 && (
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.backgroundSelected, paddingTop: 16 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                      💬 Comentarios y Notas Anteriores
                    </Text>
                    <View style={{ gap: 8 }}>
                      {currentRoadmapTask.comments.map((comment) => (
                        <View key={comment.id} style={{
                          backgroundColor: colors.backgroundElement,
                          borderRadius: 12,
                          padding: 10,
                          borderColor: colors.backgroundSelected,
                          borderWidth: 1
                        }}>
                          <RichText
                            text={comment.text}
                            images={comment.images}
                            colors={colors}
                            isMasked={isNotesMasked}
                            textStyle={{ color: colors.text, fontSize: 13 }}
                          />
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{comment.createdAt}</Text>
                            <Pressable onPress={() => store.deleteComment(currentRoadmapTask.id, comment.id)}>
                              <Text style={{ color: '#FF3B30', fontSize: 11, fontWeight: '600' }}>Eliminar</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Always Fixed Bottom Input Section */}
            {currentRoadmapTask && (
              <View style={{
                backgroundColor: colors.backgroundElement,
                borderTopWidth: 1,
                borderTopColor: colors.backgroundSelected,
                padding: 12,
                gap: 8
              }}>
                {/* Tabs: Nueva Nota / Nueva Subtarea */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => setBottomNoteTab('note')}
                    style={{
                      flex: 1,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: bottomNoteTab === 'note' ? colors.backgroundSelected : 'transparent',
                      borderWidth: 1,
                      borderColor: bottomNoteTab === 'note' ? colors.textSecondary : 'transparent',
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: bottomNoteTab === 'note' ? colors.text : colors.textSecondary }}>
                      📝 Nueva Nota
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setBottomNoteTab('subtask')}
                    style={{
                      flex: 1,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: bottomNoteTab === 'subtask' ? 'rgba(191, 90, 242, 0.15)' : 'transparent',
                      borderWidth: 1,
                      borderColor: bottomNoteTab === 'subtask' ? '#BF5AF2' : 'transparent',
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: bottomNoteTab === 'subtask' ? '#BF5AF2' : colors.textSecondary }}>
                      ⚡ Nueva Subtarea
                    </Text>
                  </Pressable>
                </View>

                {bottomNoteTab === 'note' ? (
                  <>
                    <MaskableTextInput
                      isMasked={isNotesMasked}
                      placeholder="Título de la nota (opcional)..."
                      placeholderTextColor={colors.textSecondary + '70'}
                      value={commentTitles[currentRoadmapTask.id] || ''}
                      onChangeText={(text) => setCommentTitles((prev) => ({ ...prev, [currentRoadmapTask.id]: text }))}
                      style={{
                        color: colors.text,
                        fontWeight: '700',
                        fontSize: 14,
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        backgroundColor: colors.backgroundSelected,
                        borderRadius: 8
                      }}
                    />

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaskableTextInput
                        isMasked={isNotesMasked}
                        placeholder="Escribe una nota sobre esta tarea..."
                        placeholderTextColor={colors.textSecondary + '80'}
                        value={commentInputs[currentRoadmapTask.id] || ''}
                        onChangeText={(text) => setCommentInputs((prev) => ({ ...prev, [currentRoadmapTask.id]: text }))}
                        multiline
                        style={{
                          flex: 1,
                          color: colors.text,
                          fontSize: 13,
                          maxHeight: 80,
                          paddingVertical: 6,
                          paddingHorizontal: 8,
                          backgroundColor: colors.backgroundSelected,
                          borderRadius: 8,
                          textAlignVertical: 'top'
                        }}
                      />

                      <Pressable
                        onPress={() => handleAddImage((img) => {
                          setCommentImages((prev) => ({
                            ...prev,
                            [currentRoadmapTask.id]: [...(prev[currentRoadmapTask.id] || []), img]
                          }));
                        })}
                        style={{
                          backgroundColor: colors.backgroundSelected,
                          padding: 8,
                          borderRadius: 8,
                          height: 38,
                          width: 38,
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
                      </Pressable>

                      <Pressable
                        onPress={() => handleAddComment(currentRoadmapTask.id)}
                        style={{
                          backgroundColor: '#FF9500',
                          padding: 8,
                          borderRadius: 8,
                          height: 38,
                          width: 38,
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <Ionicons name="send" size={18} color="#fff" />
                      </Pressable>
                    </View>

                    {commentImages[currentRoadmapTask.id] && commentImages[currentRoadmapTask.id].length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {commentImages[currentRoadmapTask.id].map((img, idx) => (
                          <View key={idx} style={{ position: 'relative', width: 44, height: 44, borderRadius: 6, overflow: 'hidden' }}>
                            <Image source={{ uri: resolveImageUri(img) }} style={{ width: '100%', height: '100%' }} />
                            <Pressable
                              onPress={() => setCommentImages((prev) => ({
                                ...prev,
                                [currentRoadmapTask.id]: (prev[currentRoadmapTask.id] || []).filter((_, i) => i !== idx)
                              }))}
                              style={{
                                position: 'absolute',
                                top: 1,
                                right: 1,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                borderRadius: 8,
                                width: 14,
                                height: 14,
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}
                            >
                              <Ionicons name="close" size={8} color="#fff" />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={{ gap: 8 }}>
                    <MaskableTextInput
                      isMasked={isNotesMasked}
                      placeholder="Título de la subtarea (requerido)..."
                      placeholderTextColor={colors.textSecondary + '70'}
                      value={subtaskTitle}
                      onChangeText={setSubtaskTitle}
                      style={{
                        color: colors.text,
                        fontWeight: '700',
                        fontSize: 14,
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                        backgroundColor: colors.backgroundSelected,
                        borderRadius: 8
                      }}
                    />

                    <MaskableTextInput
                      isMasked={isNotesMasked}
                      placeholder="Descripción o notas (opcional)..."
                      placeholderTextColor={colors.textSecondary + '70'}
                      value={subtaskDesc}
                      onChangeText={setSubtaskDesc}
                      multiline
                      style={{
                        color: colors.text,
                        fontSize: 12,
                        maxHeight: 60,
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                        backgroundColor: colors.backgroundSelected,
                        borderRadius: 8
                      }}
                    />

                    {/* Priority chips */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginRight: 2 }}>
                        Prioridad:
                      </Text>
                      {[
                        { key: Priority.LOW, label: 'Baja', color: '#34C759' },
                        { key: Priority.MEDIUM, label: 'Media', color: '#FF9500' },
                        { key: Priority.HIGH, label: 'Alta', color: '#FF3B30' },
                        { key: Priority.URGENT, label: 'Urgente', color: '#C20000' },
                      ].map((p) => {
                        const isSelected = subtaskPriority === p.key;
                        return (
                          <Pressable
                            key={p.key}
                            onPress={() => setSubtaskPriority(p.key)}
                            style={{
                              paddingVertical: 4,
                              paddingHorizontal: 8,
                              borderRadius: 6,
                              backgroundColor: isSelected ? p.color : colors.backgroundSelected,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: isSelected ? '#fff' : colors.textSecondary }}>
                              {p.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Hours & Energy */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.backgroundSelected, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>⌛</Text>
                        <TextInput
                          placeholder="Horas"
                          placeholderTextColor={colors.textSecondary + '70'}
                          value={subtaskHours}
                          onChangeText={setSubtaskHours}
                          keyboardType="numeric"
                          style={{ color: colors.text, fontSize: 11, width: 45, paddingVertical: 2 }}
                        />
                      </View>

                      {/* Energy chips */}
                      <View style={{ flexDirection: 'row', gap: 4, flex: 1, justifyContent: 'flex-end' }}>
                        {[
                          { key: EnergyType.CREATIVE, emoji: '🎨' },
                          { key: EnergyType.ANALYTICAL, emoji: '🧠' },
                          { key: EnergyType.PHYSICAL, emoji: '⚡' },
                          { key: EnergyType.LEARNING, emoji: '📚' },
                        ].map((e) => {
                          const isSel = subtaskEnergy === e.key;
                          return (
                            <Pressable
                              key={e.key}
                              onPress={() => setSubtaskEnergy(e.key)}
                              style={{
                                paddingVertical: 3,
                                paddingHorizontal: 6,
                                borderRadius: 6,
                                backgroundColor: isSel ? '#BF5AF2' : colors.backgroundSelected,
                              }}
                            >
                              <Text style={{ fontSize: 11 }}>{e.emoji}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {/* Actions: Create Subtask button + Full editor link */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <Pressable
                        onPress={() => handleCreateSubtask(currentRoadmapTask)}
                        style={{
                          flex: 1,
                          backgroundColor: '#BF5AF2',
                          paddingVertical: 9,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 6
                        }}
                      >
                        <Ionicons name="flash" size={14} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                          Crear Subtarea
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          const pId = currentRoadmapTask.id;
                          setShowProgressRoadmap(null);
                          router.push({ pathname: '/editor', params: { parentTaskId: pId } });
                        }}
                        style={{
                          paddingVertical: 9,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          backgroundColor: colors.backgroundSelected,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
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
  filterSection: {
    paddingVertical: 8,
    gap: 8,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  horizontalFilters: {
    paddingHorizontal: 16,
    paddingVertical: 3,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  taskCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  leftRail: {
    alignSelf: 'stretch',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 4,
    paddingVertical: 1,
    gap: 6,
  },
  activeArrows: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  activeArrowBtn: {
    width: 24,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.35)',
    backgroundColor: 'rgba(52,199,89,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxContainer: {
    padding: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardActions: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  subtaskToggleBtn: {
    minWidth: 30,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(191, 90, 242, 0.15)',
    borderWidth: 1,
    borderColor: '#BF5AF2',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  actionBtn: {
    padding: 8,
  },
  cardDetails: {
    padding: 14,
    borderTopWidth: 1,
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  utilityRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  utilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  utilityBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    marginVertical: 10,
  },
  commentsHeader: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  commentsList: {
    gap: 6,
    marginBottom: 10,
  },
  commentBubble: {
    padding: 8,
    borderRadius: 10,
  },
  row: {
    flexDirection: 'row',
  },
  noCommentsText: {
    fontSize: 12,
    marginBottom: 10,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchIcon: {
    marginRight: -26,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    paddingLeft: 32,
    paddingRight: 32,
    fontSize: 14,
  },
  searchClearBtn: {
    marginLeft: -26,
    zIndex: 1,
    padding: 4,
  },
  bulkEditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  bulkEditText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  // Calendar Widget Styles
  calendarWidgetCard: {
    borderRadius: 20,
    paddingTop: 16,
    overflow: 'hidden',
    marginBottom: 16,
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
  filtersCollapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
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
  modalHeaderLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalCloseBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  filterRowContainer: {
    borderBottomWidth: 1,
  },
  filterRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterRowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterRowValue: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '55%',
  },
  filterOptionsVertical: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'column',
    gap: 4,
  },
  filterOptionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterOptionText: {
    fontSize: 13,
  },
});
