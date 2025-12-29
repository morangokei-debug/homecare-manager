// ============================================
// 型定義
// ============================================

export type UserRole = 'admin' | 'staff' | 'viewer';
export type DisplayMode = 'grouped' | 'individual';
export type EventType = 'visit' | 'prescription';
export type EventStatus = 'draft' | 'confirmed';

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

