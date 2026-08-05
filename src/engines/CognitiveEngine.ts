import { Task, Reminder as ReminderV2, Session, UserSettings, HourWeight, Item, ItemType } from '../models/Item';
import { TimeSlot } from '../models/TimeSlot';
import { Recommendation } from '../models/Recommendation';
import { ContextEngine, CognitiveContext } from './ContextEngine';
import { FocusEngine } from './FocusEngine';
import { ScoreEngine, getTaskWeightLabel } from './ScoreEngine';
import { EnergyEngine } from './EnergyEngine';
import { TransitionEngine } from './TransitionEngine';
import { RecommendationEngine } from './RecommendationEngine';
import { SessionEngine } from './SessionEngine';

export const CognitiveEngine = {
  generateRecommendation(
    items: Item[],
    sessions: Session[],
    timeSlots: TimeSlot[],
    userSettings: UserSettings,
    hourWeights: HourWeight[],
    overrideCurrentTime?: string // format "HH:MM" for testing
  ): {
    recommendation: Recommendation;
    updatedFocusTasks: Task[];
  } {
    // 1. Reconstruct Cognitive Context
    const context = ContextEngine.calculateContext(
      items,
      sessions,
      timeSlots,
      userSettings,
      overrideCurrentTime
    );

    // 2. Check for active/critical Reminders
    if (context.activeReminders.length > 0) {
      const primaryReminder = context.activeReminders[0];
      
      const recommendation: Recommendation = {
        id: `rec-rem-${Math.random().toString(36).substring(7)}`,
        score: 1000, // Top priority score
        reason: `Recordatorio pendiente: "${primaryReminder.title}"`,
        reasonsSecondary: [
          `Se ha interrumpido el flujo habitual para atender este recordatorio activo.`,
          `Tienes ${context.activeReminders.length} recordatorio(s) en total esperando tu atención.`
        ],
        recommendedDuration: 0, // Reminders are quick attentions, no timer needed
        generatedAt: new Date().toISOString(),
        priorityLevel: 'ALTA',
        confidenceLevel: 100,
        sessionType: 'COMPLETAR',
        actionSuggested: 'Atiende este recordatorio ahora',
        alternatives: []
      };

      return {
        recommendation,
        updatedFocusTasks: context.focusTasks
      };
    }

    // 3. Update Focus Tasks using FocusEngine
    const tasks = items.filter(i => i.type === ItemType.TASK && !i.trash) as Task[];
    const updatedFocusTasks = FocusEngine.calculateFocusTasks(
      tasks,
      hourWeights,
      userSettings.maxFocusTasks
    );

    // 4. Select the best recommendation and alternatives using RecommendationEngine
    const lastCompletedTask = context.lastCompletedTaskId 
      ? tasks.find(t => t.id === context.lastCompletedTaskId) 
      : undefined;

    const lastCompletedEnergy = lastCompletedTask?.energyType;
    const lastCompletedWeight = lastCompletedTask 
      ? getTaskWeightLabel(lastCompletedTask.estimatedHours, hourWeights) 
      : undefined;

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

    // 5. If no task is available
    if (!selectedTask) {
      const recommendation: Recommendation = {
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

      return {
        recommendation,
        updatedFocusTasks
      };
    }

    // 6. Calculate Session details
    const sessionDetails = SessionEngine.calculateSession(
      selectedTask,
      context.availableTime,
      userSettings,
      hourWeights
    );

    // 7. Calculate adjustments & details for the recommendation object
    const baseScore = ScoreEngine.calculateScore(selectedTask, hourWeights);
    const energyPenalty = EnergyEngine.calculatePenalty(selectedTask.energyType, context.recentEnergyTypes);
    const transitionBonus = TransitionEngine.calculateTransitionBonus(
      selectedTask,
      lastCompletedEnergy,
      lastCompletedWeight,
      userSettings,
      hourWeights
    );

    // Calculate Confidence Level
    let confidence = 100;
    // - Subtract for time capping
    const taskWeightLabel = getTaskWeightLabel(selectedTask.estimatedHours, hourWeights).toLowerCase();
    const standardDuration = taskWeightLabel === 'sol' ? 90 : (taskWeightLabel === 'terra' ? 45 : 30);
    if (sessionDetails.duration < standardDuration) {
      confidence -= 20;
    }
    // - Subtract for energy fatigue
    if (energyPenalty > 0) {
      confidence -= Math.round(energyPenalty * 100);
    }
    // - Subtract if recommended task is in cooldown
    if (selectedTask.recommendationCooldown && new Date(selectedTask.recommendationCooldown) > new Date()) {
      confidence -= 40;
    }
    // Clip
    confidence = Math.max(10, Math.min(100, confidence));

    // Map priority level
    let priorityLevel: 'ALTA' | 'MEDIA' | 'BAJA' = 'MEDIA';
    if (selectedTask.priority === 'high') {
      priorityLevel = 'ALTA';
    } else if (selectedTask.priority === 'low') {
      priorityLevel = 'BAJA';
    }

    // Secondary Reasons explanations
    const reasonsSecondary: string[] = [];
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

    const recommendation: Recommendation = {
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

    return {
      recommendation,
      updatedFocusTasks
    };
  }
};
