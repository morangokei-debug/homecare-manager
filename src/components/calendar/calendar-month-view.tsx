'use client';

import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { CalendarEvent } from '@/app/(dashboard)/calendar/page';

interface CalendarMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

export function CalendarMonthView({ currentDate, events, onDateClick, onEventClick }: CalendarMonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => isSameDay(new Date(event.date), date));
  };

  return (
    <div className="space-y-4">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={cn(
              'text-center text-sm font-medium py-2',
              index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-slate-400'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const dayIsToday = isToday(day);
          const dayOfWeek = day.getDay();

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateClick(day)}
              className={cn(
                'min-h-[100px] p-2 rounded-lg border transition-colors cursor-pointer',
                isCurrentMonth
                  ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  : 'bg-slate-900/50 border-slate-800',
                dayIsToday && 'ring-2 ring-emerald-500 border-emerald-500'
              )}
            >
              <div
                className={cn(
                  'text-sm font-medium mb-1',
                  !isCurrentMonth && 'text-slate-600',
                  dayOfWeek === 0 && isCurrentMonth && 'text-red-400',
                  dayOfWeek === 6 && isCurrentMonth && 'text-blue-400',
                  dayOfWeek !== 0 && dayOfWeek !== 6 && isCurrentMonth && 'text-slate-300',
                  dayIsToday && 'text-emerald-400'
                )}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <EventBadge
                    key={event.id}
                    event={event}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-slate-500">+{dayEvents.length - 3}件</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventBadge({ event, onClick }: { event: CalendarEvent; onClick: (e: React.MouseEvent) => void }) {
  const displayName = event.displayMode === 'facility' && event.facilityName
    ? event.facilityName
    : event.patientName;

  const icon = event.type === 'visit'
    ? event.displayMode === 'facility' && event.facilityName ? '🏢' : '🏠'
    : '💊';

  // 書類の状態を表すインジケータ
  const docStatus = event.reportDone && event.planDone ? '✓' :
                    (event.reportDone || event.planDone) ? '◐' : '';

  return (
    <Badge
      variant="outline"
      onClick={onClick}
      className={cn(
        'w-full justify-start text-xs truncate font-normal border-0 cursor-pointer hover:opacity-80',
        event.type === 'visit'
          ? 'bg-emerald-500/20 text-emerald-300'
          : 'bg-purple-500/20 text-purple-300',
        event.isCompleted && 'opacity-50 line-through'
      )}
    >
      <span className="mr-1">{icon}</span>
      {event.time && <span className="mr-1 opacity-70">{event.time}</span>}
      <span className="truncate">{displayName}</span>
      {docStatus && (
        <span
          className={cn(
            'ml-auto text-[10px]',
            event.reportDone && event.planDone ? 'text-green-400' : 'text-yellow-400'
          )}
          title={`報告書:${event.reportDone ? '済' : '未'} 計画書:${event.planDone ? '済' : '未'}`}
        >
          {docStatus}
        </span>
      )}
    </Badge>
  );
}

