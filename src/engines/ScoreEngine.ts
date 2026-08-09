import { Task, Priority, TaskState, HourWeight } from '../models/Item';

export function getTaskWeightLabel(estimatedHours: number | undefined, hourWeights: HourWeight[]): string {
  if (estimatedHours === undefined || estimatedHours === null || estimatedHours <= 0) {
    return 'luna';
  }
  const sorted = [...(hourWeights || [])].sort((a, b) => b.minHours - a.minHours);
  for (const w of sorted) {
    if (estimatedHours >= w.minHours) {
      const lowerId = w.id.toLowerCase();
      if (lowerId.includes('luna')) return 'luna';
      if (lowerId.includes('terra')) return 'terra';
      if (lowerId.includes('sol')) return 'sol';
      if (lowerId.includes('astra')) return 'astra';
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

    // Replace all allowed variables with 1
    let testStr = formulaJs;
    for (const v of allowedVars) {
      testStr = testStr.replace(new RegExp('\\b' + v + '\\b', 'g'), '1');
    }

    // Remove whitespace
    testStr = testStr.replace(/\s+/g, '');

    // Allow only digits, dots, and basic math operators
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

  calculateScore(task: Task, hourWeights: HourWeight[], customFormula?: string): number {
    if (task.completed || task.taskState === TaskState.COMPLETED) {
      return -9999; // Completed tasks do not participate
    }

    // 1. Prepare variables
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

    let daysRemaining = 0.5; // Default if no deadline (treated like today)
    let diffDays = 0; // Default if no deadline
    if (task.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      
      const diffTime = due.getTime() - today.getTime();
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        daysRemaining = 0.2; // Tareas vencidas: divisor muy pequeño para amplificar enormemente el score
      } else if (diffDays === 0) {
        daysRemaining = 0.5; // Tareas para hoy: divisor pequeño para amplificar el score
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

    // 2. Evaluate formula
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
    const rounded = Math.round(evaluated);
    console.log(`[ScoreEngine] Task: "${task.title}", customFormula: "${customFormula}", formulaToUse: "${formulaToUse}", evaluated: ${evaluated}, rounded: ${rounded}`);
    return rounded;
  }
};
