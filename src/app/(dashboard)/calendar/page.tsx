'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarMonthView } from '@/components/calendar/calendar-month-view';
import { CalendarWeekView } from '@/components/calendar/calendar-week-view';
import { EventDialog } from '@/components/calendar/event-dialog';
import { PdfExportButton } from '@/components/calendar/pdf-export-button';
import { cn } from '@/lib/utils';

export interface CalendarEvent {
  id: string;
  type: 'visit' | 'prescription';
  date: string;
  startTime: string | null;
  endTime: string | null;
  patientId: string;
  patientName: string;
  facilityName: string | null;
  displayMode: string;
  assigneeId: string | null;
  assigneeName: string | null;
  notes: string | null;
  isCompleted: boolean;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    let start: Date, end: Date;
    if (viewMode === 'week') {
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

  const handlePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
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
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(start, 'yyyy年M月d日', { locale: ja })} 〜 ${format(end, 'M月d日', { locale: ja })}`;
    }
    return format(currentDate, 'yyyy年M月', { locale: ja });
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">カレンダー</h1>
          <p className="text-slate-400">訪問・処方スケジュールを管理</p>
        </div>
        <Button
          onClick={() => handleNewEvent()}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          新規イベント
        </Button>
      </div>

      {/* カレンダーカード */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-white">{getTitle()}</CardTitle>
          <div className="flex items-center gap-4">
            {/* PDF出力 */}
            <PdfExportButton currentDate={currentDate} viewMode={viewMode} />

            {/* 表示切替 */}
            <div className="flex rounded-lg overflow-hidden border border-slate-600">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('week')}
                className={cn(
                  'rounded-none',
                  viewMode === 'week'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
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
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
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
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                今日
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'week' ? (
            <CalendarWeekView
              currentDate={currentDate}
              events={events}
              onDateClick={handleNewEvent}
              onEventClick={handleEditEvent}
            />
          ) : (
            <CalendarMonthView
              currentDate={currentDate}
              events={events}
              onDateClick={handleNewEvent}
              onEventClick={handleEditEvent}
            />
          )}
        </CardContent>
      </Card>

      {/* イベント登録/編集ダイアログ */}
      <EventDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        selectedDate={selectedDate}
        event={selectedEvent}
      />
    </div>
  );
}
