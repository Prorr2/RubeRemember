import { Task, EnergyType, UserSettings, HourWeight, Item, ItemType, Priority, TaskState, TimeSlot, Session, Recommendation } from './types';

export function getTaskWeightLabel(estimatedHours: number | undefined, hourWeights: HourWeight[]): string {
  if (estimatedHours === undefined || estimatedHours === null || estimatedHours <= 0) {
    return 'luna';
  }
  const sorted = [...(hourWeights || [])].sort((a, b) => b.minHours - a.minHours);
  for (const w of sorted) {
    if (estimatedHours >= w.minHours) {
      const lowerId = w.id.toLowerCase();
      const lowerName = (w.name || '').toLowerCase();
      if (lowerId.includes('luna') || lowerName.includes('luna')) return 'luna';
      if (lowerId.includes('terra') || lowerName.includes('terra')) return 'terra';
      if (lowerId.includes('sol') || lowerName.includes('sol')) return 'sol';
      if (lowerId.includes('astra') || lowerName.includes('astra')) return 'astra';
      return lowerId;
    }
  }
  return 'luna';
}

export const ScoreEngine = {
  validateFormula(formulaStr: string): { isValid: boolean; error?: string } {
    if (!formulaStr.trim()) {
      return { isValid: false, error: 'La fórmula no puede estar vacía.' };
    }
    const allowedVars = ['hours', 'priorityWeight', 'priority', 'daysRemaining', 'diffDays', 'focusLocked', 'daysSinceProgress'];
    let formulaJs = formulaStr.replace(/\^/g, '**');
    let testStr = formulaJs;
    for (const v of allowedVars) {
      testStr = testStr.replace(new RegExp('\\b' + v + '\\b', 'g'), '1');
    }
    testStr = testStr.replace(/\s+/g, '');
    const invalidCharRegex = /[^\d.+\-*/%()]/;
    let finalTestStr = testStr.replace(/\*\*/g, '*');
    if (invalidCharRegex.test(finalTestStr)) {
      return { isValid: false, error: 'La fórmula contiene caracteres o variables no válidos.' };
    }
    try {
      const evaluator = new Function(`return ${testStr}`);
      const result = evaluator();
      if (typeof result !== 'number' || isNaN(result)) {
        return { isValid: false, error: 'La fórmula no devuelve un número válido.' };
      }
    } catch (e: any) {
      return { isValid: false, error: 'Sintaxis de fórmula no válida: ' + e.message };
    }
    return { isValid: true };
  },

  evaluateCustomFormula(formulaStr: string, variables: Record<string, number>): number {
    let formulaJs = formulaStr.replace(/\^/g, '**');
    try {
      const varKeys = Object.keys(variables);
      const varValues = Object.values(variables);
      const evaluator = new Function(...varKeys, `return ${formulaJs}`);
      const res = evaluator(...varValues);
      return typeof res === 'number' && !isNaN(res) ? res : 0;
    } catch (e) {
      console.warn('Error evaluating custom score formula:', e);
      return 0;
    }
  },

  calculateScore(task: Task, _hourWeights: HourWeight[], customFormula?: string): number {
    if (task.completed || task.taskState === TaskState.COMPLETED) {
      return -9999;
    }
    let priorityWeight = 10;
    let priorityVal = 1;
    if (task.priority === Priority.URGENT) {
      priorityWeight = 100;
      priorityVal = 4;
    } else if (task.priority === Priority.HIGH) {
      priorityWeight = 60;
      priorityVal = 3;
    } else if (task.priority === Priority.MEDIUM) {
      priorityWeight = 30;
      priorityVal = 2;
    }

    const hours = (task.estimatedHours !== undefined && task.estimatedHours > 0) ? task.estimatedHours : 1;
    let daysRemaining = 0.5;
    let diffDays = 0;
    if (task.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffTime = due.getTime() - today.getTime();
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        daysRemaining = 0.2;
      } else if (diffDays === 0) {
        daysRemaining = 0.5;
      } else {
        daysRemaining = diffDays;
      }
    }

    const focusLocked = task.focusLocked ? 1 : 0;
    const lastProgressStr = task.lastProgress || task.updatedAt || task.createdAt;
    const lastProgressDate = new Date(lastProgressStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastProgressDate.getTime());
    const daysSinceProgress = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const formulaToUse = customFormula || '((hours * (priorityWeight * priorityWeight)) / daysRemaining) / 1000';
    const variables = {
      hours,
      priorityWeight,
      priority: priorityVal,
      daysRemaining,
      diffDays,
      focusLocked,
      daysSinceProgress
    };

    const evaluated = this.evaluateCustomFormula(formulaToUse, variables);
    return Math.round(evaluated);
  }
};

export const EnergyEngine = {
  calculatePenalty(energyType: EnergyType | undefined, recentEnergyTypes: EnergyType[]): number {
    if (!energyType || recentEnergyTypes.length === 0) {
      return 0;
    }
    let consecutiveMatches = 0;
    for (const type of recentEnergyTypes) {
      if (type === energyType) {
        consecutiveMatches++;
      } else {
        break;
      }
    }
    if (consecutiveMatches === 1) return 0.15;
    if (consecutiveMatches === 2) return 0.35;
    if (consecutiveMatches >= 3) return 0.60;
    return 0;
  },

  applyEnergyAdjustment(score: number, penalty: number): number {
    if (score <= 0) return score;
    return Math.round(score * (1 - penalty));
  }
};

export const TransitionEngine = {
  calculateTransitionBonus(
    task: Task,
    lastCompletedEnergy: EnergyType | undefined,
    lastCompletedWeightLabel: string | undefined,
    userSettings: UserSettings,
    hourWeights: HourWeight[]
  ): number {
    let bonus = 0;
    if (lastCompletedEnergy && userSettings.preferredOrderEnergy && userSettings.preferredOrderEnergy.length > 0) {
      const order = userSettings.preferredOrderEnergy;
      const lastIndex = order.indexOf(lastCompletedEnergy);
      if (lastIndex >= 0) {
        const nextIndex = (lastIndex + 1) % order.length;
        const preferredNextEnergy = order[nextIndex];
        if (task.energyType === preferredNextEnergy) {
          bonus += 10;
        }
      }
    }
    if (lastCompletedWeightLabel && userSettings.preferredOrderWeight && userSettings.preferredOrderWeight.length > 0) {
      const order = userSettings.preferredOrderWeight.map(w => w.toLowerCase());
      const lastIndex = order.indexOf(lastCompletedWeightLabel.toLowerCase());
      if (lastIndex >= 0) {
        const nextIndex = (lastIndex + 1) % order.length;
        const preferredNextWeight = order[nextIndex];
        const taskWeightLabel = getTaskWeightLabel(task.estimatedHours, hourWeights).toLowerCase();
        if (taskWeightLabel === preferredNextWeight) {
          bonus += 5;
        }
      }
    }
    return bonus;
  }
};

export const RecommendationEngine = {
  selectRecommendation(
    tasks: Task[],
    availableTime: number,
    recentEnergyTypes: EnergyType[],
    lastCompletedEnergy: EnergyType | undefined,
    lastCompletedWeight: string | undefined,
    lastCompletedTaskId: string | undefined,
    userSettings: UserSettings,
    hourWeights: HourWeight[]
  ): { selected?: Task & { finalScore: number; baseScore: number; energyPenalty: number; transitionBonus: number }; alternatives: Task[] } {
    const eligibleTasks = tasks.filter(t =>
      !t.completed &&
      !t.archived &&
      !t.trash &&
      t.taskState !== TaskState.BLOCKED &&
      t.taskState !== TaskState.WAITING
    );

    if (eligibleTasks.length === 0) {
      return { alternatives: [] };
    }

    const now = new Date();
    const nonCooldownTasks = eligibleTasks.filter(t => {
      if (!t.recommendationCooldown) return true;
      return new Date(t.recommendationCooldown) <= now;
    });

    const activePool = nonCooldownTasks.length > 0 ? nonCooldownTasks : eligibleTasks;

    const candidates = activePool.map(t => {
      const baseScore = ScoreEngine.calculateScore(t, hourWeights, userSettings.scoreFormula);
      const energyPenalty = EnergyEngine.calculatePenalty(t.energyType, recentEnergyTypes);
      const adjustedScore = EnergyEngine.applyEnergyAdjustment(baseScore, energyPenalty);
      const transitionBonus = TransitionEngine.calculateTransitionBonus(
        t,
        lastCompletedEnergy,
        lastCompletedWeight,
        userSettings,
        hourWeights
      );
      const finalScore = adjustedScore + transitionBonus;

      return {
        ...t,
        baseScore,
        energyPenalty,
        adjustedScore,
        transitionBonus,
        finalScore
      };
    });

    const urgentFocus = candidates.filter(c => c.focusLocked && (c.priority === Priority.HIGH || c.priority === Priority.URGENT));
    const normalFocus = candidates.filter(c => c.focusLocked && c.priority !== Priority.HIGH && c.priority !== Priority.URGENT);
    const standardTasks = candidates.filter(c => !c.focusLocked);

    const tieBreakerComparator = (a: any, b: any) => {
      if (Math.abs(a.finalScore - b.finalScore) > 0.01) {
        return b.finalScore - a.finalScore;
      }
      const aWeight = getTaskWeightLabel(a.estimatedHours, hourWeights).toLowerCase();
      const bWeight = getTaskWeightLabel(b.estimatedHours, hourWeights).toLowerCase();
      const aStandardDuration = aWeight === 'astra' ? 120 : (aWeight === 'sol' ? 90 : (aWeight === 'terra' ? 45 : 30));
      const bStandardDuration = bWeight === 'astra' ? 120 : (bWeight === 'sol' ? 90 : (bWeight === 'terra' ? 45 : 30));
      const aFits = aStandardDuration <= availableTime;
      const bFits = bStandardDuration <= availableTime;
      if (aFits !== bFits) {
        return aFits ? -1 : 1;
      }
      if (a.transitionBonus !== b.transitionBonus) {
        return b.transitionBonus - a.transitionBonus;
      }
      const aIsLast = a.id === lastCompletedTaskId;
      const bIsLast = b.id === lastCompletedTaskId;
      if (aIsLast !== bIsLast) {
        return aIsLast ? -1 : 1;
      }
      const getDaysTimestamp = (t: any) => {
        const d = new Date(t.lastProgress || t.updatedAt || t.createdAt);
        return d.getTime();
      };
      const aTime = getDaysTimestamp(a);
      const bTime = getDaysTimestamp(b);
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return 0;
    };

    urgentFocus.sort(tieBreakerComparator);
    normalFocus.sort(tieBreakerComparator);
    standardTasks.sort(tieBreakerComparator);

    const sortedPool = [...urgentFocus, ...normalFocus, ...standardTasks];
    const selected = sortedPool[0];
    const alternatives = sortedPool.slice(1, 4) as Task[];

    return { selected, alternatives };
  }
};

export const ContextEngine = {
  calculateContext(
    items: Item[],
    sessions: Session[],
    timeSlots: TimeSlot[],
    userSettings: UserSettings,
    overrideCurrentTime?: string
  ) {
    const now = new Date();
    let currentTime = overrideCurrentTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dayOfWeek = now.getDay();
    const [currentH, currentM] = currentTime.split(':').map(Number);
    const currentTotalMinutes = currentH * 60 + currentM;

    let activeTimeSlot = undefined;
    let availableTime = userSettings.lunaDuration || 30;

    for (const slot of timeSlots) {
      const [startH, startM] = slot.startTime.split(':').map(Number);
      const [endH, endM] = slot.endTime.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      if (currentTotalMinutes >= startTotal && currentTotalMinutes < endTotal) {
        activeTimeSlot = slot;
        availableTime = endTotal - currentTotalMinutes;
        break;
      }
    }

    const todayStr = now.toISOString().split('T')[0];
    const activeReminders = items.filter(i => {
      if (i.type !== ItemType.REMINDER || i.completed || i.archived || i.trash) return false;
      const rem = i as any;
      if (!rem.remindAt) return false;
      const hasTodayOrPastDate = rem.remindAt.dates.some((dateStr: string) => dateStr <= todayStr);
      if (!hasTodayOrPastDate) return false;
      if (rem.remindAt.time) {
        const [remH, remM] = rem.remindAt.time.split(':').map(Number);
        const remTotal = remH * 60 + remM;
        const isPastOrEqualTime = rem.remindAt.dates.includes(todayStr) ? currentTotalMinutes >= remTotal : true;
        return isPastOrEqualTime;
      }
      return true;
    }) as any[];

    const focusTasks = items.filter(i => i.type === ItemType.TASK && (i as Task).focusLocked && !i.completed && !i.archived && !i.trash) as Task[];

    const completedSessions = [...sessions]
      .filter(s => s.completed && s.endTime)
      .sort((a, b) => new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime());

    const recentEnergyTypes: EnergyType[] = [];
    let lastCompletedTaskId = undefined;

    if (completedSessions.length > 0) {
      lastCompletedTaskId = completedSessions[0].taskId;
      for (const s of completedSessions.slice(0, 3)) {
        const task = items.find(i => i.id === s.taskId && i.type === ItemType.TASK) as Task;
        if (task && task.energyType) {
          recentEnergyTypes.push(task.energyType);
        }
      }
    }

    return {
      currentTime,
      dayOfWeek,
      availableTime,
      activeTimeSlot,
      lastCompletedTaskId,
      recentEnergyTypes,
      activeReminders,
      userSettings,
      focusTasks
    };
  }
};

export const FocusEngine = {
  calculateFocusTasks(tasks: Task[], hourWeights: HourWeight[], maxFocus: number, scoreFormula?: string): Task[] {
    const eligibleTasks = tasks.filter(t =>
      !t.completed &&
      !t.archived &&
      !t.trash &&
      t.taskState !== TaskState.BLOCKED &&
      t.taskState !== TaskState.WAITING
    );

    const scoredTasks = eligibleTasks.map(t => ({
      task: t,
      score: ScoreEngine.calculateScore(t, hourWeights, scoreFormula)
    }));

    scoredTasks.sort((a, b) => b.score - a.score || b.task.createdAt.localeCompare(a.task.createdAt));

    const updatedTasks = tasks.map(t => {
      const isEligible = !t.completed && !t.archived && !t.trash && t.taskState !== TaskState.BLOCKED && t.taskState !== TaskState.WAITING;
      if (!isEligible) {
        return { ...t, focusLocked: false };
      }
      const eligibleRank = scoredTasks.findIndex(item => item.task.id === t.id);
      const shouldBeFocused = eligibleRank !== -1 && eligibleRank < maxFocus;
      return { ...t, focusLocked: shouldBeFocused };
    });

    return updatedTasks;
  }
};

export const SessionEngine = {
  calculateSession(task: Task, availableTime: number, userSettings: UserSettings, hourWeights: HourWeight[]) {
    const weightLabel = getTaskWeightLabel(task.estimatedHours, hourWeights).toLowerCase();

    if (weightLabel === 'terra') {
      return {
        duration: Math.min(availableTime, userSettings.terraDuration || 45),
        objective: 'AVANZAR',
        message: 'Progreso incremental. Concéntrate en mantener el foco sin la presión de terminar.',
        suggestedActionText: 'Avanza un paso'
      };
    } else if (weightLabel === 'sol') {
      return {
        duration: Math.min(availableTime, userSettings.solDuration || 90),
        objective: 'SIGUIENTE_PASO',
        message: 'Planifica y ataca el siguiente hito concreto de esta tarea.',
        suggestedActionText: 'Define y ejecuta tu siguiente paso'
      };
    } else if (weightLabel === 'astra') {
      return {
        duration: Math.min(availableTime, userSettings.astraDuration || 20),
        objective: 'HABITO',
        message: 'Lo importante es la constancia. Dedica unos minutos para no romper la racha.',
        suggestedActionText: 'Mantén la racha'
      };
    } else {
      return {
        duration: Math.min(availableTime, userSettings.lunaDuration || 30),
        objective: 'COMPLETAR',
        message: 'Puedes quitártela de encima ahora mismo. ¡Hazlo rápido!',
        suggestedActionText: 'Termina esta tarea'
      };
    }
  }
};

export const CognitiveEngine = {
  generateRecommendation(
    items: Item[],
    sessions: Session[],
    timeSlots: TimeSlot[],
    userSettings: UserSettings,
    hourWeights: HourWeight[],
    overrideCurrentTime?: string
  ): { recommendation: Recommendation; updatedFocusTasks: Task[] } {
    const context = ContextEngine.calculateContext(items, sessions, timeSlots, userSettings, overrideCurrentTime);
    const tasks = items.filter(i => i.type === ItemType.TASK && !i.trash) as Task[];
    const updatedFocusTasks = FocusEngine.calculateFocusTasks(tasks, hourWeights, userSettings.maxFocusTasks, userSettings.scoreFormula);

    if (context.activeReminders.length > 0) {
      const primaryReminder = context.activeReminders[0];
      const rec: Recommendation = {
        id: `rec-rem-${Math.random().toString(36).substring(7)}`,
        taskId: primaryReminder.id,
        score: 1000,
        reason: `Recordatorio pendiente: "${primaryReminder.title}"`,
        reasonsSecondary: [
          `Se ha interrumpido el flujo habitual para atender este recordatorio activo.`,
          `Tienes ${context.activeReminders.length} recordatorio(s) en total esperando tu atención.`
        ],
        recommendedDuration: 0,
        generatedAt: new Date().toISOString(),
        priorityLevel: 'ALTA',
        confidenceLevel: 100,
        sessionType: 'COMPLETAR',
        actionSuggested: 'Atiende este recordatorio ahora',
        alternatives: []
      };
      return { recommendation: rec, updatedFocusTasks };
    }

    const lastCompletedTask = context.lastCompletedTaskId ? tasks.find(t => t.id === context.lastCompletedTaskId) : undefined;
    const lastCompletedEnergy = lastCompletedTask?.energyType;
    const lastCompletedWeight = lastCompletedTask ? getTaskWeightLabel(lastCompletedTask.estimatedHours, hourWeights) : undefined;

    const recResult = RecommendationEngine.selectRecommendation(
      tasks,
      context.availableTime,
      context.recentEnergyTypes,
      lastCompletedEnergy,
      lastCompletedWeight,
      context.lastCompletedTaskId,
      userSettings,
      hourWeights
    );

    const selectedTask = recResult.selected;

    if (!selectedTask) {
      const rec: Recommendation = {
        id: `rec-empty-${Math.random().toString(36).substring(7)}`,
        score: 0,
        reason: 'No hay tareas pendientes en este momento.',
        reasonsSecondary: [
          'Todas tus tareas están completadas, bloqueadas, esperando o en periodo de enfriamiento.',
          'Considera planificar nuevas tareas o realizar una actividad de ocio.'
        ],
        recommendedDuration: userSettings.lunaDuration || 30,
        generatedAt: new Date().toISOString(),
        priorityLevel: 'BAJA',
        confidenceLevel: 100,
        sessionType: 'MANTENER',
        actionSuggested: 'Tómate un descanso o vacía la bandeja de entrada',
        alternatives: []
      };
      return { recommendation: rec, updatedFocusTasks };
    }

    const sessionDetails = SessionEngine.calculateSession(selectedTask, context.availableTime, userSettings, hourWeights);
    const baseScore = ScoreEngine.calculateScore(selectedTask, hourWeights, userSettings.scoreFormula);
    const energyPenalty = EnergyEngine.calculatePenalty(selectedTask.energyType, context.recentEnergyTypes);
    const transitionBonus = TransitionEngine.calculateTransitionBonus(
      selectedTask,
      lastCompletedEnergy,
      lastCompletedWeight,
      userSettings,
      hourWeights
    );

    let confidence = 100;
    const taskWeightLabel = getTaskWeightLabel(selectedTask.estimatedHours, hourWeights).toLowerCase();
    const standardDuration = taskWeightLabel === 'sol' ? 90 : (taskWeightLabel === 'terra' ? 45 : 30);
    if (sessionDetails.duration < standardDuration) {
      confidence -= 20;
    }
    if (energyPenalty > 0) {
      confidence -= Math.round(energyPenalty * 100);
    }
    if (selectedTask.recommendationCooldown && new Date(selectedTask.recommendationCooldown) > new Date()) {
      confidence -= 40;
    }
    confidence = Math.max(10, Math.min(100, confidence));

    let priorityLevel = 'MEDIA';
    if (selectedTask.priority === Priority.URGENT) priorityLevel = 'URGENTE';
    else if (selectedTask.priority === Priority.HIGH) priorityLevel = 'ALTA';
    else if (selectedTask.priority === Priority.LOW) priorityLevel = 'BAJA';

    const reasonsSecondary = [];
    if (selectedTask.focusLocked) {
      reasonsSecondary.push('Esta tarea forma parte de tus objetivos seleccionados (Focus Tasks).');
    }
    if (energyPenalty > 0) {
      reasonsSecondary.push(`Recientemente has realizado tareas con esfuerzo similar. Se aplica un ajuste del -${Math.round(energyPenalty * 100)}% por fatiga.`);
    }
    if (transitionBonus > 0) {
      reasonsSecondary.push('Esta tarea encaja óptimamente con tu ritmo e historial de trabajo configurado.');
    }
    if (sessionDetails.duration < standardDuration) {
      reasonsSecondary.push(`La sesión se ha acortado a ${sessionDetails.duration} minutos para ajustarse al tiempo disponible.`);
    }

    const rec: Recommendation = {
      id: `rec-${Math.random().toString(36).substring(7)}`,
      taskId: selectedTask.id,
      score: baseScore + transitionBonus,
      reason: sessionDetails.message,
      reasonsSecondary: reasonsSecondary.length > 0 ? reasonsSecondary : undefined,
      recommendedDuration: sessionDetails.duration,
      generatedAt: new Date().toISOString(),
      priorityLevel,
      energyAdjustment: energyPenalty > 0 ? -Math.round(energyPenalty * 100) : undefined,
      transitionAdjustment: transitionBonus > 0 ? transitionBonus : undefined,
      confidenceLevel: confidence,
      sessionType: sessionDetails.objective,
      actionSuggested: sessionDetails.suggestedActionText,
      alternatives: recResult.alternatives.map(alt => alt.id)
    };

    return { recommendation: rec, updatedFocusTasks };
  }
};
