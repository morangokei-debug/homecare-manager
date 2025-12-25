'use client';

import { format, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { CalendarEvent } from '@/app/(dashboard)/calendar/page';

interface CalendarDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarDayView({ currentDate, events, onEventClick }: CalendarDayViewProps) {
  const dayIsToday = isToday(currentDate);
  
  // イベントを時間でソート
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  // 時間帯別にグループ化
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForHour = (hour: number) => {
    return sortedEvents.filter((event) => {
      if (!event.time) return false;
      const eventHour = parseInt(event.time.split(':')[0], 10);
      return eventHour === hour;
    });
  };

  const eventsWithoutTime = sortedEvents.filter((event) => !event.time);

  return (
    <div className="space-y-4">
      {/* 日付ヘッダー */}
      <div
        className={cn(
          'text-center p-4 rounded-lg',
          dayIsToday && 'bg-emerald-500/20'
        )}
      >
        <div className="text-sm text-slate-400">
          {format(currentDate, 'yyyy年M月', { locale: ja })}
        </div>
        <div
          className={cn(
            'text-4xl font-bold mt-1',
            dayIsToday ? 'text-emerald-400' : 'text-white'
          )}
        >
          {format(currentDate, 'd')}
        </div>
        <div
          className={cn(
            'text-lg',
            currentDate.getDay() === 0
              ? 'text-red-400'
              : currentDate.getDay() === 6
              ? 'text-blue-400'
              : 'text-slate-300'
          )}
        >
          {format(currentDate, 'EEEE', { locale: ja })}
        </div>
      </div>

      {/* 時間未指定のイベント */}
      {eventsWithoutTime.length > 0 && (
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="text-sm text-slate-400 mb-2">終日・時間未定</div>
          <div className="space-y-2">
            {eventsWithoutTime.map((event) => (
              <EventRow key={event.id} event={event} onClick={() => onEventClick(event)} />
            ))}
          </div>
        </div>
      )}

      {/* タイムライン */}
      <div className="space-y-0.5">
        {timeSlots.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          if (hour < 7 || hour > 20) {
            // 早朝・深夜は省略（イベントがある場合のみ表示）
            if (hourEvents.length === 0) return null;
          }

          return (
            <div
              key={hour}
              className="flex gap-3 min-h-[50px]"
            >
              <div className="w-14 text-right text-sm text-slate-500 pt-1">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 border-l border-slate-700 pl-3 py-1">
                {hourEvents.length > 0 ? (
                  <div className="space-y-1">
                    {hourEvents.map((event) => (
                      <EventRow key={event.id} event={event} onClick={() => onEventClick(event)} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* イベントがない場合 */}
      {sortedEvents.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          予定がありません
        </div>
      )}
    </div>
  );
}

function EventRow({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
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
        'p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-3',
        event.type === 'visit'
          ? 'bg-emerald-500/20 hover:bg-emerald-500/30'
          : 'bg-purple-500/20 hover:bg-purple-500/30'
      )}
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium truncate">{displayName}</span>
          <Badge
            variant="outline"
            className={cn(
              'text-xs shrink-0',
              event.type === 'visit'
                ? 'border-emerald-500/50 text-emerald-400'
                : 'border-purple-500/50 text-purple-400'
            )}
          >
            {event.type === 'visit' ? '訪問' : '処方'}
          </Badge>
          {event.reportDone && (
            <span className="text-green-400 text-sm shrink-0" title="報告書済">✓</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400 mt-0.5">
          {event.time && <span>{event.time}</span>}
          {event.assigneeName && <span>担当: {event.assigneeName}</span>}
          {event.status === 'draft' && (
            <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400">
              下書き
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

