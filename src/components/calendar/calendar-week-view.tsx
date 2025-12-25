'use client';

import { format, eachDayOfInterval, startOfWeek, endOfWeek, isToday, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { CalendarEvent } from '@/app/(dashboard)/calendar/page';

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

export function CalendarWeekView({ currentDate, events, onDateClick, onEventClick }: CalendarWeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventsForDay = (date: Date) => {
    return events
      .filter((event) => isSameDay(new Date(event.date), date))
      .sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });
  };

  return (
    <div className="space-y-4">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const dayIsToday = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'text-center p-3 rounded-lg',
                dayIsToday && 'bg-emerald-500/20'
              )}
            >
              <div
                className={cn(
                  'text-sm font-medium',
                  index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-slate-400'
                )}
              >
                {weekDays[index]}
              </div>
              <div
                className={cn(
                  'text-2xl font-bold mt-1',
                  dayIsToday ? 'text-emerald-400' : 'text-white'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* イベントリスト */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const dayIsToday = isToday(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateClick(day)}
              className={cn(
                'min-h-[300px] p-2 rounded-lg border transition-colors cursor-pointer',
                'bg-slate-800/50 border-slate-700 hover:border-slate-600',
                dayIsToday && 'ring-2 ring-emerald-500 border-emerald-500'
              )}
            >
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  />
                ))}
                {dayEvents.length === 0 && (
                  <div className="text-xs text-slate-600 text-center py-8">
                    予定なし
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventCard({ event, onClick }: { event: CalendarEvent; onClick: (e: React.MouseEvent) => void }) {
  const displayName = event.displayMode === 'facility' && event.facilityName
    ? event.facilityName
    : event.patientName;

  const icon = event.type === 'visit'
    ? event.displayMode === 'facility' && event.facilityName ? '🏢' : '🏠'
    : '💊';

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-2 rounded-lg cursor-pointer transition-colors',
        event.type === 'visit'
          ? 'bg-emerald-500/20 hover:bg-emerald-500/30'
          : 'bg-purple-500/20 hover:bg-purple-500/30',
        event.isCompleted && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span
          className={cn(
            'text-xs font-medium',
            event.type === 'visit' ? 'text-emerald-300' : 'text-purple-300'
          )}
        >
          {event.type === 'visit' ? '訪問' : '処方'}
        </span>
        {event.isCompleted && (
          <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
            完了
          </Badge>
        )}
      </div>
      <div
        className={cn(
          'text-sm font-medium mt-1 text-white',
          event.isCompleted && 'line-through'
        )}
      >
        {displayName}
      </div>
      {event.startTime && (
        <div className="text-xs text-slate-400 mt-1">
          {event.startTime.slice(0, 5)}
          {event.endTime && ` 〜 ${event.endTime.slice(0, 5)}`}
        </div>
      )}
      {event.assigneeName && (
        <div className="text-xs text-slate-500 mt-1">
          担当: {event.assigneeName}
        </div>
      )}
    </div>
  );
}

