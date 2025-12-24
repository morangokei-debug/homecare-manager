# データ設計書：Homecare Manager

> **バージョン**: 1.0.0  
> **作成日**: 2024-12-24  
> **ステータス**: 確定

---

## 1. ER図

```
┌─────────────────┐
│      User       │
│─────────────────│
│ id (PK)         │
│ email           │
│ password_hash   │
│ name            │
│ role            │◄─────────────────────────────────────┐
│ is_active       │                                      │
│ created_at      │                                      │
│ updated_at      │                                      │
└─────────────────┘                                      │
        │                                                │
        │ 1:1                                            │
        ▼                                                │
┌─────────────────┐                                      │
│ ReminderSetting │                                      │
│─────────────────│                                      │
│ id (PK)         │                                      │
│ user_id (FK)    │                                      │
│ visit_enabled   │                                      │
│ visit_timings   │                                      │
│ rx_enabled      │                                      │
│ rx_timings      │                                      │
│ created_at      │                                      │
│ updated_at      │                                      │
└─────────────────┘                                      │
                                                         │
┌─────────────────┐       ┌─────────────────┐           │
│    Facility     │       │     Patient     │           │
│─────────────────│       │─────────────────│           │
│ id (PK)         │◄──────│ id (PK)         │           │
│ name            │  0..1 │ name            │           │
│ name_kana       │       │ name_kana       │           │
│ address         │       │ facility_id(FK) │           │
│ area            │       │ address         │           │
│ phone           │       │ area            │           │
│ contact_person  │       │ phone           │           │
│ display_mode    │       │ memo            │           │
│ memo            │       │ is_active       │           │
│ is_active       │       │ created_at      │           │
│ created_at      │       │ updated_at      │           │
│ updated_at      │       └─────────────────┘           │
└─────────────────┘               │                     │
                                  │ 1                   │
                                  ▼                     │
                          ┌─────────────────┐           │
                          │      Event      │           │
                          │─────────────────│           │
                          │ id (PK)         │           │
                          │ type            │           │
                          │ date            │           │
                          │ time            │           │
                          │ patient_id (FK) │───────────┤
                          │ assigned_to(FK) │───────────┤ User
                          │ memo            │           │
                          │ status          │           │
                          │ is_completed    │           │
                          │ is_recurring    │           │
                          │ recurring_int   │           │
                          │ created_by (FK) │───────────┘
                          │ created_at      │
                          │ updated_at      │
                          └─────────────────┘
                                  │
                                  │ 1:N
                                  ▼
                          ┌─────────────────┐
                          │    Reminder     │
                          │─────────────────│
                          │ id (PK)         │
                          │ user_id (FK)    │
                          │ event_id (FK)   │
                          │ scheduled_at    │
                          │ is_read         │
                          │ message         │
                          │ created_at      │
                          └─────────────────┘
```

---

## 2. テーブル定義

### 2.1 User（ユーザー）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|:----:|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| email | VARCHAR(255) | NO | - | メールアドレス（UNIQUE） |
| password_hash | VARCHAR(255) | NO | - | bcryptハッシュ化パスワード |
| name | VARCHAR(100) | NO | - | 表示名 |
| role | ENUM | NO | 'staff' | admin / staff / viewer |
| is_active | BOOLEAN | NO | true | 有効フラグ |
| created_at | TIMESTAMP | NO | now() | 作成日時 |
| updated_at | TIMESTAMP | NO | now() | 更新日時 |

**インデックス:**
- `idx_user_email` (email) UNIQUE
- `idx_user_role` (role)
- `idx_user_is_active` (is_active)

---

### 2.2 Facility（施設）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|:----:|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| name | VARCHAR(200) | NO | - | 施設名 |
| name_kana | VARCHAR(200) | YES | - | 施設名（カナ） |
| address | VARCHAR(500) | YES | - | 住所 |
| area | VARCHAR(100) | YES | - | 簡易エリア |
| phone | VARCHAR(20) | YES | - | 電話番号 |
| contact_person | VARCHAR(100) | YES | - | 担当者名 |
| display_mode | ENUM | NO | 'grouped' | grouped / individual |
| memo | TEXT | YES | - | メモ |
| is_active | BOOLEAN | NO | true | 有効フラグ |
| created_at | TIMESTAMP | NO | now() | 作成日時 |
| updated_at | TIMESTAMP | NO | now() | 更新日時 |

**インデックス:**
- `idx_facility_name` (name)
- `idx_facility_name_kana` (name_kana)
- `idx_facility_is_active` (is_active)

---

### 2.3 Patient（患者）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|:----:|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| name | VARCHAR(100) | NO | - | 患者氏名 |
| name_kana | VARCHAR(100) | YES | - | 患者氏名（カナ） |
| facility_id | UUID | YES | - | 所属施設ID（NULL=個人宅） |
| address | VARCHAR(500) | YES | - | 住所 |
| area | VARCHAR(100) | YES | - | 簡易エリア |
| phone | VARCHAR(20) | YES | - | 電話番号 |
| memo | TEXT | YES | - | メモ |
| is_active | BOOLEAN | NO | true | 有効フラグ |
| created_at | TIMESTAMP | NO | now() | 作成日時 |
| updated_at | TIMESTAMP | NO | now() | 更新日時 |

**インデックス:**
- `idx_patient_name` (name)
- `idx_patient_name_kana` (name_kana)
- `idx_patient_facility_id` (facility_id)
- `idx_patient_is_active` (is_active)

**外部キー:**
- `fk_patient_facility` → Facility(id) ON DELETE SET NULL

---

### 2.4 Event（イベント）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|:----:|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| type | ENUM | NO | - | visit / prescription |
| date | DATE | NO | - | 予定日 |
| time | TIME | YES | - | 予定時刻（訪問のみ） |
| patient_id | UUID | NO | - | 患者ID |
| assigned_to | UUID | YES | - | 担当者ID |
| memo | TEXT | YES | - | メモ |
| status | ENUM | NO | 'draft' | draft / confirmed |
| is_completed | BOOLEAN | NO | false | 完了フラグ |
| is_recurring | BOOLEAN | NO | false | 定期フラグ |
| recurring_interval | INTEGER | YES | - | 定期間隔（日数） |
| created_by | UUID | NO | - | 作成者ID |
| created_at | TIMESTAMP | NO | now() | 作成日時 |
| updated_at | TIMESTAMP | NO | now() | 更新日時 |

**インデックス:**
- `idx_event_date` (date)
- `idx_event_patient_id` (patient_id)
- `idx_event_assigned_to` (assigned_to)
- `idx_event_created_by` (created_by)
- `idx_event_status` (status)
- `idx_event_type_date` (type, date)

**外部キー:**
- `fk_event_patient` → Patient(id) ON DELETE RESTRICT
- `fk_event_assigned_to` → User(id) ON DELETE SET NULL
- `fk_event_created_by` → User(id) ON DELETE RESTRICT

---

### 2.5 ReminderSetting（リマインド設定）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|:----:|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| user_id | UUID | NO | - | ユーザーID（UNIQUE） |
| visit_enabled | BOOLEAN | NO | true | 訪問リマインドON/OFF |
| visit_timings | JSON | YES | '[]' | 選択タイミング配列 |
| rx_enabled | BOOLEAN | NO | true | 処方リマインドON/OFF |
| rx_timings | JSON | YES | '[]' | 選択タイミング配列 |
| created_at | TIMESTAMP | NO | now() | 作成日時 |
| updated_at | TIMESTAMP | NO | now() | 更新日時 |

**インデックス:**
- `idx_reminder_setting_user_id` (user_id) UNIQUE

**外部キー:**
- `fk_reminder_setting_user` → User(id) ON DELETE CASCADE

**visit_timings / rx_timings の値例:**
```json
["day_before_18", "same_day_9", "1_hour_before", "30_min_before"]
```

---

### 2.6 Reminder（リマインド通知）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|:----:|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| user_id | UUID | NO | - | 通知先ユーザーID |
| event_id | UUID | NO | - | 対象イベントID |
| scheduled_at | TIMESTAMP | NO | - | 通知予定日時 |
| is_read | BOOLEAN | NO | false | 既読フラグ |
| message | TEXT | NO | - | 通知メッセージ |
| created_at | TIMESTAMP | NO | now() | 作成日時 |

**インデックス:**
- `idx_reminder_user_id` (user_id)
- `idx_reminder_event_id` (event_id)
- `idx_reminder_scheduled_at` (scheduled_at)
- `idx_reminder_is_read` (is_read)

**外部キー:**
- `fk_reminder_user` → User(id) ON DELETE CASCADE
- `fk_reminder_event` → Event(id) ON DELETE CASCADE

---

## 3. ENUM定義

### 3.1 UserRole

```sql
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'viewer');
```

| 値 | 説明 |
|----|------|
| admin | 管理者（全権限） |
| staff | 一般スタッフ（編集可） |
| viewer | 閲覧者（閲覧・PDF出力のみ） |

### 3.2 DisplayMode

```sql
CREATE TYPE display_mode AS ENUM ('grouped', 'individual');
```

| 値 | 説明 |
|----|------|
| grouped | 施設名でまとめて表示 |
| individual | 患者ごとに個別表示 |

### 3.3 EventType

```sql
CREATE TYPE event_type AS ENUM ('visit', 'prescription');
```

| 値 | 説明 |
|----|------|
| visit | 訪問イベント |
| prescription | 処方イベント |

### 3.4 EventStatus

```sql
CREATE TYPE event_status AS ENUM ('draft', 'confirmed');
```

| 値 | 説明 |
|----|------|
| draft | 下書き |
| confirmed | 確定 |

---

## 4. Prismaスキーマ

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// ENUMS
// ============================================

enum UserRole {
  admin
  staff
  viewer
}

enum DisplayMode {
  grouped
  individual
}

enum EventType {
  visit
  prescription
}

enum EventStatus {
  draft
  confirmed
}

// ============================================
// MODELS
// ============================================

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String   @map("password_hash")
  name          String
  role          UserRole @default(staff)
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  reminderSetting  ReminderSetting?
  createdEvents    Event[]    @relation("EventCreatedBy")
  assignedEvents   Event[]    @relation("EventAssignedTo")
  reminders        Reminder[]

  @@index([role])
  @@index([isActive])
  @@map("users")
}

model Facility {
  id            String      @id @default(uuid())
  name          String
  nameKana      String?     @map("name_kana")
  address       String?
  area          String?
  phone         String?
  contactPerson String?     @map("contact_person")
  displayMode   DisplayMode @default(grouped) @map("display_mode")
  memo          String?
  isActive      Boolean     @default(true) @map("is_active")
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  // Relations
  patients Patient[]

  @@index([name])
  @@index([nameKana])
  @@index([isActive])
  @@map("facilities")
}

model Patient {
  id         String    @id @default(uuid())
  name       String
  nameKana   String?   @map("name_kana")
  facilityId String?   @map("facility_id")
  address    String?
  area       String?
  phone      String?
  memo       String?
  isActive   Boolean   @default(true) @map("is_active")
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")

  // Relations
  facility Facility? @relation(fields: [facilityId], references: [id], onDelete: SetNull)
  events   Event[]

  @@index([name])
  @@index([nameKana])
  @@index([facilityId])
  @@index([isActive])
  @@map("patients")
}

model Event {
  id                String      @id @default(uuid())
  type              EventType
  date              DateTime    @db.Date
  time              DateTime?   @db.Time
  patientId         String      @map("patient_id")
  assignedTo        String?     @map("assigned_to")
  memo              String?
  status            EventStatus @default(draft)
  isCompleted       Boolean     @default(false) @map("is_completed")
  isRecurring       Boolean     @default(false) @map("is_recurring")
  recurringInterval Int?        @map("recurring_interval")
  createdBy         String      @map("created_by")
  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")

  // Relations
  patient    Patient    @relation(fields: [patientId], references: [id], onDelete: Restrict)
  assignee   User?      @relation("EventAssignedTo", fields: [assignedTo], references: [id], onDelete: SetNull)
  creator    User       @relation("EventCreatedBy", fields: [createdBy], references: [id], onDelete: Restrict)
  reminders  Reminder[]

  @@index([date])
  @@index([patientId])
  @@index([assignedTo])
  @@index([createdBy])
  @@index([status])
  @@index([type, date])
  @@map("events")
}

model ReminderSetting {
  id           String   @id @default(uuid())
  userId       String   @unique @map("user_id")
  visitEnabled Boolean  @default(true) @map("visit_enabled")
  visitTimings Json     @default("[]") @map("visit_timings")
  rxEnabled    Boolean  @default(true) @map("rx_enabled")
  rxTimings    Json     @default("[]") @map("rx_timings")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("reminder_settings")
}

model Reminder {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  eventId     String   @map("event_id")
  scheduledAt DateTime @map("scheduled_at")
  isRead      Boolean  @default(false) @map("is_read")
  message     String
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([eventId])
  @@index([scheduledAt])
  @@index([isRead])
  @@map("reminders")
}
```

---

## 5. 初期データ

### 5.1 管理者ユーザー（シード）

```typescript
// prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 管理者ユーザー作成
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      name: '管理者',
      role: UserRole.admin,
      isActive: true,
      reminderSetting: {
        create: {
          visitEnabled: true,
          visitTimings: ['day_before_18', 'same_day_9'],
          rxEnabled: true,
          rxTimings: ['day_before_18', 'same_day_9'],
        },
      },
    },
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 6. クエリ例

### 6.1 カレンダー表示用クエリ

```typescript
// 指定期間のイベントを取得（患者・施設情報含む）
const events = await prisma.event.findMany({
  where: {
    date: {
      gte: startDate,
      lte: endDate,
    },
  },
  include: {
    patient: {
      include: {
        facility: true,
      },
    },
    assignee: {
      select: { id: true, name: true },
    },
  },
  orderBy: [
    { date: 'asc' },
    { time: 'asc' },
  ],
});
```

### 6.2 施設まとめ表示用クエリ

```typescript
// 施設ごとにイベントをグループ化
const facilityEvents = await prisma.facility.findMany({
  where: {
    displayMode: 'grouped',
    isActive: true,
  },
  include: {
    patients: {
      include: {
        events: {
          where: {
            date: targetDate,
          },
        },
      },
    },
  },
});
```

---

## 改訂履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2024-12-24 | 初版作成 | - |

---

*以上*

