'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, ChevronLeft, ChevronRight, Filter, FileDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { CalendarMonthView } from '@/components/calendar/calendar-month-view';
import { CalendarWeekView } from '@/components/calendar/calendar-week-view';
import { CalendarDayView } from '@/components/calendar/calendar-day-view';
import { cn } from '@/lib/utils';

const EventDialog = dynamic(
  () => import('@/components/calendar/event-dialog').then((m) => m.EventDialog),
  { ssr: false }
);

const CalendarPdfExport = dynamic(
  () => import('@/components/calendar/calendar-pdf-export').then((m) => m.CalendarPdfExport),
  { ssr: false }
);

export interface CalendarEvent {
  id: string;
  type: 'visit' | 'prescription' | 'both';
  date: string;
  time: string | null;
  patientId: string | null;
  patientName: string;
  facilityId: string | null;
  facilityName: string | null;
  displayMode: string;
  isFacilityEvent: boolean;
  visitNotes: string | null;  // 訪問時注意事項
  assigneeId: string | null;
  assigneeName: string | null;
  notes: string | null;
  status: 'draft' | 'confirmed';
  isCompleted: boolean;
  isRecurring: boolean;
  recurringInterval: number | null;
  reportDone: boolean;
  planDone: boolean;
}

interface User {
  id: string;
  name: string;
}

export default function CalendarPage() {
  const { data: session } = useSession();
  const canEdit = session?.user?.role !== 'viewer';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pdfExportOpen, setPdfExportOpen] = useState(false);

  // ユーザー一覧取得
  useEffect(() => {
    fetch('/api/users').then((res) => res.json()).then(setUsers);
  }, []);

  const fetchEvents = useCallback(async () => {
    let start: Date, end: Date;
    if (viewMode === 'day') {
      start = currentDate;
      end = currentDate;
    } else if (viewMode === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 0 });
      end = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }

    const res = await fetch(
      `/api/events?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}`
    );
    const data = await res.json();
    setEvents(data);
  }, [currentDate, viewMode]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // フィルタリングされたイベント
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // 担当者フィルタ
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned' && event.assigneeId) return false;
        if (assigneeFilter !== 'unassigned' && event.assigneeId !== assigneeFilter) return false;
      }
      // 種別フィルタ
      if (typeFilter !== 'all' && event.type !== typeFilter) return false;
      // ステータスフィルタ
      if (statusFilter !== 'all' && event.status !== statusFilter) return false;
      return true;
    });
  }, [events, assigneeFilter, typeFilter, statusFilter]);

  const handlePrev = () => {
    if (viewMode === 'day') {
      setCurrentDate(subDays(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleNewEvent = (date?: Date) => {
    setSelectedDate(date || new Date());
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDate(new Date(event.date));
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedDate(null);
    setSelectedEvent(null);
    fetchEvents();
  };

  const getTitle = () => {
    if (viewMode === 'day') {
      return format(currentDate, 'yyyy年M月d日 (E)', { locale: ja });
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(start, 'yyyy年M月d日', { locale: ja })} 〜 ${format(end, 'M月d日', { locale: ja })}`;
    }
    return format(currentDate, 'yyyy年M月', { locale: ja });
  };

  // 日表示用のイベント（当日のみ）
  const dayEvents = useMemo(() => {
    return filteredEvents.filter((event) => isSameDay(new Date(event.date), currentDate));
  }, [filteredEvents, currentDate]);

  const hasFilters = assigneeFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">カレンダー</h1>
          <p className="text-gray-500">訪問・処方スケジュールを管理</p>
        </div>
        {canEdit && (
          <Button
            onClick={() => handleNewEvent()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            新規イベント
          </Button>
        )}
      </div>

      {/* フィルタ */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Filter className="h-4 w-4" />
          <span className="text-sm">フィルタ:</span>
        </div>
        {/* 担当者 */}
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[160px] bg-white border-gray-200 text-gray-700">
            <SelectValue placeholder="担当者" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全担当者</SelectItem>
            <SelectItem value="unassigned">未割当</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* 種別 */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] bg-white border-gray-200 text-gray-700">
            <SelectValue placeholder="種別" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全種別</SelectItem>
            <SelectItem value="visit">🏠 訪問</SelectItem>
            <SelectItem value="prescription">💊 処方</SelectItem>
          </SelectContent>
        </Select>
        {/* ステータス */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-white border-gray-200 text-gray-700">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全ステータス</SelectItem>
            <SelectItem value="draft">📝 下書き</SelectItem>
            <SelectItem value="confirmed">✅ 確定</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAssigneeFilter('all');
              setTypeFilter('all');
              setStatusFilter('all');
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            クリア
          </Button>
        )}
        {hasFilters && (
          <span className="text-sm text-gray-500">
            ({filteredEvents.length}/{events.length}件表示)
          </span>
        )}
      </div>

      {/* カレンダーカード */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-gray-800">{getTitle()}</CardTitle>
          <div className="flex items-center gap-4">
            {/* PDF出力 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPdfExportOpen(true)}
              className="border-gray-200 text-gray-600 hover:bg-gray-100"
            >
              <FileDown className="h-4 w-4 mr-2" />
              PDF出力
            </Button>

            {/* 表示切替 */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('day')}
                className={cn(
                  'rounded-none',
                  viewMode === 'day'
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                )}
              >
                日
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('week')}
                className={cn(
                  'rounded-none',
                  viewMode === 'week'
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                )}
              >
                週
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('month')}
                className={cn(
                  'rounded-none',
                  viewMode === 'month'
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                )}
              >
                月
              </Button>
            </div>

            {/* ナビゲーション */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                className="border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                今日
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'day' ? (
            <CalendarDayView
              currentDate={currentDate}
              events={dayEvents}
              onEventClick={handleEditEvent}
            />
          ) : viewMode === 'week' ? (
            <CalendarWeekView
              currentDate={currentDate}
              events={filteredEvents}
              onDateClick={handleNewEvent}
              onEventClick={handleEditEvent}
            />
          ) : (
            <CalendarMonthView
              currentDate={currentDate}
              events={filteredEvents}
              onDateClick={handleNewEvent}
              onEventClick={handleEditEvent}
            />
          )}
        </CardContent>
      </Card>

      {/* イベント登録/編集ダイアログ（開いた時だけ読み込む） */}
      {dialogOpen && (
        <EventDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          selectedDate={selectedDate}
          event={selectedEvent}
        />
      )}

      {/* PDF出力ダイアログ（ボタンを押した時だけ読み込む） */}
      {pdfExportOpen && (
        <CalendarPdfExport
          open={pdfExportOpen}
          onClose={() => setPdfExportOpen(false)}
          currentDate={currentDate}
          events={filteredEvents}
        />
      )}
    </div>
  );
}
