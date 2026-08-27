export interface Phase {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  phases: Phase[];
  createdAt: string;
  completed?: boolean;
  isMain?: boolean;
  emoji?: string;
}

