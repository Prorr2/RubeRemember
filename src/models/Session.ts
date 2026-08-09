export interface Session {
  id: string;
  taskId: string;
  startTime: string; // ISO date string
  endTime?: string; // ISO date string
  plannedDuration: number; // minutes
  realDuration?: number; // minutes
  completed: boolean;
  notes?: string;
  createdAt: string; // ISO date string
  nextStep?: string;
  progress?: number;
}
