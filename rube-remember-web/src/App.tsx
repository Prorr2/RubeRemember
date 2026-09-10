import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRememberStore, rememberStore } from './store';
import {
  ItemType,
  Priority,
  TaskState,
  EnergyType,
  Task,
  Activity,
  Reminder,
  Memo,
  Plan
} from './types';
import {
  CognitiveEngine,
  ContextEngine,
  getTaskWeightLabel
} from './engines';
import { RichText } from './RichText';
import Sidebar from './components/Layout/Sidebar';
import HeaderBar from './components/Layout/HeaderBar';
import DashboardView from './components/Dashboard/DashboardView';
import { ActivitiesView } from './components/Activities/ActivitiesView';
import { TrashView } from './components/Trash/TrashView';
import { GoalsView } from './components/Goals/GoalsView';
import { DropboxView } from './components/Dropbox/DropboxView';
import { SettingsView } from './components/Settings/SettingsView';
import { SyncPanel } from './components/Sync/SyncPanel';
import { TasksView } from './components/Tasks/TasksView';
import { RemindersView } from './components/Reminders/RemindersView';
import { PlansView } from './components/Plans/PlansView';
import { StatisticsView } from './components/Statistics/StatisticsView';
import { HelpView } from './components/Help/HelpView';
import { ListsView } from './components/Lists/ListsView';

export default function App() {
  const db = useRememberStore();

  // Navigation
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Image Zoom State
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Notes/Comments inputs inside tasks/roadmap
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentTitles, setCommentTitles] = useState<Record<string, string>>({});
  const [commentImages, setCommentImages] = useState<Record<string, string[]>>({});

  // Task Editor images
  const [formTaskImages, setFormTaskImages] = useState<string[]>([]);

  // Roadmap editing states
  const [editSessionTitle, setEditSessionTitle] = useState('');
  const [editSessionNotesImages, setEditSessionNotesImages] = useState<string[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, onImagesAdded: (base64s: string[]) => void) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const promises = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });
      Promise.all(promises).then(onImagesAdded);
    }
  };

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);

  // Modals & Interaction States
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editorType, setEditorType] = useState<ItemType>(ItemType.TASK);

  // Editor Form States
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTaskPriority, setFormTaskPriority] = useState<Priority>(Priority.MEDIUM);
  const [formTaskEnergy, setFormTaskEnergy] = useState<EnergyType>(EnergyType.ANALYTICAL);
  const [formTaskHours, setFormTaskHours] = useState('1');
  const [formTaskState, setFormTaskState] = useState<TaskState>(TaskState.NOT_STARTED);
  const [formTaskStart, setFormTaskStart] = useState('');
  const [formTaskDue, setFormTaskDue] = useState('');
  const [formActivityCat, setFormActivityCat] = useState('OTHER');
  const [formMemoStart, setFormMemoStart] = useState('');
  const [formMemoEnd, setFormMemoEnd] = useState('');
  const [formMemoAlarm, setFormMemoAlarm] = useState(false);
  const [formMemoAlarmTime, setFormMemoAlarmTime] = useState('12:00');
  const [formPlanStartMonth, setFormPlanStartMonth] = useState('1');
  const [formPlanStartYear, setFormPlanStartYear] = useState('2026');
  const [formPlanEndMonth, setFormPlanEndMonth] = useState('1');
  const [formPlanEndYear, setFormPlanEndYear] = useState('2026');
  const [formTaskGoalId, setFormTaskGoalId] = useState('');
  const [formTaskPhaseId, setFormTaskPhaseId] = useState('');
  const [formTaskSlotId, setFormTaskSlotId] = useState('');
  const [formFavourite, setFormFavourite] = useState(false);
  const [formTags, setFormTags] = useState('');
  const [formTaskParentId, setFormTaskParentId] = useState<string | null>(null);

  // Subtask Form in Roadmap Modal
  const [roadmapBottomTab, setRoadmapBottomTab] = useState<'note' | 'subtask'>('note');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskDesc, setSubtaskDesc] = useState('');
  const [subtaskPriority, setSubtaskPriority] = useState<Priority>(Priority.MEDIUM);
  const [subtaskHours, setSubtaskHours] = useState('1');
  const [subtaskEnergy, setSubtaskEnergy] = useState<EnergyType>(EnergyType.ANALYTICAL);

  const handleCreateSubtask = (parentTaskId: string) => {
    const parent = db.items.find(i => i.id === parentTaskId) as Task | undefined;
    if (!subtaskTitle.trim() || !parent) return;
    rememberStore.createTask({
      title: subtaskTitle.trim(),
      description: subtaskDesc.trim() || '',
      priority: subtaskPriority,
      estimatedHours: subtaskHours || '1',
      energyType: subtaskEnergy,
      parentTaskId: parent.id,
      goalId: parent.goalId,
      phaseId: parent.phaseId,
    });
    setSubtaskTitle('');
    setSubtaskDesc('');
    setSubtaskHours('1');
    setSubtaskPriority(Priority.MEDIUM);
    setSubtaskEnergy(EnergyType.ANALYTICAL);
  };

  // Timer States
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);
  const [timerSessionId, setTimerSessionId] = useState<string | null>(null);
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState(0);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState(0);
  const [timerObjective, setTimerObjective] = useState('AVANZAR');
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [fbProgress, setFbProgress] = useState(0);
  const [fbNotes, setFbNotes] = useState('');
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Collapsible Roadmap session edits
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionNotes, setEditSessionNotes] = useState('');
  const [editSessionNext, setEditSessionNext] = useState('');
  const [editSessionProg, setEditSessionProg] = useState(0);

  // Calculate Cognitive Recommendation
  const cognitiveData = useMemo(() => {
    const recResult = CognitiveEngine.generateRecommendation(
      db.items,
      db.sessions,
      db.timeSlots,
      db.userSettings,
      db.hourWeights
    );

    // Self-healing: if focus tasks calculated by CognitiveEngine differ from current states, save them
    const currentTasks = db.items.filter(i => i.type === ItemType.TASK && !i.trash) as Task[];
    const changed = recResult.updatedFocusTasks.some(task => {
      const dbTask = currentTasks.find(t => t.id === task.id);
      return dbTask && dbTask.focusLocked !== task.focusLocked;
    });

    if (changed) {
      setTimeout(() => {
        recResult.updatedFocusTasks.forEach(task => {
          const dbTask = currentTasks.find(t => t.id === task.id);
          if (dbTask && dbTask.focusLocked !== task.focusLocked) {
            rememberStore.updateItem(task.id, { focusLocked: task.focusLocked });
          }
        });
      }, 0);
    }

    return recResult;
  }, [db.items, db.sessions, db.timeSlots, db.userSettings, db.hourWeights]);

  const recommendation = cognitiveData.recommendation;

  // Header Details
  const formattedToday = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, []);

  const headerBadge = useMemo(() => {
    const ctx = ContextEngine.calculateContext(db.items, db.sessions, db.timeSlots, db.userSettings);
    if (ctx.activeReminders.length > 0) {
      return { text: '⚠️ Alertas', color: 'var(--color-danger)' };
    } else if (ctx.activeTimeSlot) {
      return { text: `Bloque: ${ctx.activeTimeSlot.name}`, color: 'var(--color-luna)' };
    } else {
      return { text: 'Enfoque Libre', color: 'var(--color-terra)' };
    }
  }, [db.items, db.sessions, db.timeSlots, db.userSettings]);

  // Dashboard Stats
  const activeTasksCount = useMemo(() => {
    return db.items.filter(i => i.type === ItemType.TASK && !i.completed && !i.trash).length;
  }, [db.items]);

  const workedHoursStr = useMemo(() => {
    const minutes = db.statistics.totalWorkedTime || 0;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }, [db.statistics.totalWorkedTime]);

  const activeReminders = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    return db.items.filter(i => {
      if (i.completed || i.archived || i.trash) return false;

      if (i.type === ItemType.MEMO) {
        const m = i as Memo;
        const start = m.startDate || '';
        const end = m.endDate || '';
        const inDate = (!start && !end) ||
          (start && !end && start <= todayStr) ||
          (!start && end && todayStr <= end) ||
          (start <= todayStr && todayStr <= end);
        if (!inDate) return false;
        if (m.hasAlarm && m.alarmTime) {
          const [h, min] = m.alarmTime.split(':').map(Number);
          return currentTotalMinutes >= (h * 60 + min);
        }
        return true;
      }

      if (i.type === ItemType.REMINDER) {
        const rem = i as Reminder;
        if (!rem.remindAt) return false;
        const hasTodayOrPast = rem.remindAt.dates.some(d => d <= todayStr);
        if (!hasTodayOrPast) return false;
        if (rem.remindAt.time) {
          const [h, m] = rem.remindAt.time.split(':').map(Number);
          const remTotal = h * 60 + m;
          return rem.remindAt.dates.includes(todayStr) ? currentTotalMinutes >= remTotal : true;
        }
        return true;
      }

      return false;
    }) as (Reminder | Memo)[];
  }, [db.items]);

  // Search Results
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return db.items.filter(i => {
      if (i.trash) return false;
      return (i.title || '').toLowerCase().includes(query) ||
             (i.description || '').toLowerCase().includes(query);
    });
  }, [db.items, searchQuery]);

  // Audio Alerts Beep
  const playAlarmBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = 523.25; // C5
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.5);
    } catch (e) {
      console.warn('AudioContext beep failed:', e);
    }
  };

  const playCelebrationMelody = (success: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = success ? [523.25, 659.25, 783.99, 1046.50] : [261.63, 329.63, 392.00];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const startTime = audioCtx.currentTime + idx * 0.15;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {
      console.warn('Celebration melody failed:', e);
    }
  };

  // Focus Countdown logic
  useEffect(() => {
    if (timerRunning && timerSecondsRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setTimerRunning(false);
            playAlarmBeep();
            setShowCompletionForm(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning, timerSecondsRemaining]);

  const openTaskFocus = (taskId: string, durationMinutes: number, objective: string) => {
    const sessionId = rememberStore.createSession(taskId, durationMinutes);
    setTimerTaskId(taskId);
    setTimerSessionId(sessionId);
    setTimerTotalSeconds(durationMinutes * 60);
    setTimerSecondsRemaining(durationMinutes * 60);
    setTimerObjective(objective);
    setTimerRunning(false);
    setShowCompletionForm(false);
    setShowTimerModal(true);
  };

  const handleFinishTimerEarly = () => {
    setTimerRunning(false);
    const task = db.items.find(i => i.id === timerTaskId) as Task;
    if (task) {
      setFbProgress(task.progress || 0);
    } else {
      setFbProgress(0);
    }
    setFbNotes('');
    setShowCompletionForm(true);
  };

  const handleFinishTimerCancel = () => {
    if (window.confirm('¿Estás seguro de cancelar la sesión de enfoque? Se perderá el tiempo transcurrido.')) {
      setTimerRunning(false);
      setShowTimerModal(false);
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timerSessionId) return;

    const elapsedSeconds = timerTotalSeconds - timerSecondsRemaining;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const completed = fbProgress === 100;

    rememberStore.endSession(
      timerSessionId,
      elapsedMinutes,
      completed,
      fbNotes,
      {
        progress: fbProgress
      }
    );

    playCelebrationMelody(completed);
    setShowTimerModal(false);
    setShowCompletionForm(false);
  };

  // Open Universal Editor modal prefilled or blank
  const handleOpenEditor = (type: ItemType, itemId?: string, parentTaskId?: string) => {
    setEditingItemId(itemId || null);
    setEditorType(type);

    if (itemId) {
      const item = db.items.find(i => i.id === itemId);
      if (item) {
        setFormTitle(item.title);
        setFormDesc(item.description || '');
        setFormFavourite(item.favourite || false);
        setFormTags(item.tags ? item.tags.join(', ') : '');

        if (item.type === ItemType.TASK) {
          const t = item as Task;
          setFormTaskPriority(t.priority);
          setFormTaskEnergy(t.energyType || EnergyType.ANALYTICAL);
          setFormTaskHours(String(t.estimatedHours || 1));
          setFormTaskState(t.taskState || TaskState.NOT_STARTED);
          setFormTaskStart(t.startDate || '');
          setFormTaskDue(t.dueDate || '');
          setFormTaskGoalId(t.goalId || '');
          setFormTaskPhaseId(t.phaseId || '');
          setFormTaskSlotId(t.timeSlotId || '');
          setFormTaskImages(t.images || []);
          setFormTaskParentId(t.parentTaskId || null);
        } else if (item.type === ItemType.ACTIVITY) {
          setFormActivityCat((item as Activity).category);
        } else if (item.type === ItemType.REMINDER) {
          const r = item as Reminder;
          setFormMemoStart(r.remindAt?.dates?.[0] || r.remindAt?.date || '');
          setFormMemoEnd(r.remindAt?.dates?.[r.remindAt.dates.length - 1] || r.remindAt?.date || '');
          setFormMemoAlarm(true);
          setFormMemoAlarmTime(r.remindAt?.time || '12:00');
        } else if (item.type === ItemType.MEMO) {
          const m = item as Memo;
          setFormMemoStart(m.startDate || '');
          setFormMemoEnd(m.endDate || '');
          setFormMemoAlarm(!!m.hasAlarm);
          setFormMemoAlarmTime(m.alarmTime || '12:00');
        } else if (item.type === ItemType.PLAN) {
          const p = item as Plan;
          setFormPlanStartMonth(String(p.startMonth));
          setFormPlanStartYear(String(p.startYear));
          setFormPlanEndMonth(String(p.endMonth));
          setFormPlanEndYear(String(p.endYear));
        }
      }
    } else {
      setFormTitle('');
      setFormDesc('');
      setFormFavourite(false);
      setFormTags('');
      setFormTaskPriority(Priority.MEDIUM);
      setFormTaskEnergy(EnergyType.ANALYTICAL);
      setFormTaskHours('1');
      setFormTaskState(TaskState.NOT_STARTED);
      setFormTaskStart(new Date().toISOString().split('T')[0]);
      setFormTaskDue('');
      setFormTaskSlotId('');
      setFormActivityCat('SPORT');
      setFormMemoStart(new Date().toISOString().split('T')[0]);
      setFormMemoEnd(new Date().toISOString().split('T')[0]);
      setFormMemoAlarm(false);
      setFormMemoAlarmTime('12:00');
      setFormPlanStartMonth('1');
      setFormPlanStartYear('2026');
      setFormPlanEndMonth('1');
      setFormPlanEndYear('2026');
      setFormTaskImages([]);
      setFormTaskParentId(parentTaskId || null);
      if (parentTaskId) {
        const pTask = db.items.find(i => i.id === parentTaskId) as Task | undefined;
        setFormTaskGoalId(pTask?.goalId || '');
        setFormTaskPhaseId(pTask?.phaseId || '');
      } else {
        setFormTaskGoalId('');
        setFormTaskPhaseId('');
      }
    }

    setFormTaskHours(prev => prev || '1');
    setShowEditorModal(true);
  };

  const handleEditorSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      title: formTitle,
      description: formDesc,
      favourite: formFavourite,
      tags: formTags ? formTags.split(',').map(t => t.trim()).filter(Boolean) : []
    };

    if (editorType === ItemType.TASK) {
      data.priority = formTaskPriority;
      data.energyType = formTaskEnergy;
      data.estimatedHours = formTaskHours;
      data.taskState = formTaskState;
      data.startDate = formTaskStart;
      data.dueDate = formTaskDue;
      data.goalId = formTaskGoalId || undefined;
      data.phaseId = formTaskPhaseId || undefined;
      data.timeSlotId = formTaskSlotId || undefined;
      data.images = formTaskImages;
      if (formTaskParentId) {
        data.parentTaskId = formTaskParentId;
        data.categoryId = undefined;
      }
    } else if (editorType === ItemType.ACTIVITY) {
      data.category = formActivityCat;
    } else if (editorType === ItemType.MEMO || editorType === ItemType.REMINDER) {
      data.startDate = formMemoStart;
      data.endDate = formMemoEnd;
      data.hasAlarm = formMemoAlarm;
      data.alarmTime = formMemoAlarmTime;
    } else if (editorType === ItemType.PLAN) {
      data.startMonth = formPlanStartMonth;
      data.startYear = formPlanStartYear;
      data.endMonth = formPlanEndMonth;
      data.endYear = formPlanEndYear;
    }

    if (editingItemId) {
      rememberStore.updateItem(editingItemId, data);
    } else {
      if (editorType === ItemType.TASK) rememberStore.createTask(data);
      else if (editorType === ItemType.ACTIVITY) rememberStore.createActivity(data);
      else if (editorType === ItemType.MEMO || editorType === ItemType.REMINDER) rememberStore.createMemo(data);
      else if (editorType === ItemType.PLAN) rememberStore.createPlan(data);
    }

    setShowEditorModal(false);
  };

  const handleTaskClick = (id: string) => {
    setSelectedTaskId(id);
    setShowOptionsModal(true);
  };

  // Format Timer Ring offset
  const timerStrokeOffset = useMemo(() => {
    const circumference = 282.7;
    const progress = timerSecondsRemaining / (timerTotalSeconds || 1);
    return circumference * (1 - progress);
  }, [timerSecondsRemaining, timerTotalSeconds]);

  // Local sync (móvil ↔ ordenador por localhost)
  const [syncBanner, setSyncBanner] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [mobileConnected, setMobileConnected] = useState(false);
  const isConfirmingRef = useRef(false);

  const handleSendToMobile = async () => {
    if (!mobileConnected) {
      setSyncBanner('ℹ️ El móvil no está conectado.');
      return;
    }

    const count = Array.isArray(db.items) ? db.items.length : 0;
    const confirmSend = window.confirm(
      `⚠️ ATENCIÓN: Estás a punto de enviar la base de datos del ordenador (${count} elementos) al móvil.\n\nPara evitar pérdidas accidentales, el móvil requerirá tu autorización explícita antes de aplicar los cambios.\n\n¿Deseas continuar y enviar los datos al servidor para el móvil?`
    );
    if (!confirmSend) {
      setSyncBanner('ℹ️ Envío cancelado por el usuario.');
      return;
    }

    setSyncBusy(true);
    try {
      const res = await fetch('/api/outgoing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(db)
      });
      const json = await res.json();
      if (json.ok) {
        setSyncBanner('✅ Datos enviados al servidor local. Requerirán autorización explícita en la app móvil.');
      } else {
        setSyncBanner('❌ El servidor no confirmó la recepción: ' + (json.error || ''));
      }
    } catch (e) {
      setSyncBanner('❌ No se pudo conectar con el servidor local.');
    } finally {
      setSyncBusy(false);
    }
  };

  const handleRequestFromMobile = async () => {
    if (!mobileConnected) {
      setSyncBanner('ℹ️ El móvil no está conectado.');
      return;
    }

    setSyncBusy(true);
    try {
      const res = await fetch('/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const json = await res.json();
      if (json.ok) {
        setSyncBanner('📱 Petición de datos enviada al móvil...');
      } else {
        setSyncBanner('❌ No se pudo solicitar los datos: ' + (json.error || 'error desconocido'));
      }
    } catch (e) {
      setSyncBanner('❌ No se pudo conectar con el servidor local.');
    } finally {
      setSyncBusy(false);
    }
  };

  // Poll the local server to detect when the mobile connects and uploads data
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/health');
        const json = await res.json();
        if (cancelled) return;

        if (json.ok) {
          setMobileConnected(!!json.mobileConnected);
          setSyncPending(!!json.received);

          if (json.received && !isConfirmingRef.current) {
            isConfirmingRef.current = true;
            // Fetch the data immediately (this also clears it on the server)
            const dataRes = await fetch('/api/backup/latest');
            const dataJson = await dataRes.json();
            if (dataJson.data) {
              const count = Array.isArray(dataJson.data.items) ? dataJson.data.items.length : 0;
              const confirmed = window.confirm(
                `Se han recibido datos del móvil (${count} elementos). ¿Aceptar e importarlos directamente?`
              );
              if (confirmed) {
                const result = rememberStore.importBackupData(JSON.stringify(dataJson.data));
                if (result.success) {
                  setSyncBanner(`✅ Datos del móvil importados correctamente (${count} elementos).`);
                } else {
                  setSyncBanner('❌ Error al importar: ' + (result.errors || []).join(' '));
                }
              } else {
                setSyncBanner('ℹ️ Importación cancelada.');
              }
            }
            isConfirmingRef.current = false;
          }
        }
      } catch (e) {
        // Server not available; ignore
      }
    };
    check();
    const id = setInterval(check, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const handleReceiveFromMobile = async () => {
    setSyncBusy(true);
    try {
      const dataRes = await fetch('/api/backup/latest');
      const dataJson = await dataRes.json();
      if (dataJson.data) {
        const count = Array.isArray(dataJson.data.items) ? dataJson.data.items.length : 0;
        const confirmed = window.confirm(
          `Se han recibido datos del móvil (${count} elementos). ¿Aceptar e importarlos directamente?`
        );
        if (confirmed) {
          const result = rememberStore.importBackupData(JSON.stringify(dataJson.data));
          if (result.success) {
            setSyncBanner(`✅ Datos del móvil importados correctamente (${count} elementos).`);
            setSyncPending(false);
          } else {
            setSyncBanner('❌ Error al importar: ' + (result.errors || []).join(' '));
          }
        } else {
          setSyncBanner('ℹ️ Importación cancelada.');
        }
      } else {
        setSyncBanner('ℹ️ No hay datos nuevos del móvil.');
      }
    } catch (e) {
      setSyncBanner('❌ Error al recibir datos.');
    } finally {
      setSyncBusy(false);
    }
  };

  const closeSyncBanner = () => {
    setSyncBanner(null);
    setSyncPending(false);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onhandleRequestFromMobile={handleRequestFromMobile}
        onhandleSendToMobile={handleSendToMobile}
        syncBusy={syncBusy}
        mobileConnected={mobileConnected}
      />

      {/* Main Content Pane */}
      <main className="main-content">
        {/* Header Bar */}
        <HeaderBar
          formattedToday={formattedToday}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showSearchOverlay={showSearchOverlay}
          setShowSearchOverlay={setShowSearchOverlay}
          searchResults={searchResults}
          headerBadge={headerBadge}
          onTaskClick={handleTaskClick}
          onOpenEditor={handleOpenEditor}
          onFocusTask={(taskId) => {
            const defaultDuration = db.userSettings?.terraDuration || 45;
            const task = db.items.find(i => i.id === taskId) as Task | undefined;
            openTaskFocus(taskId, defaultDuration, task?.title || 'Sesión de enfoque');
          }}
          onOpenRoadmap={(taskId) => {
            setSelectedTaskId(taskId);
            setShowRoadmapModal(true);
          }}
        />

        {/* Content Body Container */}
        <div className="content-body">
          {/* 1. DASHBOARD TAB */}
          <section className={`tab-pane ${currentTab === 'dashboard' ? 'active' : ''}`} id="tab-dashboard">
            <DashboardView
              items={db.items}
              timeSlots={db.timeSlots}
              recommendation={recommendation}
              currentStreak={db.statistics.currentStreak || 0}
              activeTasksCount={activeTasksCount}
              workedHoursStr={workedHoursStr}
              activeReminders={activeReminders}
              onStartFocus={openTaskFocus}
              onNewTask={() => handleOpenEditor(ItemType.TASK)}
              onImageClick={setZoomedImage}
            />
          </section>

          {/* 2. TASKS TAB */}
          <section className={`tab-pane ${currentTab === 'tasks' ? 'active' : ''}`} id="tab-tasks">
            <TasksView
              onNewTask={() => handleOpenEditor(ItemType.TASK)}
              onOpenTask={(id) => {
                setSelectedTaskId(id);
                setShowOptionsModal(true);
              }}
              onToggleActive={(id) => {
                const t = db.items.find(i => i.id === id) as Task | undefined;
                if (t) {
                  if (!t.active) {
                    const orders = (db.items as Task[])
                      .filter(i => (i as Task).active && (i as Task).activeOrder !== undefined)
                      .map(i => (i as Task).activeOrder as number);
                    const min = orders.length > 0 ? Math.min(...orders) : 1;
                    rememberStore.updateItem(id, { active: true, activeOrder: min - 1 });
                  } else {
                    rememberStore.updateItem(id, { active: false });
                  }
                }
              }}
              onToggleComplete={(id) => rememberStore.toggleItemCompleted(id)}
              onReorderActiveTasks={(ids) => {
                ids.forEach((taskId, index) => rememberStore.updateItem(taskId, { activeOrder: index }));
              }}
              onImageClick={setZoomedImage}
            />
          </section>
          {/* 3. ACTIVITIES TAB */}
          <section className={`tab-pane ${currentTab === 'activities' ? 'active' : ''}`} id="tab-activities">
            <ActivitiesView onOpenEditor={handleOpenEditor} onZoomImage={setZoomedImage} />
          </section>

          {/* 4. REMINDERS TAB */}
          <section className={`tab-pane ${currentTab === 'reminders' ? 'active' : ''}`} id="tab-reminders">
            <RemindersView onOpenReminder={(id) => handleOpenEditor(ItemType.MEMO, id)} />
          </section>

          {/* 6. PLANS TAB */}
          <section className={`tab-pane ${currentTab === 'plans' ? 'active' : ''}`} id="tab-plans">
            <PlansView onOpenPlan={(id) => handleOpenEditor(ItemType.PLAN, id)} />
          </section>

          {/* 7. STATISTICS TAB */}
          <section className={`tab-pane ${currentTab === 'statistics' ? 'active' : ''}`} id="tab-statistics">
            <StatisticsView
              onOpenRoadmap={(taskId) => {
                setSelectedTaskId(taskId);
                setShowRoadmapModal(true);
              }}
            />
          </section>

          {/* 8. HELP MANUAL TAB */}
          <section className={`tab-pane ${currentTab === 'help' ? 'active' : ''}`} id="tab-help">
            <HelpView />
          </section>

          {/* GOALS TAB */}
          <section className={`tab-pane ${currentTab === 'goals' ? 'active' : ''}`} id="tab-goals">
            <GoalsView />
          </section>

          {/* TRASH TAB */}
          <section className={`tab-pane ${currentTab === 'trash' ? 'active' : ''}`} id="tab-trash">
            <TrashView />
          </section>

          {/* DROPBOX TAB */}
          <section className={`tab-pane ${currentTab === 'dropbox' ? 'active' : ''}`} id="tab-dropbox">
            <DropboxView />
          </section>

          {/* SYNC TAB */}
          <section className={`tab-pane ${currentTab === 'sync' ? 'active' : ''}`} id="tab-sync">
            <SyncPanel />
          </section>

          {/* 9. SETTINGS TAB */}
          <section className={`tab-pane ${currentTab === 'settings' ? 'active' : ''}`} id="tab-settings">
            <SettingsView />
          </section>

          {/* 10. LISTS TAB */}
          <section className={`tab-pane ${currentTab === 'lists' ? 'active' : ''}`} id="tab-lists">
            <ListsView onImageClick={setZoomedImage} />
          </section>
        </div>
      </main>

      {/* ==================== INTERACTIVE MODALS ==================== */}

      {/* 1. OPTIONS MODAL */}
      {showOptionsModal && selectedTaskId && (
        <div className="modal-overlay" onClick={() => setShowOptionsModal(false)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 id="options-task-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {db.items.find(i => i.id === selectedTaskId)?.title || 'Opciones'}
              </h3>
              <button className="modal-close" onClick={() => setShowOptionsModal(false)}>&times;</button>
            </div>
            <div className="options-buttons-grid">
              <div
                className="opt-btn"
                onClick={() => {
                  setShowOptionsModal(false);
                  const t = db.items.find(i => i.id === selectedTaskId) as Task;
                  const weight = getTaskWeightLabel(t?.estimatedHours, db.hourWeights);
                  const dur = weight === 'luna' ? db.userSettings.lunaDuration : (weight === 'terra' ? db.userSettings.terraDuration : (weight === 'sol' ? db.userSettings.solDuration : db.userSettings.astraDuration));
                  openTaskFocus(selectedTaskId, dur, weight === 'luna' ? 'COMPLETAR' : (weight === 'terra' ? 'AVANZAR' : (weight === 'sol' ? 'SIGUIENTE_PASO' : 'HABITO')));
                }}
              >
                <span className="opt-icon">⏱️</span>
                <span className="opt-lbl">Enfocar Tarea</span>
              </div>
              <div
                className="opt-btn"
                onClick={() => {
                  setShowOptionsModal(false);
                  handleOpenEditor(ItemType.TASK, selectedTaskId);
                }}
              >
                <span className="opt-icon">✏️</span>
                <span className="opt-lbl">Editar Tarea</span>
              </div>
              <div
                className="opt-btn"
                onClick={() => {
                  setShowOptionsModal(false);
                  setShowRoadmapModal(true);
                }}
              >
                <span className="opt-icon">📈</span>
                <span className="opt-lbl">Ver Roadmap</span>
              </div>
              <div
                className="opt-btn"
                onClick={() => {
                  setShowOptionsModal(false);
                  setShowSlotModal(true);
                }}
              >
                <span className="opt-icon">📅</span>
                <span className="opt-lbl">Asociar a Bloque</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SLOT MODAL */}
      {showSlotModal && selectedTaskId && (
        <div className="modal-overlay" onClick={() => setShowSlotModal(false)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Asociar a Bloque</h3>
                <span id="slot-modal-task-title" className="subtitle">
                  {db.items.find(i => i.id === selectedTaskId)?.title}
                </span>
              </div>
              <button className="modal-close" onClick={() => setShowSlotModal(false)}>&times;</button>
            </div>
            <div id="slot-modal-list">
              {db.timeSlots.map(slot => {
                const isAssigned = slot.assignedTaskIds && slot.assignedTaskIds.includes(selectedTaskId);
                return (
                  <div
                    key={slot.id}
                    className={`slot-toggle-row ${isAssigned ? 'associated' : ''}`}
                    onClick={() => {
                      if (isAssigned) {
                        rememberStore.unassignTaskFromSlot(slot.id, selectedTaskId);
                      } else {
                        rememberStore.assignTaskToSlot(slot.id, selectedTaskId);
                      }
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, display: 'block' }}>{slot.name}</span>
                      <span className="subtitle">{slot.startTime} - {slot.endTime}</span>
                    </div>
                    <span className="badge-text" style={{ fontSize: '1.15rem' }}>
                      {isAssigned ? '✓ Vinculado' : '+ Vincular'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. ROADMAP MODAL */}
      {showRoadmapModal && selectedTaskId && (
        <div className="modal-overlay" onClick={() => setShowRoadmapModal(false)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header-row">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Progreso e Historial de Roadmap</h3>
                <span id="roadmap-task-title" className="subtitle">
                  {db.items.find(i => i.id === selectedTaskId)?.title}
                </span>
              </div>
              <button className="modal-close" onClick={() => setShowRoadmapModal(false)}>&times;</button>
            </div>

            <div className="roadmap-timeline" id="roadmap-sessions-list" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
              {(() => {
                const subtasks = db.items.filter(
                  i => i.type === ItemType.TASK && !i.trash && i.parentTaskId === selectedTaskId
                ) as Task[];

                const list = db.sessions
                  .filter(s => s.taskId === selectedTaskId)
                  .sort((a, b) => {
                    const ta = new Date(a.endTime || a.startTime || a.createdAt || 0).getTime();
                    const tb = new Date(b.endTime || b.startTime || b.createdAt || 0).getTime();
                    return ta < tb ? 1 : (ta > tb ? -1 : 0);
                  });

                return (
                  <>
                    {/* Subtareas arriba del todo con background violeta */}
                    {subtasks.length > 0 && (
                      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#BF5AF2', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            ⚡ Subtareas ({subtasks.filter(st => st.completed).length}/{subtasks.length})
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                            Arriba de notas
                          </span>
                        </div>
                        {subtasks.map(st => (
                          <div
                            key={st.id}
                            style={{
                              background: 'rgba(191, 90, 242, 0.12)',
                              border: '1.5px solid rgba(191, 90, 242, 0.35)',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ background: '#BF5AF2', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                                  ⚡ SUBTAREA
                                </span>
                                <span style={{ background: 'rgba(255,255,255,0.08)', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', color: st.priority === Priority.URGENT ? '#FF3B30' : (st.priority === Priority.HIGH ? '#FF9500' : '#34C759') }}>
                                  {st.priority === Priority.URGENT ? 'Urgente' : (st.priority === Priority.HIGH ? 'Alta' : (st.priority === Priority.MEDIUM ? 'Media' : 'Baja'))}
                                </span>
                                {st.estimatedHours && (
                                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                                    ⌛ {st.estimatedHours}h
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditor(ItemType.TASK, st.id)}
                                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.85rem' }}
                                  title="Editar subtarea"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`¿Eliminar subtarea "${st.title}"?`)) {
                                      rememberStore.deleteItem(st.id);
                                    }
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', fontSize: '0.85rem' }}
                                  title="Eliminar subtarea"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => rememberStore.toggleItemCompleted(st.id)}
                                style={{
                                  background: st.completed ? '#BF5AF2' : 'transparent',
                                  border: '1.5px solid #BF5AF2',
                                  color: '#fff',
                                  borderRadius: '50%',
                                  width: '18px',
                                  height: '18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {st.completed ? '✓' : ''}
                              </button>
                              <span
                                style={{
                                  fontSize: '0.9rem',
                                  fontWeight: 700,
                                  color: st.completed ? 'rgba(255,255,255,0.4)' : '#fff',
                                  textDecoration: st.completed ? 'line-through' : 'none',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleOpenEditor(ItemType.TASK, st.id)}
                              >
                                {st.title}
                              </span>
                            </div>

                            {st.description && (
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginLeft: '26px' }}>
                                {st.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {list.length === 0 && subtasks.length === 0 && (
                      <div className="slot-empty-msg" style={{ textAlign: 'center', padding: '40px' }}>Esta tarea no tiene ninguna sesión de enfoque ni subtarea registrada.</div>
                    )}

                    {list.map(session => {
                  const isEditing = editingSessionId === session.id;
                  const isNoteOnly = !session.realDuration && !session.plannedDuration;

                  if (isEditing) {
                    return (
                      <div key={session.id} className="roadmap-session-card" style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>Editar {isNoteOnly ? 'nota' : 'sesión'} del {new Date(session.endTime!).toLocaleDateString()}</h4>
                        <div className="roadmap-session-edit-form" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {isNoteOnly ? (
                            <>
                              <div className="form-group">
                                <label>Título de la Nota</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={editSessionTitle}
                                  onChange={e => setEditSessionTitle(e.target.value)}
                                  style={{ fontWeight: 'bold' }}
                                />
                              </div>
                              <div className="form-group">
                                <label>Contenido de la Nota</label>
                                <textarea
                                  className="form-control"
                                  rows={3}
                                  value={editSessionNotes}
                                  onChange={e => setEditSessionNotes(e.target.value)}
                                />
                              </div>
                              <div className="form-group">
                                <label>Imágenes de la nota</label>
                                {editSessionNotesImages.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                    {editSessionNotesImages.map((img, idx) => (
                                      <div key={idx} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden' }}>
                                        <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button
                                          type="button"
                                          onClick={() => setEditSessionNotesImages(prev => prev.filter((_, i) => i !== idx))}
                                          style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                          &times;
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                                  📷 Adjuntar Imágenes
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    style={{ display: 'none' }}
                                    onChange={(e) => handleImageUpload(e, (base64s) => {
                                      setEditSessionNotesImages(prev => [...prev, ...base64s]);
                                    })}
                                  />
                                </label>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="form-group">
                                <label>¿Qué se hizo?</label>
                                <textarea
                                  className="form-control"
                                  rows={2}
                                  value={editSessionNotes}
                                  onChange={e => setEditSessionNotes(e.target.value)}
                                />
                              </div>
                              <div className="form-group">
                                <label>Siguiente paso</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={editSessionNext}
                                  onChange={e => setEditSessionNext(e.target.value)}
                                />
                              </div>
                              <div className="form-group">
                                <label>Progreso de la tarea (%):</label>
                                <input
                                  type="number"
                                  className="form-control"
                                  min="0"
                                  max="100"
                                  value={editSessionProg}
                                  onChange={e => setEditSessionProg(parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </>
                          )}
                          <div className="form-row" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button
                              className="btn btn-primary"
                              onClick={() => {
                                rememberStore.updateSession(session.id, {
                                  title: isNoteOnly ? editSessionTitle : undefined,
                                  notes: editSessionNotes,
                                  notesImages: editSessionNotesImages,
                                  nextStep: isNoteOnly ? undefined : editSessionNext,
                                  progress: isNoteOnly ? undefined : editSessionProg
                                });
                                setEditingSessionId(null);
                              }}
                            >
                              Guardar
                            </button>
                            <button className="btn btn-secondary" onClick={() => setEditingSessionId(null)}>Cancelar</button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={session.id} className="roadmap-session-card" style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="roadmap-session-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="roadmap-session-date" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                          {new Date(session.endTime!).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }) + ' ' + new Date(session.endTime!).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="roadmap-session-duration" style={{ fontSize: '0.8rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                          {isNoteOnly ? '📝 Nota' : `${session.realDuration} min`}
                        </span>
                      </div>
                      
                      {isNoteOnly ? (
                        <div style={{ marginTop: '6px' }}>
                          {session.title && (
                            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>
                              {session.title}
                            </h4>
                          )}
                          <RichText
                            text={session.notes || ''}
                            images={session.notesImages}
                            onImageClick={setZoomedImage}
                            style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap' }}
                          />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div>
                            <span className="roadmap-session-label" style={{ color: 'var(--color-terra)', display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>✅ ¿Qué se hizo?</span>
                            {session.notes ? (
                              <RichText text={session.notes} images={session.notesImages} onImageClick={setZoomedImage} className="roadmap-session-text" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }} />
                            ) : (
                              <p className="roadmap-session-text" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>No especificado</p>
                            )}
                          </div>
                          {session.nextStep && (
                            <div>
                              <span className="roadmap-session-label" style={{ color: 'var(--color-sol)', display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>🎯 Siguiente paso planificado:</span>
                              <RichText text={session.nextStep} className="roadmap-session-text" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }} />
                            </div>
                          )}
                          <div>
                            <span className="roadmap-session-label" style={{ color: 'var(--color-luna)', display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>📈 Progreso de la tarea:</span>
                            <p className="roadmap-session-text" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>{session.progress || 0}%</p>
                          </div>
                        </div>
                      )}

                      <div className="roadmap-session-actions" style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditingSessionId(session.id);
                            setEditSessionTitle(session.title || '');
                            setEditSessionNotes(session.notes || '');
                            setEditSessionNotesImages(session.notesImages || []);
                            setEditSessionNext(session.nextStep || '');
                            setEditSessionProg(session.progress || 0);
                          }}
                          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            if (window.confirm('¿Eliminar esta entrada del roadmap?')) {
                              rememberStore.deleteSession(session.id);
                            }
                          }}
                          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  );
                  })}
                </>
              );
            })()}
            </div>

            {/* New Note or Subtask Form at bottom of Roadmap Modal */}
            <div className="roadmap-new-note-form" style={{ marginTop: '15px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRoadmapBottomTab('note')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: roadmapBottomTab === 'note' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: roadmapBottomTab === 'note' ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                    color: roadmapBottomTab === 'note' ? '#fff' : 'rgba(255,255,255,0.6)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  📝 Nueva Nota
                </button>
                <button
                  type="button"
                  onClick={() => setRoadmapBottomTab('subtask')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: roadmapBottomTab === 'subtask' ? 'rgba(191, 90, 242, 0.18)' : 'transparent',
                    border: roadmapBottomTab === 'subtask' ? '1px solid #BF5AF2' : '1px solid transparent',
                    color: roadmapBottomTab === 'subtask' ? '#BF5AF2' : 'rgba(255,255,255,0.6)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Nueva Subtarea
                </button>
              </div>

              {roadmapBottomTab === 'note' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Título de la nota (opcional)..."
                    value={commentTitles[selectedTaskId] || ''}
                    onChange={e => setCommentTitles(prev => ({ ...prev, [selectedTaskId]: e.target.value }))}
                    style={{ fontSize: '0.9rem', fontWeight: 'bold', padding: '6px 10px' }}
                  />
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Escribe la nota..."
                    value={commentInputs[selectedTaskId] || ''}
                    onChange={e => setCommentInputs(prev => ({ ...prev, [selectedTaskId]: e.target.value }))}
                    style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                  />
                  
                  {commentImages[selectedTaskId] && commentImages[selectedTaskId].length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                      {commentImages[selectedTaskId].map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '45px', height: '45px', borderRadius: '6px', overflow: 'hidden' }}>
                          <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => setCommentImages(prev => ({
                              ...prev,
                              [selectedTaskId]: prev[selectedTaskId].filter((_, i) => i !== idx)
                            }))}
                            style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', padding: '3px 8px', fontSize: '0.75rem' }}>
                      📷 Adjuntar Imágenes
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageUpload(e, (base64s) => {
                          setCommentImages(prev => ({
                            ...prev,
                            [selectedTaskId]: [...(prev[selectedTaskId] || []), ...base64s]
                          }));
                        })}
                      />
                    </label>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const txt = commentInputs[selectedTaskId]?.trim() || '';
                        const title = commentTitles[selectedTaskId]?.trim() || '';
                        const imgs = commentImages[selectedTaskId] || [];
                        if (!txt && !title && imgs.length === 0) return;

                        rememberStore.createSession(selectedTaskId, 0, txt, title || undefined, imgs);
                        setCommentInputs(prev => ({ ...prev, [selectedTaskId]: '' }));
                        setCommentTitles(prev => ({ ...prev, [selectedTaskId]: '' }));
                        setCommentImages(prev => ({ ...prev, [selectedTaskId]: [] }));
                      }}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Enviar Nota
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Título de la subtarea (requerido)..."
                    value={subtaskTitle}
                    onChange={e => setSubtaskTitle(e.target.value)}
                    style={{ fontSize: '0.9rem', fontWeight: 'bold', padding: '6px 10px' }}
                  />
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Descripción o notas adicionales (opcional)..."
                    value={subtaskDesc}
                    onChange={e => setSubtaskDesc(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '2px' }}>Prioridad</label>
                      <select
                        className="form-control"
                        value={subtaskPriority}
                        onChange={e => setSubtaskPriority(e.target.value as Priority)}
                        style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                      >
                        <option value={Priority.LOW}>Baja</option>
                        <option value={Priority.MEDIUM}>Media</option>
                        <option value={Priority.HIGH}>Alta</option>
                        <option value={Priority.URGENT}>Urgente</option>
                      </select>
                    </div>
                    <div style={{ width: '80px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '2px' }}>Horas</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        className="form-control"
                        value={subtaskHours}
                        onChange={e => setSubtaskHours(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '2px' }}>Energía</label>
                      <select
                        className="form-control"
                        value={subtaskEnergy}
                        onChange={e => setSubtaskEnergy(e.target.value as EnergyType)}
                        style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                      >
                        <option value={EnergyType.CREATIVE}>Creativo</option>
                        <option value={EnergyType.ANALYTICAL}>Analítico</option>
                        <option value={EnergyType.LEARNING}>Aprendizaje</option>
                        <option value={EnergyType.SOCIAL}>Social</option>
                        <option value={EnergyType.ADMINISTRATIVE}>Admin</option>
                        <option value={EnergyType.PHYSICAL}>Físico</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => handleCreateSubtask(selectedTaskId)}
                      style={{ flex: 1, background: '#BF5AF2', borderColor: '#BF5AF2', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      ⚡ Crear Subtarea
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        const pId = selectedTaskId;
                        setShowRoadmapModal(false);
                        handleOpenEditor(ItemType.TASK, undefined, pId);
                      }}
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      title="Abrir editor completo"
                    >
                      ↗️ Editor Completo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. UNIVERSAL EDITOR MODAL */}
      {showEditorModal && (
        <div className="modal-overlay" onClick={() => setShowEditorModal(false)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 id="editor-modal-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {editingItemId
                  ? (formTaskParentId ? 'Editar Subtarea' : 'Editar Elemento')
                  : (formTaskParentId ? 'Crear Nueva Subtarea' : 'Crear Nuevo Elemento')}
              </h3>
              <button className="modal-close" onClick={() => setShowEditorModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleEditorSubmit} id="editor-form">
              {!formTaskParentId && (
                <div className="form-group">
                  <label>Tipo de Elemento</label>
                  <select
                    id="edit-type"
                    className="form-control"
                    value={editorType}
                    disabled={!!editingItemId}
                    onChange={e => setEditorType(e.target.value as ItemType)}
                  >
                    <option value={ItemType.TASK}>Tarea</option>
                    <option value={ItemType.MEMO}>Recordatorio</option>
                    <option value={ItemType.ACTIVITY}>Ocio</option>
                    <option value={ItemType.PLAN}>Plan Largo Plazo</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Título</label>
                <input
                  type="text"
                  id="edit-title"
                  className="form-control"
                  required
                  placeholder="Escribe el nombre o título..."
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Notas / Descripción</label>
                <textarea
                  id="edit-desc"
                  className="form-control"
                  rows={3}
                  placeholder="Detalles adicionales..."
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '15px 0' }}>
                <input
                  type="checkbox"
                  id="edit-favourite"
                  checked={formFavourite}
                  onChange={e => setFormFavourite(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label htmlFor="edit-favourite" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, userSelect: 'none' }}>
                  ⭐ Destacado / Favorito
                </label>
              </div>

              <div className="form-group">
                <label>Etiquetas (Separadas por comas)</label>
                <input
                  type="text"
                  id="edit-tags"
                  className="form-control"
                  placeholder="ej. trabajo, urgente, compras..."
                  value={formTags}
                  onChange={e => setFormTags(e.target.value)}
                />
              </div>

              {/* Dynamic Sub-Forms */}
              {editorType === ItemType.TASK && (
                <div id="editor-task-fields" className="editor-section">
                  <div className="form-group">
                    <label>Prioridad</label>
                    <select
                      id="edit-task-priority"
                      className="form-control"
                      value={formTaskPriority}
                      onChange={e => setFormTaskPriority(e.target.value as Priority)}
                    >
                      <option value={Priority.LOW}>Baja</option>
                      <option value={Priority.MEDIUM}>Media</option>
                      <option value={Priority.HIGH}>Alta</option>
                      <option value={Priority.URGENT}>Urgente</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tipo de Esfuerzo (Energía)</label>
                    <select
                      id="edit-task-energy"
                      className="form-control"
                      value={formTaskEnergy}
                      onChange={e => setFormTaskEnergy(e.target.value as EnergyType)}
                    >
                      <option value={EnergyType.CREATIVE}>Creativo</option>
                      <option value={EnergyType.ANALYTICAL}>Analítico</option>
                      <option value={EnergyType.LEARNING}>Aprendizaje</option>
                      <option value={EnergyType.SOCIAL}>Social</option>
                      <option value={EnergyType.ADMINISTRATIVE}>Administrativo</option>
                      <option value={EnergyType.PHYSICAL}>Físico</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Horas Estimadas</label>
                    <input
                      type="number"
                      step="0.5"
                      id="edit-task-hours"
                      className="form-control"
                      value={formTaskHours}
                      onChange={e => setFormTaskHours(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Estado de Ejecución</label>
                    <select
                      id="edit-task-state"
                      className="form-control"
                      value={formTaskState}
                      onChange={e => setFormTaskState(e.target.value as TaskState)}
                    >
                      <option value={TaskState.NOT_STARTED}>No Iniciado</option>
                      <option value={TaskState.IN_PROGRESS}>En Curso</option>
                      <option value={TaskState.BLOCKED}>Bloqueado</option>
                      <option value={TaskState.WAITING}>En Espera</option>
                      <option value={TaskState.COMPLETED}>Completado</option>
                    </select>
                  </div>
                  {formTaskParentId ? (
                    <div style={{ padding: '10px 12px', background: 'rgba(191, 90, 242, 0.12)', border: '1px solid rgba(191, 90, 242, 0.35)', borderRadius: '8px', marginBottom: '12px' }}>
                      <div style={{ color: '#BF5AF2', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '4px' }}>
                        ⚡ Subtarea de: {db.items.find(i => i.id === formTaskParentId)?.title || 'Tarea principal'}
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
                        El Objetivo y la Fase se heredan automáticamente de la tarea principal ({formTaskGoalId ? (db.goals.find(g => g.id === formTaskGoalId)?.title || 'Objetivo asignado') : 'Sin objetivo'}).
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label>Objetivo</label>
                        <select
                          id="edit-task-goal"
                          className="form-control"
                          value={formTaskGoalId}
                          onChange={e => {
                            const newGoalId = e.target.value;
                            setFormTaskGoalId(newGoalId);
                            setFormTaskPhaseId('');
                          }}
                        >
                          <option value="">Ninguno</option>
                          {db.goals.map(goal => (
                            <option key={goal.id} value={goal.id}>
                              {goal.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      {formTaskGoalId && (
                        <div className="form-group">
                          <label>Subobjetivo / Fase</label>
                          <select
                            id="edit-task-phase"
                            className="form-control"
                            value={formTaskPhaseId}
                            onChange={e => setFormTaskPhaseId(e.target.value)}
                          >
                            <option value="">Ninguno</option>
                            {(db.goals.find(g => g.id === formTaskGoalId)?.phases || []).map((phase: any) => (
                              <option key={phase.id} value={phase.id}>
                                {phase.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                  <div className="form-group">
                    <label>Franja de Ejecución</label>
                    <select
                      id="edit-task-timeslot"
                      className="form-control"
                      value={formTaskSlotId}
                      onChange={e => setFormTaskSlotId(e.target.value)}
                    >
                      <option value="">Ninguna</option>
                      {db.timeSlots.map(slot => (
                        <option key={slot.id} value={slot.id}>
                          {slot.name} ({slot.startTime} - {slot.endTime})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Fecha de Inicio</label>
                      <input
                        type="date"
                        id="edit-task-start"
                        className="form-control"
                        value={formTaskStart}
                        onChange={e => setFormTaskStart(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Fecha Límite</label>
                      <input
                        type="date"
                        id="edit-task-due"
                        className="form-control"
                        value={formTaskDue}
                        onChange={e => setFormTaskDue(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label>Imágenes de la Tarea</label>
                    {formTaskImages.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                        {formTaskImages.map((img, idx) => (
                          <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden' }}>
                            <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={() => setFormTaskImages(prev => prev.filter((_, i) => i !== idx))}
                              style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                      📷 Adjuntar Imágenes
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageUpload(e, (base64s) => {
                          setFormTaskImages(prev => [...prev, ...base64s]);
                        })}
                      />
                    </label>
                  </div>
                </div>
              )}

              {editorType === ItemType.ACTIVITY && (
                <div id="editor-activity-fields" className="editor-section">
                  <div className="form-group">
                    <label>Categoría</label>
                    <select
                      id="edit-activity-cat"
                      className="form-control"
                      value={formActivityCat}
                      onChange={e => setFormActivityCat(e.target.value)}
                    >
                      {db.activityCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {(editorType === ItemType.MEMO || editorType === ItemType.REMINDER) && (
                <div id="editor-memo-fields" className="editor-section">
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Válido Desde</label>
                      <input
                        type="date"
                        id="edit-memo-start"
                        className="form-control"
                        value={formMemoStart}
                        onChange={e => setFormMemoStart(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Hasta</label>
                      <input
                        type="date"
                        id="edit-memo-end"
                        className="form-control"
                        value={formMemoEnd}
                        onChange={e => setFormMemoEnd(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-row" style={{ marginTop: '10px', alignItems: 'center' }}>
                    <div className="form-group checkbox-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formMemoAlarm}
                          onChange={e => setFormMemoAlarm(e.target.checked)}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span>🔔 Programar Alarma</span>
                      </label>
                    </div>
                    {formMemoAlarm && (
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>Hora de alarma</label>
                        <input
                          type="time"
                          className="form-control"
                          value={formMemoAlarmTime}
                          onChange={e => setFormMemoAlarmTime(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {editorType === ItemType.PLAN && (
                <div id="editor-plan-fields" className="editor-section">
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Mes Inicio</label>
                      <select
                        id="edit-plan-start-month"
                        className="form-control"
                        value={formPlanStartMonth}
                        onChange={e => setFormPlanStartMonth(e.target.value)}
                      >
                        {Array.from({ length: 12 }).map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(2000, i, 1).toLocaleString('es-ES', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Año Inicio</label>
                      <input
                        type="number"
                        id="edit-plan-start-year"
                        className="form-control"
                        value={formPlanStartYear}
                        onChange={e => setFormPlanStartYear(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Mes Fin</label>
                      <select
                        id="edit-plan-end-month"
                        className="form-control"
                        value={formPlanEndMonth}
                        onChange={e => setFormPlanEndMonth(e.target.value)}
                      >
                        {Array.from({ length: 12 }).map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(2000, i, 1).toLocaleString('es-ES', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Año Fin</label>
                      <input
                        type="number"
                        id="edit-plan-end-year"
                        className="form-control"
                        value={formPlanEndYear}
                        onChange={e => setFormPlanEndYear(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-row margin-top-lg">
                <button type="submit" className="btn btn-primary">
                  {editingItemId ? 'Guardar Cambios' : 'Crear Elemento'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditorModal(false)}>
                  Cancelar
                </button>
                {editingItemId && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      if (window.confirm('¿Enviar a la papelera?')) {
                        rememberStore.deleteItem(editingItemId);
                        setShowEditorModal(false);
                      }
                    }}
                    style={{ marginLeft: 'auto' }}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. FOCUS TIMER MODAL */}
      {showTimerModal && timerTaskId && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header-row" style={{ marginBottom: '10px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Sesión de Enfoque Activa</h3>
              {!timerRunning && !showCompletionForm && (
                <button className="modal-close" onClick={handleFinishTimerCancel}>&times;</button>
              )}
            </div>

            {!showCompletionForm ? (
              <div className="timer-container">
                <span id="timer-task-title" style={{ fontSize: '1.25rem', fontWeight: 800, display: 'block' }}>
                  {db.items.find(i => i.id === timerTaskId)?.title}
                </span>

                <div className="timer-ring-wrapper">
                  <svg width="160" height="160" className="timer-svg">
                    <circle cx="80" cy="80" r="45" className="timer-bg-ring" />
                    <circle
                      cx="80"
                      cy="80"
                      r="45"
                      id="timer-progress-ring"
                      className="timer-progress-ring"
                      strokeDashoffset={timerStrokeOffset}
                    />
                  </svg>
                  <span id="timer-countdown-text" className="timer-countdown">
                    {`${String(Math.floor(timerSecondsRemaining / 60)).padStart(2, '0')}:${String(timerSecondsRemaining % 60).padStart(2, '0')}`}
                  </span>
                </div>

                <div>
                  <span className="card-badge tag-energy" style={{ display: 'inline-block' }}>
                    Objetivo: {timerObjective}
                  </span>
                  <p id="timer-objective-desc" className="subtitle" style={{ marginTop: '8px' }}>
                    {timerObjective === 'COMPLETAR' && 'Puedes quitártela de encima ahora mismo. ¡Hazlo rápido!'}
                    {timerObjective === 'SIGUIENTE_PASO' && 'Planifica y ataca el siguiente hito concreto de esta tarea.'}
                    {timerObjective === 'HABITO' && 'Lo importante es la constancia. Dedica unos minutos para no romper la racha.'}
                    {timerObjective === 'AVANZAR' && 'Progreso incremental. Concéntrate en mantener el foco sin la presión de terminar.'}
                  </p>
                </div>

                <div className="timer-controls">
                  <button className="timer-control-btn" onClick={() => setTimerRunning(!timerRunning)}>
                    {timerRunning ? (
                      <svg viewBox="0 0 24 24">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                  </button>
                  <button className="timer-control-btn" onClick={handleFinishTimerEarly} style={{ color: 'var(--color-success)' }}>
                    ✓
                  </button>
                  <button className="timer-control-btn" onClick={handleFinishTimerCancel} style={{ color: 'var(--color-danger)' }}>
                    &times;
                  </button>
                </div>
              </div>
            ) : (
              <div id="timer-completion-form" style={{ padding: '10px 0' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px', textAlign: 'center' }}>
                  ¡Sesión Finalizada!
                </h3>
                <p className="subtitle" style={{ textAlign: 'center', marginBottom: '20px' }}>
                  Registra tu progreso para alimentar los algoritmos cognitivos.
                </p>

                <form onSubmit={handleFeedbackSubmit} id="session-feedback-form">
                  <div className="form-group">
                    <label>Progreso de la Tarea: <strong id="fb-progress-val">{fbProgress}%</strong></label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      id="fb-progress"
                      className="form-control"
                      style={{ cursor: 'pointer', padding: 0 }}
                      value={fbProgress}
                      onChange={e => setFbProgress(parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Notas de la sesión</label>
                    <textarea
                      id="fb-notes"
                      className="form-control"
                      rows={4}
                      required
                      placeholder="Detalles sobre lo avanzado y notas de esta sesión..."
                      value={fbNotes}
                      onChange={e => setFbNotes(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-success btn-full margin-top-lg">
                    Registrar en el Roadmap
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Local Sync Toast */}
      {(syncBanner || syncPending) && (
        <div className="sync-toast glass-panel">
          <span className="sync-toast-text">
            {syncPending && !syncBanner
              ? '📱 Nuevos datos disponibles del móvil.'
              : syncBanner}
          </span>
          <div className="sync-toast-actions">
            {syncPending && !syncBanner && (
              <button className="btn btn-primary" onClick={() => { setSyncBanner(null); handleReceiveFromMobile(); }} disabled={syncBusy}>
                Recibir
              </button>
            )}
            {(syncBanner && !syncPending) && (
              <button className="btn btn-secondary" onClick={closeSyncBanner}>Cerrar</button>
            )}
          </div>
        </div>
      )}
      {/* Zoomed Image Modal Overlay */}
      {zoomedImage && (
        <div
          className="modal-overlay"
          onClick={() => setZoomedImage(null)}
          style={{
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
            <img
              src={zoomedImage}
              alt="Zoomed"
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: '100%',
                maxHeight: '90vh',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
              }}
            />
            <button
              className="modal-close"
              onClick={() => setZoomedImage(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0px',
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '2.5rem',
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
