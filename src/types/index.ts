// ============================================
// 型定義
// ============================================

export type UserRole = 'admin' | 'staff' | 'viewer';
export type DisplayMode = 'grouped' | 'individual';
export type EventType = 'visit' | 'prescription';
export type EventStatus = 'draft' | 'confirmed';

// リマインドタイミング
export type VisitReminderTiming = 
  | 'day_before_18'   // 前日18:00
  | 'same_day_9'      // 当日9:00
  | '1_hour_before'   // 1時間前
  | '30_min_before';  // 30分前

export type RxReminderTiming = 
  | 'day_before_18'   // 前日18:00
  | 'same_day_9';     // 当日9:00

// ユーザー
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 施設
export interface Facility {
  id: string;
  name: string;
  nameKana?: string | null;
  address?: string | null;
  area?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  displayMode: DisplayMode;
  memo?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 患者
export interface Patient {
  id: string;
  name: string;
  nameKana?: string | null;
  facilityId?: string | null;
  address?: string | null;
  area?: string | null;
  phone?: string | null;
  memo?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  facility?: Facility | null;
}

// イベント
export interface Event {
  id: string;
  type: EventType;
  date: Date;
  time?: Date | null;
  patientId: string;
  assignedTo?: string | null;
  memo?: string | null;
  status: EventStatus;
  isCompleted: boolean;
  isRecurring: boolean;
  recurringInterval?: number | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  patient?: Patient;
  assignee?: User | null;
  creator?: User;
}

// リマインド設定
export interface ReminderSetting {
  id: string;
  userId: string;
  visitEnabled: boolean;
  visitTimings: VisitReminderTiming[];
  rxEnabled: boolean;
  rxTimings: RxReminderTiming[];
  createdAt: Date;
  updatedAt: Date;
}

// リマインド
export interface Reminder {
  id: string;
  userId: string;
  eventId: string;
  scheduledAt: Date;
  isRead: boolean;
  message: string;
  createdAt: Date;
  event?: Event;
}

// カレンダー表示用
export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time?: Date | null;
  type: EventType;
  status: EventStatus;
  isCompleted: boolean;
  patientName: string;
  facilityName?: string | null;
  isIndividual: boolean; // 個人宅かどうか
  displayMode?: DisplayMode; // 施設の場合の表示モード
}

