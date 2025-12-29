'use client';

import { useState } from 'react';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, isToday, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import type { CalendarEvent } from '@/app/(dashboard)/calendar/page';

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

interface GroupedFacilityEvents {
  facilityId: string;
  facilityName: string;
  events: CalendarEvent[];
}

const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

export function CalendarWeekView({ currentDate, events, onDateClick, onEventClick }: CalendarWeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [selectedFacilityGroup, setSelectedFacilityGroup] = useState<GroupedFacilityEvents | null>(null);

  // 日付ごとにイベントを取得し、施設でグループ化
  const getEventsForDay = (date: Date) => {
    const dayEvents = events.filter((event) => isSameDay(new Date(event.date), date));
    
    // grouped施設のイベントをまとめる
    const groupedFacilities: Map<string, GroupedFacilityEvents> = new Map();
    const individualEvents: CalendarEvent[] = [];

    dayEvents.forEach((event) => {
      if (event.facilityName && event.displayMode === 'grouped') {
        // grouped施設のイベント
        const key = event.facilityName;
        if (!groupedFacilities.has(key)) {
          groupedFacilities.set(key, {
            facilityId: key,
            facilityName: event.facilityName,
            events: [],
          });
        }
        groupedFacilities.get(key)!.events.push(event);
      } else {
        // 個人宅またはindividual施設のイベント
        individualEvents.push(event);
      }
    });

    return {
      groupedFacilities: Array.from(groupedFacilities.values()),
      individualEvents: individualEvents.sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      }),
    };
  };

  const handleFacilityClick = (group: GroupedFacilityEvents, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFacilityGroup(group);
    setFacilityDialogOpen(true);
  };

  return (
    <>
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
                    index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-gray-500'
                  )}
                >
                  {weekDays[index]}
                </div>
                <div
                  className={cn(
                    'text-2xl font-bold mt-1',
                    dayIsToday ? 'text-emerald-400' : 'text-gray-800'
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
            const { groupedFacilities, individualEvents } = getEventsForDay(day);
            const dayIsToday = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => onDateClick(day)}
                className={cn(
                  'min-h-[300px] p-2 rounded-lg border transition-colors cursor-pointer',
                  'bg-white border-gray-200 hover:border-gray-200',
                  dayIsToday && 'ring-2 ring-emerald-500 border-emerald-500'
                )}
              >
                <div className="space-y-2">
                  {/* グループ化された施設 */}
                  {groupedFacilities.map((group) => (
                    <FacilityGroupCard
                      key={group.facilityId}
                      group={group}
                      onClick={(e) => handleFacilityClick(group, e)}
                    />
                  ))}
                  {/* 個別イベント */}
                  {individualEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    />
                  ))}
                  {groupedFacilities.length === 0 && individualEvents.length === 0 && (
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

      {/* 施設イベント一覧ダイアログ */}
      <Dialog open={facilityDialogOpen} onOpenChange={setFacilityDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>🏢</span>
              {selectedFacilityGroup?.facilityName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {selectedFacilityGroup?.events
              .sort((a, b) => {
                if (!a.time && !b.time) return 0;
                if (!a.time) return 1;
                if (!b.time) return -1;
                return a.time.localeCompare(b.time);
              })
              .map((event) => (
                <div
                  key={event.id}
                  onClick={() => {
                    setFacilityDialogOpen(false);
                    onEventClick(event);
                  }}
                  className={cn(
                    'p-3 rounded-lg cursor-pointer transition-colors',
                    event.type === 'visit'
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30'
                      : 'bg-purple-500/20 hover:bg-purple-500/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{event.type === 'visit' ? '🏠' : '💊'}</span>
                      <span className="text-gray-800 font-medium">{event.patientName}</span>
                    </div>
                    {event.reportDone && (
                      <span className="text-green-400 text-sm">✓</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    {event.time && <span>{event.time}</span>}
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        event.type === 'visit'
                          ? 'border-emerald-500/50 text-emerald-400'
                          : event.type === 'prescription'
                          ? 'border-purple-500/50 text-purple-400'
                          : 'border-amber-500/50 text-amber-400'
                      )}
                    >
                      {event.type === 'visit' ? '訪問' : event.type === 'prescription' ? '処方' : '訪問+処方'}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FacilityGroupCard({ group, onClick }: { group: GroupedFacilityEvents; onClick: (e: React.MouseEvent) => void }) {
  const hasVisit = group.events.some((e) => e.type === 'visit');
  const hasPrescription = group.events.some((e) => e.type === 'prescription');
  const allReportDone = group.events.every((e) => e.reportDone);
  const someReportDone = group.events.some((e) => e.reportDone);

  return (
    <div
      onClick={onClick}
      className="p-2 rounded-lg cursor-pointer transition-colors bg-blue-500/20 hover:bg-blue-500/30"
    >
      <div className="flex items-center gap-2">
        <span>🏢</span>
        <span className="text-xs font-medium text-blue-300">施設</span>
        <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">
          {group.events.length}件
        </Badge>
        {allReportDone && (
          <span className="text-green-400 text-xs">✓</span>
        )}
        {!allReportDone && someReportDone && (
          <span className="text-yellow-400 text-xs">◐</span>
        )}
      </div>
      <div className="text-sm font-medium mt-1 text-gray-800 truncate">
        {group.facilityName}
      </div>
      <div className="flex items-center gap-1 mt-1">
        {hasVisit && <span className="text-xs text-emerald-400">訪問</span>}
        {hasVisit && hasPrescription && <span className="text-xs text-gray-400">・</span>}
        {hasPrescription && <span className="text-xs text-purple-400">処方</span>}
      </div>
    </div>
  );
}

function EventCard({ event, onClick }: { event: CalendarEvent; onClick: (e: React.MouseEvent) => void }) {
  const displayName = event.patientName;

  const icon = event.type === 'visit'
    ? event.facilityName ? '🏢' : '🏠'
    : event.type === 'prescription'
    ? '💊'
    : '🏠💊';

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-2 rounded-lg cursor-pointer transition-colors',
        event.type === 'visit'
          ? 'bg-emerald-500/20 hover:bg-emerald-500/30'
          : event.type === 'prescription'
          ? 'bg-purple-500/20 hover:bg-purple-500/30'
          : 'bg-amber-500/20 hover:bg-amber-500/30'
      )}
    >
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span
          className={cn(
            'text-xs font-medium',
            event.type === 'visit'
              ? 'text-emerald-300'
              : event.type === 'prescription'
              ? 'text-purple-300'
              : 'text-amber-300'
          )}
        >
          {event.type === 'visit' ? '訪問' : event.type === 'prescription' ? '処方' : '訪問+処方'}
        </span>
        {event.reportDone && (
          <span className="text-green-400 text-xs" title="報告書済">✓</span>
        )}
      </div>
      <div className="text-sm font-medium mt-1 text-gray-800">
        {displayName}
      </div>
      {event.time && (
        <div className="text-xs text-gray-500 mt-1">
          {event.time}
        </div>
      )}
      {event.assigneeName && (
        <div className="text-xs text-gray-400 mt-1">
          担当: {event.assigneeName}
        </div>
      )}
      {/* 訪問時注意事項 */}
      {event.visitNotes && (
        <div className="mt-2 p-1.5 rounded bg-amber-100 border border-amber-300 flex items-start gap-1">
          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-800 line-clamp-2">{event.visitNotes}</p>
        </div>
      )}
    </div>
  );
}
