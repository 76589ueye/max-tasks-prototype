export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
}

export type ProjectStatus = 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'COMPLETED';

export interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
}

export interface Plan {
  id: string;
  title: string;
  vision?: string;
  type: string; // 'STUDY' | 'TRAVEL' | 'PROJECT_LAUNCH' | 'SPORTS' | 'PERSONAL'
  workspaceId: string;
  startDate?: Date;
  endDate?: Date;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
}

export interface Milestone {
  id: string;
  planId: string;
  title: string;
  isCompleted: boolean;
  dueDate?: Date;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
}

export type TaskStatus = 'INBOX' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: Date;
  dueDate?: Date;
  timeOfDay?: string;
  expectedDuration?: number;
  recurrence?: string;
  projectId?: string;
  planId?: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  revision: number;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
}

export interface Folder {
  id: string;
  name: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId?: string;
  workspaceId: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  workspaceId: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  projectId?: string;
  workspaceId: string;
  recurrence?: string;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
}

export interface TimeBlock {
  id: string;
  taskId?: string;
  title: string;
  startDate: Date;
  endDate: Date;
  workspaceId: string;
}

export interface Habit {
  id: string;
  name: string;
  frequency: string;
  streak: number;
  reminderTime?: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  duration: number;
  notes?: string;
  workspaceId: string;
  createdAt: Date;
  revision: number;
}

export interface Reminder {
  id: string;
  taskId?: string;
  eventId?: string;
  remindAt: Date;
  isSent: boolean;
  workspaceId: string;
}

export interface Attachment {
  id: string;
  taskId?: string;
  noteId?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface Comment {
  id: string;
  taskId?: string;
  projectId?: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  createdAt: Date;
}

export interface DeletedRecord {
  id: string;
  table: string;
  entityId: string;
  workspaceId: string;
  deletedAt: Date;
}

export interface ConflictRecord {
  id: string;
  table: string;
  entityId: string;
  workspaceId: string;
  clientData: string;
  serverData: string;
  resolved: boolean;
  createdAt: Date;
}

export interface SyncMutation {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  entityId: string;
  data: any;
  clientTimestamp: number;
  clientRevision: number;
}

export interface SyncRequest {
  lastSyncTimestamp: number;
  mutations: SyncMutation[];
}

export interface SyncResponse {
  serverTimestamp: number;
  updatedEntities: {
    [table: string]: any[];
  };
  deletedIds: {
    [table: string]: string[];
  };
  conflicts: ConflictRecord[];
}
