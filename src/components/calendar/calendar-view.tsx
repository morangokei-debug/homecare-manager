'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// サンプルイベントデータ
const sampleEvents = [
  {
    id: '1',
    date: new Date(2024, 11, 25),
    type: 'visit' as const,
    title: '山田太郎',
    time: '09:00',
    isIndividual: true,
  },
  {
    id: '2',
    date: new Date(2024, 11, 25),
    type: 'prescription' as const,
    title: '佐藤花子',
    time: null,
    isIndividual: false,
  },
  {
    id: '3',
    date: new Date(2024, 11, 26),
    type: 'visit' as const,
    title: 'ケアホーム東京',
    time: '14:00',
    isIndividual: false,
  },
];

const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

export function CalendarView() {
  const [currentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (date: Date) => {
    return sampleEvents.filter(
      (event) => format(event.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
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
          const events = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const dayIsToday = isToday(day);
          const dayOfWeek = day.getDay();

          return (
            <div
              key={day.toISOString()}
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
                {events.slice(0, 3).map((event) => (
                  <EventBadge key={event.id} event={event} />
                ))}
                {events.length > 3 && (
                  <div className="text-xs text-slate-500">
                    +{events.length - 3}件
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

function EventBadge({ event }: { event: typeof sampleEvents[0] }) {
  const icon = event.type === 'visit' 
    ? (event.isIndividual ? '🏠' : '🏢') 
    : '💊';
  
  return (
    <Badge
      variant="outline"
      className={cn(
        'w-full justify-start text-xs truncate font-normal border-0',
        event.type === 'visit'
          ? 'bg-emerald-500/20 text-emerald-300'
          : 'bg-purple-500/20 text-purple-300'
      )}
    >
      <span className="mr-1">{icon}</span>
      {event.time && <span className="mr-1 opacity-70">{event.time}</span>}
      <span className="truncate">{event.title}</span>
    </Badge>
  );
}

