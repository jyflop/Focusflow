export type ProjectStatus = 'Active' | 'Completed' | 'On Hold';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: string;
  position?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  progress: number;
  ownerId: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhoto?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string;
  startDate: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  order: number;
  totalTimeSpent: number;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhoto?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  taskId: string;
  name: string;
  completed: boolean;
  order: number;
  createdAt: string;
}

export interface TimeLog {
  id: string;
  taskId: string;
  duration: number;
  startTime: string;
  endTime: string;
}
