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
  getTaskWeightLabel,
  ScoreEngine
} from './engines';
import { RichText } from './RichText';

export default function App() {
  const db = useRememberStore();

  // Navigation
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Lists feature states
  const [newListName, setNewListName] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
  const [newItemImages, setNewItemImages] = useState<Record<string, string[]>>({});
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
  const [editingListItemId, setEditingListItemId] = useState<string | null>(null);
  const [editingListIdForItem, setEditingListIdForItem] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');
  const [editingItemTitle, setEditingItemTitle] = useState('');
  const [editingItemImages, setEditingItemImages] = useState<string[]>([]);
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
  const [formReminderDate, setFormReminderDate] = useState('');
  const [formReminderTime, setFormReminderTime] = useState('12:00');
  const [formMemoStart, setFormMemoStart] = useState('');
  const [formMemoEnd, setFormMemoEnd] = useState('');
  const [formPlanStartMonth, setFormPlanStartMonth] = useState('1');
  const [formPlanStartYear, setFormPlanStartYear] = useState('2026');
  const [formPlanEndMonth, setFormPlanEndMonth] = useState('1');
  const [formPlanEndYear, setFormPlanEndYear] = useState('2026');
  const [formTaskGoalId, setFormTaskGoalId] = useState('');
  const [formTaskPhaseId, setFormTaskPhaseId] = useState('');
  const [formTaskSlotId, setFormTaskSlotId] = useState('');
  const [formFavourite, setFormFavourite] = useState(false);
  const [formTags, setFormTags] = useState('');

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

  // Task Filter
  const [taskFilter, setTaskFilter] = useState<'active' | 'completed' | 'archived' | 'trash'>('active');

  // Plans Filter
  const [plansYearFilter, setPlansYearFilter] = useState<string>('all');

  // Statistics Collapsible Groups
  const [statsExpandedDay, setStatsExpandedDay] = useState<string | null>(null);
  const [statsExpandedTask, setStatsExpandedTask] = useState<string | null>(null);

  // Settings Forms
  const [setLunaDur, setSetLunaDur] = useState(String(db.userSettings.lunaDuration));
  const [setTerraDur, setSetTerraDur] = useState(String(db.userSettings.terraDuration));
  const [setSolDur, setSetSolDur] = useState(String(db.userSettings.solDuration));
  const [setAstraDur, setSetAstraDur] = useState(String(db.userSettings.astraDuration));
  const [setFormula, setSetFormula] = useState(db.userSettings.scoreFormula || '');
  const [formulaValidationMsg, setFormulaValidationMsg] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });

  // Sync settings inputs when DB loads/resets
  useEffect(() => {
    setSetLunaDur(String(db.userSettings.lunaDuration));
    setSetTerraDur(String(db.userSettings.terraDuration));
    setSetSolDur(String(db.userSettings.solDuration));
    setSetAstraDur(String(db.userSettings.astraDuration));
    setSetFormula(db.userSettings.scoreFormula || '');
  }, [db.userSettings]);

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
      if (i.type !== ItemType.REMINDER || i.completed || i.archived || i.trash) return false;
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
    }) as Reminder[];
  }, [db.items]);

  // Tasks Filtered List
  const filteredTasks = useMemo(() => {
    let list = db.items.filter(i => i.type === ItemType.TASK) as Task[];
    if (taskFilter === 'completed') {
      return list.filter(t => t.completed && !t.trash);
    } else if (taskFilter === 'archived') {
      return list.filter(t => t.archived && !t.trash);
    } else if (taskFilter === 'trash') {
      return list.filter(t => t.trash);
    } else {
      return list.filter(t => !t.completed && !t.archived && !t.trash);
    }
  }, [db.items, taskFilter]);

  // Planning Shelf List
  const shelfTasks = useMemo(() => {
    const allAssignedIds = new Set<string>();
    db.timeSlots.forEach(s => {
      if (s.assignedTaskIds) {
        s.assignedTaskIds.forEach(id => allAssignedIds.add(id));
      }
    });

    return db.items.filter(i =>
      i.type === ItemType.TASK &&
      !i.completed &&
      !i.archived &&
      !i.trash &&
      !allAssignedIds.has(i.id)
    ) as Task[];
  }, [db.items, db.timeSlots]);

  // Activities List
  const activities = useMemo(() => {
    return db.items.filter(i => i.type === ItemType.ACTIVITY && !i.trash) as Activity[];
  }, [db.items]);

  // Reminders List (Upcoming & Pinned)
  const pinnedReminders = useMemo(() => {
    return db.items.filter(i => i.type === ItemType.REMINDER && (i as Reminder).pinned && !i.completed && !i.trash) as Reminder[];
  }, [db.items]);

  const upcomingReminders = useMemo(() => {
    return db.items.filter(i => i.type === ItemType.REMINDER && !(i as Reminder).pinned && !i.completed && !i.trash) as Reminder[];
  }, [db.items]);

  // Memos List
  const memos = useMemo(() => {
    return db.items.filter(i => i.type === ItemType.MEMO && !i.trash) as Memo[];
  }, [db.items]);

  // Plans List & Dynamic Years Filter Options
  const plansYears = useMemo(() => {
    const list = db.items.filter(i => i.type === ItemType.PLAN && !i.trash) as Plan[];
    const yrs = new Set(list.map(p => p.startYear));
    return Array.from(yrs).sort();
  }, [db.items]);

  const filteredPlans = useMemo(() => {
    const list = db.items.filter(i => i.type === ItemType.PLAN && !i.trash) as Plan[];
    if (plansYearFilter === 'all') {
      return list;
    }
    const yrNum = parseInt(plansYearFilter);
    return list.filter(p => p.startYear === yrNum);
  }, [db.items, plansYearFilter]);

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
  const handleOpenEditor = (type: ItemType, itemId?: string) => {
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
          setFormTaskEnergy(t.energyType);
          setFormTaskHours(String(t.estimatedHours));
          setFormTaskState(t.taskState);
          setFormTaskStart(t.startDate || '');
          setFormTaskDue(t.dueDate || '');
          setFormTaskGoalId(t.goalId || '');
          setFormTaskPhaseId(t.phaseId || '');
          setFormTaskSlotId(t.timeSlotId || '');
          setFormTaskImages(t.images || []);
        } else if (item.type === ItemType.ACTIVITY) {
          setFormActivityCat((item as Activity).category);
        } else if (item.type === ItemType.REMINDER) {
          const r = item as Reminder;
          setFormReminderDate(r.remindAt.dates[0] || '');
          setFormReminderTime(r.remindAt.time || '12:00');
        } else if (item.type === ItemType.MEMO) {
          const m = item as Memo;
          setFormMemoStart(m.startDate || '');
          setFormMemoEnd(m.endDate || '');
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
      setFormTaskGoalId('');
      setFormTaskPhaseId('');
      setFormTaskSlotId('');
      setFormActivityCat('SPORT');
      setFormReminderDate(new Date().toISOString().split('T')[0]);
      setFormReminderTime('12:00');
      setFormMemoStart(new Date().toISOString().split('T')[0]);
      setFormMemoEnd(new Date().toISOString().split('T')[0]);
      setFormPlanStartMonth('1');
      setFormPlanStartYear('2026');
      setFormPlanEndMonth('1');
      setFormPlanEndYear('2026');
      setFormTaskImages([]);
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
    } else if (editorType === ItemType.ACTIVITY) {
      data.category = formActivityCat;
    } else if (editorType === ItemType.REMINDER) {
      data.date = formReminderDate;
      data.time = formReminderTime;
    } else if (editorType === ItemType.MEMO) {
      data.startDate = formMemoStart;
      data.endDate = formMemoEnd;
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
      else if (editorType === ItemType.REMINDER) rememberStore.createReminder(data);
      else if (editorType === ItemType.MEMO) rememberStore.createMemo(data);
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

  // Statistics Chart Calculators
  const statsEnergyDonut = useMemo(() => {
    const counts: Record<string, number> = {};
    db.sessions.forEach(s => {
      const task = db.items.find(i => i.id === s.taskId && i.type === ItemType.TASK) as Task;
      if (task) {
        const type = task.energyType || 'OTHER';
        counts[type] = (counts[type] || 0) + 1;
      }
    });

    const colors: Record<string, string> = {
      CREATIVE: '#3b82f6',
      ANALYTICAL: '#10b981',
      LEARNING: '#f59e0b',
      SOCIAL: '#8b5cf6',
      ADMINISTRATIVE: '#ec4899',
      PHYSICAL: '#ef4444',
      OTHER: '#64748b'
    };

    return { counts, colors };
  }, [db.sessions, db.items]);

  const statsBlocksDonut = useMemo(() => {
    const counts: Record<string, number> = { LUNA: 0, TERRA: 0, SOL: 0, ASTRA: 0 };
    db.sessions.forEach(s => {
      const task = db.items.find(i => i.id === s.taskId && i.type === ItemType.TASK) as Task;
      if (task) {
        const weight = getTaskWeightLabel(task.estimatedHours, db.hourWeights).toUpperCase();
        counts[weight] = (counts[weight] || 0) + 1;
      }
    });

    const colors: Record<string, string> = {
      LUNA: 'var(--color-luna)',
      TERRA: 'var(--color-terra)',
      SOL: 'var(--color-sol)',
      ASTRA: 'var(--color-astra)'
    };

    return { counts, colors };
  }, [db.sessions, db.items, db.hourWeights]);

  // Statistics Log grouped sessions
  const statisticsSessionsGrouped = useMemo(() => {
    const dailyGroups: Record<string, any[]> = {};
    db.sessions.forEach(s => {
      if (s.endTime) {
        const dStr = s.endTime.split('T')[0];
        if (!dailyGroups[dStr]) dailyGroups[dStr] = [];
        dailyGroups[dStr].push(s);
      }
    });

    const sortedDates = Object.keys(dailyGroups).sort((a, b) => b.localeCompare(a));
    return { dailyGroups, sortedDates };
  }, [db.sessions]);

  // Drag and drop settings order logic
  const handleDragEnergy = (fromIdx: number, toIdx: number) => {
    const list = [...(db.userSettings.preferredOrderEnergy || [])];
    const [removed] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, removed);
    rememberStore.updateUserSettings({ preferredOrderEnergy: list });
  };

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
      <aside className="sidebar glass-panel">
        <div className="logo-container">
          <img src="/app_icon.png" alt="Logo" className="logo-img" onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23818cf8"><circle cx="12" cy="12" r="10"/></svg>';
          }} />
          <span className="logo-text">RubeRemember</span>
        </div>
        <nav className="nav-menu">
          <button className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentTab('dashboard')}>
            <span>🏠 Dashboard</span>
          </button>
          <button className={`nav-item ${currentTab === 'tasks' ? 'active' : ''}`} onClick={() => setCurrentTab('tasks')}>
            <span>✅ Tareas</span>
          </button>
          <button className={`nav-item ${currentTab === 'activities' ? 'active' : ''}`} onClick={() => setCurrentTab('activities')}>
            <span>🏃 Hábitos</span>
          </button>
          <button className={`nav-item ${currentTab === 'reminders' ? 'active' : ''}`} onClick={() => setCurrentTab('reminders')}>
            <span>🔔 Recordatorios</span>
          </button>
          <button className={`nav-item ${currentTab === 'lists' ? 'active' : ''}`} onClick={() => setCurrentTab('lists')}>
            <span>📋 Listas</span>
          </button>
          <button className={`nav-item ${currentTab === 'memos' ? 'active' : ''}`} onClick={() => setCurrentTab('memos')}>
            <span>📝 Memos</span>
          </button>
          <button className={`nav-item ${currentTab === 'plans' ? 'active' : ''}`} onClick={() => setCurrentTab('plans')}>
            <span>🎯 Planes</span>
          </button>
          <button className={`nav-item ${currentTab === 'statistics' ? 'active' : ''}`} onClick={() => setCurrentTab('statistics')}>
            <span>📊 Estadísticas</span>
          </button>
          <button className={`nav-item ${currentTab === 'help' ? 'active' : ''}`} onClick={() => setCurrentTab('help')}>
            <span>📖 Manual</span>
          </button>
          <button className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`} onClick={() => setCurrentTab('settings')}>
            <span>⚙️ Ajustes</span>
          </button>
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          <button
            className="btn btn-secondary btn-full"
            onClick={handleRequestFromMobile}
            disabled={syncBusy || !mobileConnected}
            title={!mobileConnected ? 'El móvil no está conectado. Conéctalo desde la app móvil' : 'Solicitar la base de datos del móvil'}
          >
            📱 Solicitar datos {mobileConnected ? '🟢' : '🔴'}
          </button>
          <button className="btn btn-secondary btn-full" onClick={handleSendToMobile} disabled={syncBusy || !mobileConnected}>
            📤 Enviar al Móvil
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content">
        {/* Header Bar */}
        <header className="header-bar glass-panel">
          <div className="header-left">
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>RubeRemember Web</h1>
            <span className="header-date">{formattedToday}</span>
          </div>

          <div className="header-right">
            {/* Search Input */}
            <div className="search-container">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Buscar tareas, notas..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchOverlay(e.target.value.trim().length > 0);
                }}
              />

              {showSearchOverlay && (
                <div id="search-results-overlay" className="search-results-overlay glass-panel">
                  <div className="search-results-header">
                    <span>Resultados de búsqueda</span>
                    <button
                      id="close-search-results"
                      className="modal-close"
                      onClick={() => {
                        setShowSearchOverlay(false);
                        setSearchQuery('');
                      }}
                      style={{ fontSize: '1.1rem' }}
                    >
                      &times;
                    </button>
                  </div>
                  <div className="search-results-list">
                    {searchResults.length === 0 ? (
                      <div className="slot-empty-msg" style={{ padding: '20px', textAlign: 'center' }}>
                        No se encontraron resultados.
                      </div>
                    ) : (
                      searchResults.map(item => (
                        <div
                          key={item.id}
                          className="search-item-row"
                          onClick={() => {
                            setShowSearchOverlay(false);
                            setSearchQuery('');
                            if (item.type === ItemType.TASK) {
                              handleTaskClick(item.id);
                            } else {
                              handleOpenEditor(item.type, item.id);
                            }
                          }}
                        >
                          <div className="search-item-left">
                            <span className={`search-item-type-badge badge-${item.type.toLowerCase()}`}>
                              {item.type}
                            </span>
                            <span className="search-item-title" style={{ fontWeight: 700 }}>
                              {item.title}
                            </span>
                          </div>
                          <span className="subtitle">
                            {item.description ? item.description.substring(0, 50) + '...' : 'Sin notas.'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cognitive Context Badge */}
            <div id="header-cognitive-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                className="badge-dot"
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: headerBadge.color,
                  boxShadow: `0 0 8px ${headerBadge.color}`
                }}
              ></div>
              <span id="header-cognitive-text" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {headerBadge.text}
              </span>
            </div>

            <button className="btn btn-primary" id="btn-create-item" onClick={() => handleOpenEditor(ItemType.TASK)}>
              ➕ Crear
            </button>
          </div>
        </header>

        {/* Content Body Container */}
        <div className="content-body">
          {/* 1. DASHBOARD TAB */}
          <section className={`tab-pane ${currentTab === 'dashboard' ? 'active' : ''}`} id="tab-dashboard">
            <div className="dashboard-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Cognitive recommendation Hero card */}
                <div className="glass-panel rec-hero-card">
                  <span className={`card-badge badge-${recommendation.priorityLevel.toLowerCase()}`}>
                    Prioridad {recommendation.priorityLevel}
                  </span>
                  <h2 className="rec-title">
                    {recommendation.taskId
                      ? (db.items.find(i => i.id === recommendation.taskId)?.title || recommendation.reason)
                      : recommendation.reason}
                  </h2>
                  <div className="rec-desc">
                    {recommendation.taskId ? (
                      (() => {
                        const task = db.items.find(i => i.id === recommendation.taskId) as Task;
                        return task && (task.description || (task.images && task.images.length > 0)) ? (
                          <RichText text={task.description || ''} images={task.images} onImageClick={setZoomedImage} className="rec-desc-rich" />
                        ) : (
                          <span className="rec-desc-fallback">Sin notas adicionales.</span>
                        );
                      })()
                    ) : ''}
                  </div>

                  <div className="rec-reasons-list">
                    <div className="rec-reason-item">
                      {recommendation.reason}
                    </div>
                    {recommendation.reasonsSecondary && recommendation.reasonsSecondary.map((r, idx) => (
                      <div key={idx} className="rec-reason-item">
                        {r}
                      </div>
                    ))}
                  </div>

                  <div className="form-row">
                    {recommendation.taskId && (
                      <button
                        className="btn btn-success"
                        id="btn-rec-start"
                        onClick={() => openTaskFocus(recommendation.taskId!, recommendation.recommendedDuration, recommendation.sessionType)}
                      >
                        ⏱️ Iniciar Enfoque ({recommendation.recommendedDuration}m)
                      </button>
                    )}
                    <button className="btn btn-secondary" onClick={() => handleOpenEditor(ItemType.TASK)}>
                      Nueva Tarea
                    </button>
                  </div>

                  <div className="rec-confidence-widget">
                    <div className="confidence-circle">
                      {recommendation.confidenceLevel}%
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block' }}>Nivel de Confianza</span>
                      <span className="subtitle">Calculado según tu historial y la fatiga cognitiva</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Stats */}
                <div className="mini-stats-row">
                  <div className="glass-panel mini-stat-card">
                    <span className="mini-stat-val">{db.statistics.currentStreak || 0}</span>
                    <span className="mini-stat-lbl">Racha Actual</span>
                  </div>
                  <div className="glass-panel mini-stat-card">
                    <span className="mini-stat-val">{activeTasksCount}</span>
                    <span className="mini-stat-lbl">Tareas Activas</span>
                  </div>
                  <div className="glass-panel mini-stat-card">
                    <span className="mini-stat-val">{workedHoursStr}</span>
                    <span className="mini-stat-lbl">Tiempo Enfocado</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Today's slots */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px' }}>Bloques de Tiempo Hoy</h3>
                  <div className="slots-container">
                    {db.timeSlots.map(slot => {
                      const assigned = (slot.assignedTaskIds || [])
                        .map(tid => db.items.find(i => i.id === tid && i.type === ItemType.TASK && !i.trash) as Task)
                        .filter(Boolean);

                      return (
                        <div key={slot.id} className="slot-card">
                          <div className="slot-left">
                            <div className="slot-indicator slot-luna">📅</div>
                            <div className="slot-meta">
                              <span className="slot-name">{slot.name}</span>
                              <span className="slot-time">{slot.startTime} - {slot.endTime}</span>
                            </div>
                          </div>
                          <div className="slot-assigned-tasks">
                            {assigned.length > 0 ? (
                              assigned.map(task => (
                                <span key={task.id} className="slot-task-tag">
                                  {task.title}
                                  <span
                                    className="slot-task-tag-remove"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      rememberStore.unassignTaskFromSlot(slot.id, task.id);
                                    }}
                                  >
                                    &times;
                                  </span>
                                </span>
                              ))
                            ) : (
                              <span className="slot-empty-msg">Vacío - Sin tareas</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active Alerts Panel */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px' }}>Alertas de Recordatorios</h3>
                  <div>
                    {activeReminders.length > 0 ? (
                      activeReminders.map(rem => (
                        <div key={rem.id} className="reminder-alert-card">
                          <div>
                            <span className="reminder-alert-title">{rem.title}</span>
                            <span className="reminder-alert-time">{rem.remindAt.time || 'Todo el día'}</span>
                          </div>
                          <button
                            className="reminder-alert-btn"
                            onClick={() => rememberStore.toggleItemCompleted(rem.id)}
                          >
                            Atendido
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="slot-empty-msg" style={{ padding: '20px', textAlign: 'center' }}>
                        Sin alertas activas.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. TASKS TAB */}
          <section className={`tab-pane ${currentTab === 'tasks' ? 'active' : ''}`} id="tab-tasks">
            <div className="section-header">
              <div className="section-title-group">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Gestión de Tareas</h2>
                <span className="section-subtitle">Visualiza, programa y completa tus objetivos cognitivos</span>
              </div>
              <button className="btn btn-primary" onClick={() => handleOpenEditor(ItemType.TASK)}>
                Nueva Tarea
              </button>
            </div>

            <div className="filter-row">
              <button className={`filter-btn ${taskFilter === 'active' ? 'active' : ''}`} onClick={() => setTaskFilter('active')}>
                Activas
              </button>
              <button className={`filter-btn ${taskFilter === 'completed' ? 'active' : ''}`} onClick={() => setTaskFilter('completed')}>
                Completadas
              </button>
              <button className={`filter-btn ${taskFilter === 'archived' ? 'active' : ''}`} onClick={() => setTaskFilter('archived')}>
                Archivadas
              </button>
              <button className={`filter-btn ${taskFilter === 'trash' ? 'active' : ''}`} onClick={() => setTaskFilter('trash')}>
                Papelera
              </button>
            </div>

            <div className="tasks-grid-layout">
              <div className="tasks-list">
                {filteredTasks.length === 0 ? (
                  <div className="slot-empty-msg" style={{ textAlign: 'center', padding: '40px' }}>
                    No hay tareas en esta sección.
                  </div>
                ) : (
                  filteredTasks.map(task => {
                    const weight = getTaskWeightLabel(task.estimatedHours, db.hourWeights);
                    const progress = task.progress || 0;

                    return (
                      <div
                        key={task.id}
                        className={`glass-panel task-card ${task.completed ? 'completed' : ''}`}
                        onClick={() => handleTaskClick(task.id)}
                      >
                        <div className="task-card-left">
                          <div className={`task-weight-indicator slot-${weight}`} style={{ background: 'rgba(255,255,255,0.03)' }}>
                            {weight === 'luna' ? '🌙' : (weight === 'terra' ? '🌍' : (weight === 'sol' ? '☀️' : '⭐'))}
                          </div>
                          <div className="task-info-group">
                            <div className="task-title-row">
                              <span className="task-title">
                                {task.favourite && <span style={{ color: '#FFCC00', marginRight: '4px' }}>⭐</span>}
                                {task.title}
                              </span>
                              {task.dueDate && <span className="task-due-date">📅 {task.dueDate}</span>}
                            </div>
                             {task.description || (task.images && task.images.length > 0) ? (
                               <RichText text={task.description || ''} images={task.images} onImageClick={setZoomedImage} className="task-desc" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }} />
                             ) : (
                               <span className="task-desc">Sin notas.</span>
                             )}
                            <div className="task-meta-tags">
                              <span className={`tag-meta tag-priority-${task.priority}`}>
                                {task.priority}
                              </span>
                              {task.taskState === TaskState.BLOCKED && (
                                <span className="tag-meta tag-state-blocked">🚫 Bloqueada</span>
                              )}
                              {task.taskState === TaskState.WAITING && (
                                <span className="tag-meta tag-state-waiting">⏳ Esperando</span>
                              )}
                              <span className="tag-meta tag-energy">{task.energyType}</span>
                              <span className="tag-meta tag-energy">Bloque: {weight.toUpperCase()}</span>
                              {task.goalId && (() => {
                                const goal = db.goals.find(g => g.id === task.goalId);
                                if (!goal) return null;
                                const phase = task.phaseId ? goal.phases?.find((p: any) => p.id === task.phaseId) : null;
                                return (
                                  <>
                                    <span className="tag-meta" style={{ backgroundColor: 'rgba(191,90,242,0.15)', color: '#BF5AF2' }}>
                                      🎯 {goal.title}
                                    </span>
                                    {phase && (
                                      <span className="tag-meta" style={{ backgroundColor: 'rgba(0,199,190,0.15)', color: '#00C7BE' }}>
                                        ⛓️ {phase.name}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                              {task.timeSlotId && (() => {
                                const slot = db.timeSlots.find(s => s.id === task.timeSlotId);
                                return slot ? (
                                  <span className="tag-meta" style={{ backgroundColor: 'rgba(0,122,255,0.15)', color: '#007AFF' }}>
                                    ⏰ {slot.name}
                                  </span>
                                ) : null;
                              })()}
                              {progress > 0 && !task.completed && (
                                <span className="tag-meta tag-energy">{progress}% completado</span>
                              )}
                              {task.tags && task.tags.map(tag => (
                                <span key={tag} className="tag-meta" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            {progress > 0 && !task.completed && (
                              <div className="task-progress-bar-container">
                                <div className="task-progress-fill" style={{ width: `${progress}%` }}></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Planning Shelf */}
              <div className="glass-panel planning-shelf" style={{ height: 'fit-content' }}>
                <h3 className="shelf-title">Estante de Planificación</h3>
                <span className="subtitle" style={{ display: 'block', marginBottom: '12px' }}>
                  Tareas no asignadas a ningún bloque hoy.
                </span>
                <div className="shelf-items-list">
                  {shelfTasks.length === 0 ? (
                    <div className="slot-empty-msg" style={{ padding: '10px 0' }}>
                      Todas las tareas han sido vinculadas a bloques.
                    </div>
                  ) : (
                    shelfTasks.map(task => (
                      <div key={task.id} className="shelf-item-card">
                        <div className="shelf-item-info">
                          <span className="shelf-item-title">{task.title}</span>
                          <span className="subtitle">
                            Clasificación: {getTaskWeightLabel(task.estimatedHours, db.hourWeights).toUpperCase()}
                          </span>
                        </div>
                        <button
                          className="slot-action-btn"
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            setShowSlotModal(true);
                          }}
                        >
                          +
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 3. ACTIVITIES TAB */}
          <section className={`tab-pane ${currentTab === 'activities' ? 'active' : ''}`} id="tab-activities">
            <div className="section-header">
              <div className="section-title-group">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Hábitos y Actividades de Ocio</h2>
                <span className="section-subtitle">Fomenta la constancia y el bienestar diario</span>
              </div>
              <button className="btn btn-primary" onClick={() => handleOpenEditor(ItemType.ACTIVITY)}>
                Nueva Actividad
              </button>
            </div>

            <div className="activities-grid">
              {activities.length === 0 ? (
                <div className="slot-empty-msg" style={{ textAlign: 'center', padding: '40px', gridColumn: '1 / -1' }}>
                  No hay hábitos configurados aún.
                </div>
              ) : (
                activities.map(act => {
                  const catObj = db.activityCategories.find(c => c.id === act.category);
                  return (
                    <div key={act.id} className="glass-panel activity-card">
                      <div className="activity-top">
                        <div className="card-badge tag-energy" style={{ alignSelf: 'flex-start' }}>
                          {catObj ? catObj.name : act.category}
                        </div>
                        <span className="activity-title">{act.title}</span>
                        {act.description ? (
                          <RichText text={act.description} className="subtitle" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }} />
                        ) : (
                          <span className="subtitle">Sin notas.</span>
                        )}
                      </div>
                      <div className="activity-stats">
                        <span>Registros: {act.doneCount || 0}</span>
                        {act.lastDoneAt ? (
                          <span>Último: {new Date(act.lastDoneAt).toLocaleDateString()}</span>
                        ) : (
                          <span>Nunca registrado</span>
                        )}
                      </div>
                      <div className="form-row margin-top-lg">
                        <button
                          className="btn btn-success btn-full"
                          onClick={() => rememberStore.registerActivityDone(act.id)}
                        >
                          Registrar
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleOpenEditor(ItemType.ACTIVITY, act.id)}
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* 4. REMINDERS TAB */}
          <section className={`tab-pane ${currentTab === 'reminders' ? 'active' : ''}`} id="tab-reminders">
            <div className="section-header">
              <div className="section-title-group">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Recordatorios e Hilos Activos</h2>
                <span className="section-subtitle">Alertas importantes basadas en hora y fechas concretas</span>
              </div>
              <button className="btn btn-primary" onClick={() => handleOpenEditor(ItemType.REMINDER)}>
                Nuevo Recordatorio
              </button>
            </div>

            <div className="reminders-layout">
              {/* Pinned */}
              <div className="glass-panel" style={{ padding: '20px', height: 'fit-content' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>📍 Anclados (Importantes)</h3>
                <div>
                  {pinnedReminders.length === 0 ? (
                    <div className="slot-empty-msg" style={{ padding: '20px' }}>No hay recordatorios anclados.</div>
                  ) : (
                    pinnedReminders.map(rem => (
                      <div key={rem.id} className="reminder-card" onClick={() => handleOpenEditor(ItemType.REMINDER, rem.id)}>
                        <div className="reminder-card-left">
                          <div
                            className={`checkbox-circle ${rem.completed ? 'checked' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              rememberStore.toggleItemCompleted(rem.id);
                            }}
                          ></div>
                          <div className="reminder-info">
                            <span className="reminder-title">{rem.title}</span>
                            <span className="reminder-time-tag">
                              {rem.remindAt.dates.join(', ')} a las {rem.remindAt.time}
                            </span>
                          </div>
                        </div>
                        <div className="reminder-actions" onClick={e => e.stopPropagation()}>
                          <button
                            className="btn-pin pinned"
                            onClick={() => rememberStore.updateItem(rem.id, { pinned: false })}
                          >
                            📌
                          </button>
                          <button
                            className="btn-pin"
                            onClick={() => rememberStore.deleteItem(rem.id)}
                            style={{ color: 'var(--color-danger)' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Upcoming */}
              <div className="glass-panel" style={{ padding: '20px', height: 'fit-content' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>📅 Próximos</h3>
                <div>
                  {upcomingReminders.length === 0 ? (
                    <div className="slot-empty-msg" style={{ padding: '20px' }}>No hay recordatorios pendientes.</div>
                  ) : (
                    upcomingReminders.map(rem => (
                      <div key={rem.id} className="reminder-card" onClick={() => handleOpenEditor(ItemType.REMINDER, rem.id)}>
                        <div className="reminder-card-left">
                          <div
                            className={`checkbox-circle ${rem.completed ? 'checked' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              rememberStore.toggleItemCompleted(rem.id);
                            }}
                          ></div>
                          <div className="reminder-info">
                            <span className="reminder-title">{rem.title}</span>
                            <span className="reminder-time-tag">
                              {rem.remindAt.dates.join(', ')} a las {rem.remindAt.time}
                            </span>
                          </div>
                        </div>
                        <div className="reminder-actions" onClick={e => e.stopPropagation()}>
                          <button
                            className="btn-pin"
                            onClick={() => rememberStore.updateItem(rem.id, { pinned: true })}
                          >
                            📌
                          </button>
                          <button
                            className="btn-pin"
                            onClick={() => rememberStore.deleteItem(rem.id)}
                            style={{ color: 'var(--color-danger)' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 5. MEMOS TAB */}
          <section className={`tab-pane ${currentTab === 'memos' ? 'active' : ''}`} id="tab-memos">
            <div className="section-header">
              <div className="section-title-group">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Bandeja de Entrada e Ideas (Memos)</h2>
                <span className="section-subtitle">Vuelca ideas rápidas antes de estructurarlas en proyectos</span>
              </div>
              <button className="btn btn-primary" onClick={() => handleOpenEditor(ItemType.MEMO)}>
                Nuevo Memo
              </button>
            </div>

            <div className="memos-grid">
              {memos.length === 0 ? (
                <div className="slot-empty-msg" style={{ textAlign: 'center', padding: '40px', gridColumn: '1 / -1' }}>
                  No hay notas guardadas aún.
                </div>
              ) : (
                memos.map(memo => (
                  <div key={memo.id} className="glass-panel memo-card">
                    <div className="memo-header">
                      <span className="memo-title">{memo.title}</span>
                      <span className="subtitle">{new Date(memo.createdAt).toLocaleDateString()}</span>
                    </div>
                    {memo.description ? (
                      <RichText text={memo.description} className="memo-body" style={{ margin: '8px 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }} />
                    ) : (
                      <p className="memo-body">Sin contenido.</p>
                    )}
                    <div className="memo-footer">
                      <span>Rango: {memo.startDate || ''} - {memo.endDate || ''}</span>
                      <div className="memo-actions-row">
                        <button className="btn btn-secondary" onClick={() => handleOpenEditor(ItemType.MEMO, memo.id)}>✏️</button>
                        <button className="btn btn-danger" onClick={() => rememberStore.deleteItem(memo.id)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 6. PLANS TAB */}
          <section className={`tab-pane ${currentTab === 'plans' ? 'active' : ''}`} id="tab-plans">
            <div className="section-header">
              <div className="section-title-group">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Planes a Largo Plazo</h2>
                <span className="section-subtitle">Visualiza tus aspiraciones y objetivos a gran escala</span>
              </div>
              <button className="btn btn-primary" onClick={() => handleOpenEditor(ItemType.PLAN)}>
                Nuevo Plan
              </button>
            </div>

            <div className="plans-header-row">
              <div className="form-group" style={{ width: '200px', marginBottom: 0 }}>
                <label>Filtrar por año</label>
                <select
                  className="form-control"
                  value={plansYearFilter}
                  onChange={(e) => setPlansYearFilter(e.target.value)}
                >
                  <option value="all">Todos los años</option>
                  {plansYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="plans-grid">
              {filteredPlans.length === 0 ? (
                <div className="slot-empty-msg" style={{ textAlign: 'center', padding: '40px', gridColumn: '1 / -1' }}>
                  No hay planes creados en esta sección.
                </div>
              ) : (
                filteredPlans.map(plan => {
                  const startMonthName = new Date(2000, plan.startMonth - 1, 1).toLocaleString('es-ES', { month: 'long' });
                  const endMonthName = new Date(2000, plan.endMonth - 1, 1).toLocaleString('es-ES', { month: 'long' });

                  return (
                    <div key={plan.id} className="glass-panel plan-card">
                      <h3 className="plan-title">{plan.title}</h3>
                      <span className="plan-range-tag">
                        {startMonthName} {plan.startYear} - {endMonthName} {plan.endYear}
                      </span>
                      {plan.description ? (
                        <RichText text={plan.description} className="subtitle" style={{ margin: '8px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }} />
                      ) : (
                        <p className="subtitle" style={{ margin: '8px 0' }}>Sin notas descriptivas.</p>
                      )}
                      <div className="plan-actions">
                        <button className="btn btn-secondary" onClick={() => handleOpenEditor(ItemType.PLAN, plan.id)}>✏️ Editar</button>
                        <button className="btn btn-danger" onClick={() => rememberStore.deleteItem(plan.id)}>🗑️</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* 7. STATISTICS TAB */}
          <section className={`tab-pane ${currentTab === 'statistics' ? 'active' : ''}`} id="tab-statistics">
            <div className="section-header">
              <div className="section-title-group">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Estadísticas Cognitivas</h2>
                <span className="section-subtitle">Distribución energética y diario temporal de enfoque</span>
              </div>
            </div>

            <div className="stats-dashboard">
              <div className="charts-row">
                {/* Energy Chart */}
                <div className="glass-panel chart-card">
                  <h3>Distribución por Energías</h3>
                  <div className="chart-wrapper">
                    {(() => {
                      const keys = Object.keys(statsEnergyDonut.counts);
                      const total = keys.reduce((acc, k) => acc + statsEnergyDonut.counts[k], 0);

                      if (total === 0) {
                        return <div className="slot-empty-msg">Sin datos suficientes para graficar.</div>;
                      }

                      const r = 50;
                      const circ = 2 * Math.PI * r;
                      let accumulatedAngle = 0;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <svg width="160" height="160" viewBox="0 0 160 160" className="timer-svg">
                            <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                            {keys.map(key => {
                              const count = statsEnergyDonut.counts[key];
                              const fraction = count / total;
                              const strokeLength = fraction * circ;
                              const strokeOffset = circ - strokeLength;
                              const strokeColor = statsEnergyDonut.colors[key] || '#94a3b8';
                              const angleOffset = (accumulatedAngle / total) * 360;

                              accumulatedAngle += count;

                              return (
                                <circle
                                  key={key}
                                  cx="80"
                                  cy="80"
                                  r={r}
                                  fill="none"
                                  stroke={strokeColor}
                                  strokeWidth="12"
                                  strokeDasharray={circ}
                                  strokeDashoffset={strokeOffset}
                                  transform={`rotate(${angleOffset} 80 80)`}
                                  strokeLinecap="round"
                                />
                              );
                            })}
                            <circle cx="80" cy="80" r={r - 8} fill="#171727" />
                            <text x="80" y="77" className="chart-text-val" transform="rotate(90 80 80)">{total}</text>
                            <text x="80" y="88" className="chart-text-lbl" transform="rotate(90 80 80)">SESIONES</text>
                          </svg>

                          <div className="chart-legend">
                            {keys.map(key => (
                              <div key={key} className="legend-item">
                                <div className="legend-color-box" style={{ backgroundColor: statsEnergyDonut.colors[key] }}></div>
                                <span>{key}: {statsEnergyDonut.counts[key]} ({Math.round((statsEnergyDonut.counts[key]/total)*100)}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Blocks Chart */}
                <div className="glass-panel chart-card">
                  <h3>Distribución por Bloques</h3>
                  <div className="chart-wrapper">
                    {(() => {
                      const keys = Object.keys(statsBlocksDonut.counts).filter(k => statsBlocksDonut.counts[k] > 0);
                      const total = keys.reduce((acc, k) => acc + statsBlocksDonut.counts[k], 0);

                      if (total === 0) {
                        return <div className="slot-empty-msg">Sin datos suficientes para graficar.</div>;
                      }

                      const r = 50;
                      const circ = 2 * Math.PI * r;
                      let accumulatedAngle = 0;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <svg width="160" height="160" viewBox="0 0 160 160" className="timer-svg">
                            <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                            {keys.map(key => {
                              const count = statsBlocksDonut.counts[key];
                              const fraction = count / total;
                              const strokeLength = fraction * circ;
                              const strokeOffset = circ - strokeLength;
                              const strokeColor = statsBlocksDonut.colors[key] || '#94a3b8';
                              const angleOffset = (accumulatedAngle / total) * 360;

                              accumulatedAngle += count;

                              return (
                                <circle
                                  key={key}
                                  cx="80"
                                  cy="80"
                                  r={r}
                                  fill="none"
                                  stroke={strokeColor}
                                  strokeWidth="12"
                                  strokeDasharray={circ}
                                  strokeDashoffset={strokeOffset}
                                  transform={`rotate(${angleOffset} 80 80)`}
                                  strokeLinecap="round"
                                />
                              );
                            })}
                            <circle cx="80" cy="80" r={r - 8} fill="#171727" />
                            <text x="80" y="77" className="chart-text-val" transform="rotate(90 80 80)">{total}</text>
                            <text x="80" y="88" className="chart-text-lbl" transform="rotate(90 80 80)">SESIONES</text>
                          </svg>

                          <div className="chart-legend">
                            {keys.map(key => (
                              <div key={key} className="legend-item">
                                <div className="legend-color-box" style={{ backgroundColor: statsBlocksDonut.colors[key] }}></div>
                                <span>{key}: {statsBlocksDonut.counts[key]} ({Math.round((statsBlocksDonut.counts[key]/total)*100)}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Collapsible Session Log history */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Diario de Sesiones Realizadas</h3>
                <div id="stats-daily-history">
                  {statisticsSessionsGrouped.sortedDates.length === 0 ? (
                    <div className="slot-empty-msg" style={{ textAlign: 'center', padding: '40px' }}>
                      No se ha registrado ninguna sesión de enfoque aún.
                    </div>
                  ) : (
                    statisticsSessionsGrouped.sortedDates.map(dateStr => {
                      const daySessions = statisticsSessionsGrouped.dailyGroups[dateStr];
                      const totalMins = daySessions.reduce((acc, s) => acc + s.realDuration, 0);
                      const isDayExpanded = statsExpandedDay === dateStr;

                      // Group sessions of the day by task
                      const taskGroups: Record<string, any[]> = {};
                      daySessions.forEach(s => {
                        if (!taskGroups[s.taskId]) taskGroups[s.taskId] = [];
                        taskGroups[s.taskId].push(s);
                      });

                      return (
                        <div key={dateStr} className="daily-log-day-group">
                          <div
                            className="daily-log-day-header"
                            onClick={() => setStatsExpandedDay(isDayExpanded ? null : dateStr)}
                          >
                            <span className="daily-log-day-title">
                              {new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <span className="daily-log-day-duration">
                              Total: {totalMins} min ({daySessions.length} ses.) {isDayExpanded ? '▲' : '▼'}
                            </span>
                          </div>

                          {isDayExpanded && (
                            <div className="daily-log-day-content">
                              {Object.keys(taskGroups).map(taskId => {
                                const taskObj = db.items.find(i => i.id === taskId);
                                const taskSessions = taskGroups[taskId];
                                const taskMins = taskSessions.reduce((acc, s) => acc + s.realDuration, 0);
                                const isTaskExpanded = statsExpandedTask === taskId;

                                return (
                                  <div key={taskId} className="daily-log-task-group">
                                    <div
                                      className="daily-log-task-header"
                                      onClick={() => setStatsExpandedTask(isTaskExpanded ? null : taskId)}
                                    >
                                      <span className="daily-log-task-title">{taskObj ? taskObj.title : 'Tarea eliminada'}</span>
                                      <span className="daily-log-task-meta">
                                        {taskMins} min ({taskSessions.length} ses.) {isTaskExpanded ? '▲' : '▼'}
                                      </span>
                                    </div>

                                    {isTaskExpanded && (
                                      <div className="daily-log-task-content">
                                        {taskSessions.map(session => (
                                          <div key={session.id} className="session-block-details">
                                            <div className="roadmap-session-header-row">
                                              <span className="session-block-title">
                                                {new Date(session.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {session.realDuration} min
                                              </span>
                                              <span style={{ color: session.completed ? 'var(--color-terra)' : 'var(--color-danger)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                {session.completed ? 'Completado' : 'Incompleto'}
                                              </span>
                                            </div>
                                            <div className="session-block-val"><strong>Progreso:</strong> {session.progress || 0}%</div>
                                            <div className="session-block-val"><strong>¿Qué se hizo?:</strong> {session.notes || 'No especificado'}</div>
                                            <div className="session-block-val"><strong>Siguiente paso:</strong> {session.nextStep || 'No especificado'}</div>
                                            <div className="session-block-actions">
                                              <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                  setSelectedTaskId(session.taskId);
                                                  setShowRoadmapModal(true);
                                                }}
                                              >
                                                Gestionar Roadmap
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 8. HELP MANUAL TAB */}
          <section className={`tab-pane ${currentTab === 'help' ? 'active' : ''}`} id="tab-help">
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '20px' }}>Manual de Ayuda Inteligente</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: '1.6' }}>
                <p>
                  Bienvenido a la versión web de <strong>RubeRemember</strong>. Esta aplicación utiliza metodologías cognitivas y de gamificación basadas en el peso temporal para priorizar tus actividades.
                </p>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-luna)' }}>Clasificación de Tareas (Pesos)</h3>
                <p>
                  Las tareas se clasifican dinámicamente según sus horas estimadas:
                </p>
                <ul>
                  <li><strong>🌙 Luna (menos de 5 horas):</strong> Tareas rápidas y de bajo esfuerzo. El objetivo sugerido suele ser completarlas.</li>
                  <li><strong>🌍 Terra (de 5 a 10 horas):</strong> Tareas medianas. Se aconseja avanzar en pasos progresivos.</li>
                  <li><strong>☀️ Sol (10 horas o más):</strong> Tareas complejas y proyectos de gran tamaño. Se divide el enfoque para abordar hitos o roadmaps.</li>
                  <li><strong>⭐ Astra (Tareas de hábito):</strong> Tareas periódicas y repetitivas que fomentan hábitos constantes.</li>
                </ul>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-terra)' }}>El Algoritmo de Recomendación</h3>
                <p>
                  El sistema no solo calcula un score bruto para cada tarea, sino que aplica penalizaciones y bonificaciones:
                </p>
                <ul>
                  <li><strong>Fatiga por tipo de energía:</strong> Si encadenas varias tareas del mismo tipo de esfuerzo (como analítica o creativa), el sistema aplica una penalización progresiva para evitar el agotamiento.</li>
                  <li><strong>Bonificación de transición:</strong> Se te recomendará la tarea que encaje mejor con el flujo o ritmo ideal configurado en tus preferencias de secuencia de energía y pesos.</li>
                  <li><strong>Ajuste de franjas horarias:</strong> Si estás dentro de un bloque temporal definido, el temporizador sugerido se reduce para encajar en el tiempo restante del bloque.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 9. SETTINGS TAB */}
          <section className={`tab-pane ${currentTab === 'settings' ? 'active' : ''}`} id="tab-settings">
            <div className="section-header">
              <div className="section-title-group">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Ajustes y Parámetros del Algoritmo</h2>
                <span className="section-subtitle">Ajusta los algoritmos, resetea datos o personaliza duraciones</span>
              </div>
            </div>

            <div className="settings-layout">
              {/* Form Duraciones */}
              <div className="glass-panel settings-card">
                <h3>Duraciones de Bloques (Minutos)</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    rememberStore.updateUserSettings({
                      lunaDuration: parseInt(setLunaDur) || 30,
                      terraDuration: parseInt(setTerraDur) || 45,
                      solDuration: parseInt(setSolDur) || 90,
                      astraDuration: parseInt(setAstraDur) || 20
                    });
                    alert('¡Duraciones actualizadas!');
                  }}
                >
                  <div className="form-group">
                    <label>Duración Luna (Minutos)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={setLunaDur}
                      onChange={e => setSetLunaDur(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Duración Terra (Minutos)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={setTerraDur}
                      onChange={e => setSetTerraDur(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Duración Sol (Minutos)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={setSolDur}
                      onChange={e => setSetSolDur(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Duración Astra (Minutos)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={setAstraDur}
                      onChange={e => setSetAstraDur(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary margin-top-lg">Guardar Duraciones</button>
                </form>
              </div>

              {/* Form Formula */}
              <div className="glass-panel settings-card">
                <h3>Fórmula de Score Cognitivo</h3>
                <span className="subtitle" style={{ display: 'block', marginBottom: '12px' }}>
                  Variables válidas: <code>hours</code>, <code>priorityWeight</code>, <code>priority</code>, <code>daysRemaining</code>, <code>diffDays</code>, <code>focusLocked</code>, <code>daysSinceProgress</code>.
                </span>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const validation = ScoreEngine.validateFormula(setFormula);
                    if (validation.isValid) {
                      rememberStore.updateUserSettings({ scoreFormula: setFormula });
                      setFormulaValidationMsg({ type: 'success', text: '✓ Fórmula guardada y validada con éxito.' });
                    } else {
                      setFormulaValidationMsg({ type: 'error', text: `✗ Error: ${validation.error}` });
                    }
                  }}
                >
                  <div className="form-group">
                    <label>Fórmula matemática</label>
                    <input
                      type="text"
                      className="form-control"
                      value={setFormula}
                      onChange={e => setSetFormula(e.target.value)}
                    />
                    {formulaValidationMsg.type && (
                      <span className={`validation-msg ${formulaValidationMsg.type}`}>
                        {formulaValidationMsg.text}
                      </span>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary">Guardar Fórmula</button>
                </form>

                <h3 style={{ marginTop: '24px' }}>Preferencias de Ritmo y Secuencias</h3>
                <span className="subtitle" style={{ display: 'block', marginBottom: '12px' }}>
                  Organiza el orden ideal arrastrando las filas (doble click para mover rápido).
                </span>
                <div className="draggable-list">
                  {db.userSettings.preferredOrderEnergy?.map((energy, idx) => (
                    <div
                      key={energy}
                      className="draggable-item"
                      onDoubleClick={() => {
                        const to = idx === 0 ? db.userSettings.preferredOrderEnergy!.length - 1 : idx - 1;
                        handleDragEnergy(idx, to);
                      }}
                    >
                      <span className="draggable-item-text">{idx + 1}. {energy}</span>
                      <span className="draggable-handle">☰</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => { if (window.confirm('¿Restablecer base de datos a semilla inicial?')) rememberStore.resetToSeed(); }}>
                    Restablecer valores de prueba
                  </button>
                  <button className="btn btn-danger" onClick={() => { if (window.confirm('¿Borrar TODO permanentemente?')) rememberStore.clearAll(); }}>
                    Vaciar Base de Datos
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 10. LISTS TAB */}
          <section className={`tab-pane ${currentTab === 'lists' ? 'active' : ''}`} id="tab-lists">
            <div className="lists-tab-container">
              <div className="section-header">
                <div className="section-title-group">
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Listas de Recordatorios</h2>
                  <span className="section-subtitle">Gestiona tus listas, sublistas y notas adjuntas</span>
                </div>
              </div>

              {/* Create List form */}
              <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Nueva Lista Principal</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (newListName.trim()) {
                    rememberStore.addList(newListName);
                    setNewListName('');
                  }
                }} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nombre de la lista..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary">Crear Lista</button>
                </form>
              </div>

              {/* Lists Forest */}
              <div className="lists-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {(() => {
                  const rootLists = (db.lists || []).filter((l: any) => !l.parentId);
                  if (rootLists.length === 0) {
                    return (
                      <div className="slot-empty-msg" style={{ padding: '40px', textAlign: 'center' }}>
                        No hay listas creadas aún. Crea una arriba para empezar.
                      </div>
                    );
                  }

                  return rootLists.map((list: any) => {
                    const sublists = (db.lists || []).filter((l: any) => l.parentId === list.id);
                    const isEditingList = editingListId === list.id;

                    return (
                      <div key={list.id} className="glass-panel list-group-panel" style={{ padding: '16px' }}>
                        {/* List Header */}
                        <div className="list-group-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span style={{ cursor: 'pointer', fontSize: '1.1rem', userSelect: 'none' }} onClick={() => rememberStore.toggleListCollapse(list.id)}>
                              {list.collapsed ? '▶' : '▼'}
                            </span>
                            {isEditingList ? (
                              <form onSubmit={(e) => {
                                e.preventDefault();
                                if (editingListName.trim()) {
                                  rememberStore.updateList(list.id, editingListName);
                                  setEditingListId(null);
                                }
                              }} style={{ display: 'flex', gap: '6px', flex: 1 }}>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={editingListName}
                                  onChange={(e) => setEditingListName(e.target.value)}
                                  style={{ fontSize: '1rem', padding: '4px 8px' }}
                                  autoFocus
                                />
                                <button type="submit" className="btn btn-success" style={{ padding: '4px 8px' }}>✓</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setEditingListId(null)} style={{ padding: '4px 8px' }}>&times;</button>
                              </form>
                            ) : (
                              <span style={{ fontSize: '1.15rem', fontWeight: 800, cursor: 'pointer' }} onDoubleClick={() => {
                                setEditingListId(list.id);
                                setEditingListName(list.name);
                              }}>
                                {list.name}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => {
                              const subName = window.prompt(`Nombre de la sublista para "${list.name}":`);
                              if (subName && subName.trim()) {
                                rememberStore.addList(subName, list.id);
                              }
                            }}>
                              + Sublista
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => {
                              setEditingListId(list.id);
                              setEditingListName(list.name);
                            }}>
                              ✏️
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => {
                              if (window.confirm(`¿Seguro que deseas eliminar la lista "${list.name}" y todos sus elementos?`)) {
                                rememberStore.deleteList(list.id);
                              }
                            }}>
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* List Content */}
                        {!list.collapsed && (
                          <div className="list-group-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* List Items */}
                            <div className="list-items-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {(list.items || []).map((item: any) => {
                                const isEditingItem = editingListItemId === item.id && editingListIdForItem === list.id;

                                if (isEditingItem) {
                                  return (
                                    <div key={item.id} className="list-item-edit-box" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Título (opcional)..."
                                        value={editingItemTitle}
                                        onChange={(e) => setEditingItemTitle(e.target.value)}
                                        style={{ fontWeight: 'bold', fontSize: '1.05rem' }}
                                      />
                                      <textarea
                                        className="form-control"
                                        placeholder="Texto del elemento..."
                                        value={editingItemText}
                                        onChange={(e) => setEditingItemText(e.target.value)}
                                        rows={2}
                                      />
                                      
                                      {/* Attached images previews */}
                                      {editingItemImages.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                          {editingItemImages.map((img, idx) => (
                                            <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden' }}>
                                              <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                              <button
                                                type="button"
                                                onClick={() => setEditingItemImages(prev => prev.filter((_, i) => i !== idx))}
                                                style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                              >
                                                &times;
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                                          📷 Adjuntar
                                          <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleImageUpload(e, (base64s) => {
                                              setEditingItemImages(prev => [...prev, ...base64s]);
                                            })}
                                          />
                                        </label>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                          <button className="btn btn-success btn-sm" onClick={() => {
                                            rememberStore.updateListItem(list.id, item.id, editingItemText, undefined, editingItemImages, editingItemTitle);
                                            setEditingListItemId(null);
                                            setEditingListIdForItem(null);
                                          }}>
                                            Guardar
                                          </button>
                                          <button className="btn btn-secondary btn-sm" onClick={() => {
                                            setEditingListItemId(null);
                                            setEditingListIdForItem(null);
                                          }}>
                                            Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div key={item.id} className="list-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flex: 1 }}>
                                      <input
                                        type="checkbox"
                                        checked={!!item.completed}
                                        onChange={() => rememberStore.toggleListItemCompleted(list.id, item.id)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '3px' }}
                                      />
                                      <div style={{ flex: 1 }}>
                                        {item.title && (
                                          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff', textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1, marginBottom: '4px' }}>
                                            {item.title}
                                          </div>
                                        )}
                                        <RichText
                                          text={item.text}
                                          images={item.images}
                                          onImageClick={setZoomedImage}
                                          style={{ textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1, fontSize: '1rem', lineHeight: '1.4' }}
                                        />
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', marginLeft: '10px' }}>
                                      <button className="btn btn-secondary btn-sm" onClick={() => {
                                        setEditingListItemId(item.id);
                                        setEditingListIdForItem(list.id);
                                        setEditingItemTitle(item.title || '');
                                        setEditingItemText(item.text || '');
                                        setEditingItemImages(item.images || []);
                                      }}>
                                        ✏️
                                      </button>
                                      <button className="btn btn-danger btn-sm" onClick={() => rememberStore.deleteListItem(list.id, item.id)}>
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Add Item form */}
                            <div className="add-item-form-box" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Título (opcional)..."
                                value={newItemTitles[list.id] || ''}
                                onChange={(e) => {
                                  const txt = e.target.value;
                                  setNewItemTitles(prev => ({ ...prev, [list.id]: txt }));
                                }}
                                style={{ fontWeight: 'bold', fontSize: '1.05rem' }}
                              />
                              <textarea
                                className="form-control"
                                placeholder="Añadir elemento..."
                                value={newItemTexts[list.id] || ''}
                                onChange={(e) => {
                                  const txt = e.target.value;
                                  setNewItemTexts(prev => ({ ...prev, [list.id]: txt }));
                                }}
                                rows={2}
                              />

                              {/* Attached images previews */}
                              {newItemImages[list.id] && newItemImages[list.id].length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {newItemImages[list.id].map((img, idx) => (
                                    <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden' }}>
                                      <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewItemImages(prev => ({
                                            ...prev,
                                            [list.id]: prev[list.id].filter((_, i) => i !== idx)
                                          }));
                                        }}
                                        style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                      >
                                        &times;
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                                  📷 Adjuntar Imágenes
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    style={{ display: 'none' }}
                                    onChange={(e) => handleImageUpload(e, (base64s) => {
                                      setNewItemImages(prev => ({
                                        ...prev,
                                        [list.id]: [...(prev[list.id] || []), ...base64s]
                                      }));
                                    })}
                                  />
                                </label>
                                <button className="btn btn-primary btn-sm" onClick={() => {
                                  const txt = newItemTexts[list.id] || '';
                                  if (txt.trim()) {
                                    rememberStore.addListItem(
                                      list.id,
                                      txt,
                                      undefined,
                                      newItemImages[list.id] || [],
                                      newItemTitles[list.id] || ''
                                    );
                                    setNewItemTexts(prev => ({ ...prev, [list.id]: '' }));
                                    setNewItemTitles(prev => ({ ...prev, [list.id]: '' }));
                                    setNewItemImages(prev => ({ ...prev, [list.id]: [] }));
                                  }
                                }}>
                                  Agregar Elemento
                                </button>
                              </div>
                            </div>

                            {/* Sublists */}
                            {sublists.length > 0 && (
                              <div className="sublists-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '24px', borderLeft: '2px solid rgba(255,255,255,0.05)' }}>
                                {sublists.map((sublist: any) => {
                                  const isEditingSublist = editingListId === sublist.id;

                                  return (
                                    <div key={sublist.id} className="sublist-group" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '8px', padding: '12px' }}>
                                      {/* Sublist Header */}
                                      <div className="sublist-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                          <span style={{ cursor: 'pointer', fontSize: '0.9rem', userSelect: 'none' }} onClick={() => rememberStore.toggleListCollapse(sublist.id)}>
                                            {sublist.collapsed ? '▶' : '▼'}
                                          </span>
                                          {isEditingSublist ? (
                                            <form onSubmit={(e) => {
                                              e.preventDefault();
                                              if (editingListName.trim()) {
                                                rememberStore.updateList(sublist.id, editingListName);
                                                setEditingListId(null);
                                              }
                                            }} style={{ display: 'flex', gap: '6px', flex: 1 }}>
                                              <input
                                                type="text"
                                                className="form-control"
                                                value={editingListName}
                                                onChange={(e) => setEditingListName(e.target.value)}
                                                style={{ fontSize: '0.9rem', padding: '2px 6px' }}
                                                autoFocus
                                              />
                                              <button type="submit" className="btn btn-success" style={{ padding: '2px 6px' }}>✓</button>
                                              <button type="button" className="btn btn-secondary" onClick={() => setEditingListId(null)} style={{ padding: '2px 6px' }}>&times;</button>
                                            </form>
                                          ) : (
                                            <span style={{ fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer' }} onDoubleClick={() => {
                                              setEditingListId(sublist.id);
                                              setEditingListName(sublist.name);
                                            }}>
                                              {sublist.name}
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                          <button className="btn btn-secondary btn-sm" onClick={() => {
                                            setEditingListId(sublist.id);
                                            setEditingListName(sublist.name);
                                          }} style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                                            ✏️
                                          </button>
                                          <button className="btn btn-danger btn-sm" onClick={() => {
                                            if (window.confirm(`¿Seguro que deseas eliminar la sublista "${sublist.name}"?`)) {
                                              rememberStore.deleteList(sublist.id);
                                            }
                                          }} style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                                            🗑️
                                          </button>
                                        </div>
                                      </div>

                                      {/* Sublist Content */}
                                      {!sublist.collapsed && (
                                        <div className="sublist-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                          {/* Sublist Items */}
                                          <div className="sublist-items-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {(sublist.items || []).map((item: any) => {
                                              const isEditingSubItem = editingListItemId === item.id && editingListIdForItem === sublist.id;

                                              if (isEditingSubItem) {
                                                return (
                                                  <div key={item.id} className="list-item-edit-box" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <input
                                                      type="text"
                                                      className="form-control"
                                                      placeholder="Título (opcional)..."
                                                      value={editingItemTitle}
                                                      onChange={(e) => setEditingItemTitle(e.target.value)}
                                                      style={{ fontWeight: 'bold', fontSize: '0.95rem' }}
                                                    />
                                                    <textarea
                                                      className="form-control"
                                                      placeholder="Texto del elemento..."
                                                      value={editingItemText}
                                                      onChange={(e) => setEditingItemText(e.target.value)}
                                                      rows={2}
                                                    />
                                                    
                                                    {/* Attached images previews */}
                                                    {editingItemImages.length > 0 && (
                                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                        {editingItemImages.map((img, idx) => (
                                                          <div key={idx} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden' }}>
                                                            <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            <button
                                                              type="button"
                                                              onClick={() => setEditingItemImages(prev => prev.filter((_, i) => i !== idx))}
                                                              style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                            >
                                                              &times;
                                                            </button>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )}

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', padding: '2px 6px', fontSize: '0.75rem' }}>
                                                        📷 Adjuntar
                                                        <input
                                                          type="file"
                                                          accept="image/*"
                                                          multiple
                                                          style={{ display: 'none' }}
                                                          onChange={(e) => handleImageUpload(e, (base64s) => {
                                                            setEditingItemImages(prev => [...prev, ...base64s]);
                                                          })}
                                                        />
                                                      </label>
                                                      <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button className="btn btn-success btn-sm" onClick={() => {
                                                          rememberStore.updateListItem(sublist.id, item.id, editingItemText, undefined, editingItemImages, editingItemTitle);
                                                          setEditingListItemId(null);
                                                          setEditingListIdForItem(null);
                                                        }} style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                                                          Guardar
                                                        </button>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => {
                                                          setEditingListItemId(null);
                                                          setEditingListIdForItem(null);
                                                        }} style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                                                          Cancelar
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              }

                                              return (
                                                <div key={item.id} className="list-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', padding: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flex: 1 }}>
                                                    <input
                                                      type="checkbox"
                                                      checked={!!item.completed}
                                                      onChange={() => rememberStore.toggleListItemCompleted(sublist.id, item.id)}
                                                      style={{ width: '16px', height: '16px', cursor: 'pointer', marginTop: '3px' }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                      {item.title && (
                                                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1, marginBottom: '4px' }}>
                                                          {item.title}
                                                        </div>
                                                      )}
                                                      <RichText
                                                        text={item.text}
                                                        images={item.images}
                                                        onImageClick={setZoomedImage}
                                                        style={{ textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1, fontSize: '0.95rem' }}
                                                      />
                                                    </div>
                                                  </div>
                                                  <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => {
                                                      setEditingListItemId(item.id);
                                                      setEditingListIdForItem(sublist.id);
                                                      setEditingItemTitle(item.title || '');
                                                      setEditingItemText(item.text || '');
                                                      setEditingItemImages(item.images || []);
                                                    }} style={{ padding: '2px 4px', fontSize: '0.7rem' }}>
                                                      ✏️
                                                    </button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => rememberStore.deleteListItem(sublist.id, item.id)} style={{ padding: '2px 4px', fontSize: '0.7rem' }}>
                                                      🗑️
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>

                                          {/* Add Sublist Item form */}
                                          <div className="add-item-form-box" style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <input
                                              type="text"
                                              className="form-control"
                                              placeholder="Título (opcional)..."
                                              value={newItemTitles[sublist.id] || ''}
                                              onChange={(e) => {
                                                const txt = e.target.value;
                                                setNewItemTitles(prev => ({ ...prev, [sublist.id]: txt }));
                                              }}
                                              style={{ fontWeight: 'bold', fontSize: '0.95rem', padding: '4px 8px' }}
                                            />
                                            <textarea
                                              className="form-control"
                                              placeholder="Añadir elemento..."
                                              value={newItemTexts[sublist.id] || ''}
                                              onChange={(e) => {
                                                const txt = e.target.value;
                                                setNewItemTexts(prev => ({ ...prev, [sublist.id]: txt }));
                                              }}
                                              rows={2}
                                              style={{ fontSize: '0.9rem', padding: '4px 8px' }}
                                            />

                                            {/* Attached images previews */}
                                            {newItemImages[sublist.id] && newItemImages[sublist.id].length > 0 && (
                                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {newItemImages[sublist.id].map((img, idx) => (
                                                  <div key={idx} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden' }}>
                                                    <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setNewItemImages(prev => ({
                                                          ...prev,
                                                          [sublist.id]: prev[sublist.id].filter((_, i) => i !== idx)
                                                        }));
                                                      }}
                                                      style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                    >
                                                      &times;
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', padding: '2px 6px', fontSize: '0.75rem' }}>
                                                📷 Adjuntar Imágenes
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  multiple
                                                  style={{ display: 'none' }}
                                                  onChange={(e) => handleImageUpload(e, (base64s) => {
                                                    setNewItemImages(prev => ({
                                                      ...prev,
                                                      [sublist.id]: [...(prev[sublist.id] || []), ...base64s]
                                                    }));
                                                  })}
                                                />
                                              </label>
                                              <button className="btn btn-primary btn-sm" onClick={() => {
                                                const txt = newItemTexts[sublist.id] || '';
                                                if (txt.trim()) {
                                                  rememberStore.addListItem(
                                                    sublist.id,
                                                    txt,
                                                    undefined,
                                                    newItemImages[sublist.id] || [],
                                                    newItemTitles[sublist.id] || ''
                                                  );
                                                  setNewItemTexts(prev => ({ ...prev, [sublist.id]: '' }));
                                                  setNewItemTitles(prev => ({ ...prev, [sublist.id]: '' }));
                                                  setNewItemImages(prev => ({ ...prev, [sublist.id]: [] }));
                                                }
                                              }} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                                                Agregar Elemento
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
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
                const list = db.sessions
                  .filter(s => s.taskId === selectedTaskId)
                  .sort((a, b) => new Date(b.endTime || 0).getTime() - new Date(a.endTime || 0).getTime());

                if (list.length === 0) {
                  return <div className="slot-empty-msg" style={{ textAlign: 'center', padding: '40px' }}>Esta tarea no tiene ninguna sesión de enfoque registrada.</div>;
                }

                return list.map(session => {
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
                });
              })()}
            </div>

            {/* New Note Form at bottom of Roadmap Modal */}
            <div className="roadmap-new-note-form" style={{ marginTop: '15px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px' }}>Nueva Nota de Tarea</h4>
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
                {editingItemId ? 'Editar Elemento' : 'Crear Nuevo Elemento'}
              </h3>
              <button className="modal-close" onClick={() => setShowEditorModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleEditorSubmit} id="editor-form">
              <div className="form-group">
                <label>Tipo de Elemento</label>
                <select
                  id="edit-type"
                  className="form-control"
                  value={editorType}
                  disabled={!!editingItemId}
                  onChange={e => setEditorType(e.target.value as ItemType)}
                >
                  <option value={ItemType.TASK}>Tarea (Cognitiva)</option>
                  <option value={ItemType.ACTIVITY}>Hábito / Ocio</option>
                  <option value={ItemType.REMINDER}>Recordatorio</option>
                  <option value={ItemType.MEMO}>Memo / Nota</option>
                  <option value={ItemType.PLAN}>Plan Largo Plazo</option>
                </select>
              </div>

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

              {editorType === ItemType.REMINDER && (
                <div id="editor-reminder-fields" className="editor-section">
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Fecha de Alerta</label>
                      <input
                        type="date"
                        id="edit-reminder-date"
                        className="form-control"
                        value={formReminderDate}
                        onChange={e => setFormReminderDate(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Hora</label>
                      <input
                        type="time"
                        id="edit-reminder-time"
                        className="form-control"
                        value={formReminderTime}
                        onChange={e => setFormReminderTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {editorType === ItemType.MEMO && (
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
