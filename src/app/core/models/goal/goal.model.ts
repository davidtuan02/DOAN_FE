export enum GoalStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  AT_RISK = 'AT_RISK',
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  progress: number;
  startDate: Date | null;
  dueDate: Date | null;
  projectId: string;
  projectName: string;
  ownerId: string | null;
  ownerName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  status?: GoalStatus;
  progress?: number;
  startDate?: string;
  dueDate?: string;
  projectId: string;
  ownerId?: string;
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  status?: GoalStatus;
  progress?: number;
  startDate?: string;
  dueDate?: string;
  ownerId?: string;
}
