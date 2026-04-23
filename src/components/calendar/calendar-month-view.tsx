'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
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

interface CalendarMonthViewProps {
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

export function CalendarMonthView({ currentDate, events, onDateClick, onEventClick }: CalendarMonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [selectedFacilityGroup, setSelectedFacilityGroup] = useState<GroupedFacilityEvents | null>(null);

  // events を 1 回だけ走査して「日付(yyyy-MM-dd) → 分類済みイベント」のマップに変換する。
  // 以前は各日ごとに events 全件を filter していたため O(35 × N) かかっていた。
  // ここで一度だけ O(N) で分類することで、月表示の描画がイベント数に比例しなくなる。
  interface DayBuckets {
    groupedFacilities: Map<string, GroupedFacilityEvents>;
    individualEvents: CalendarEvent[];
    facilityEvents: CalendarEvent[];
  }

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayBuckets>();
    for (const event of events) {
      // event.date は API 側で 'yyyy-MM-dd' 形式の文字列。先頭10桁を鍵にする。
      const key = typeof event.date === 'string' ? event.date.slice(0, 10) : '';
      if (!key) continue;

      let bucket = map.get(key);
      if (!bucket) {
        bucket = {
          groupedFacilities: new Map(),
          individualEvents: [],
          facilityEvents: [],
        };
        map.set(key, bucket);
      }

      if (event.isFacilityEvent) {
        bucket.facilityEvents.push(event);
      } else if (event.facilityName && event.displayMode === 'grouped') {
        const facilityKey = event.facilityName;
        let group = bucket.groupedFacilities.get(facilityKey);
        if (!group) {
          group = {
            facilityId: facilityKey,
            facilityName: event.facilityName,
            events: [],
          };
          bucket.groupedFacilities.set(facilityKey, group);
        }
        group.events.push(event);
      } else {
        bucket.individualEvents.push(event);
      }
    }
    return map;
  }, [events]);

  const getEventsForDay = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    const bucket = eventsByDay.get(key);
    if (!bucket) {
      return {
        groupedFacilities: [],
        individualEvents: [],
        facilityEvents: [],
      };
    }
    return {
      groupedFacilities: Array.from(bucket.groupedFacilities.values()),
      individualEvents: bucket.individualEvents,
      facilityEvents: bucket.facilityEvents,
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
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={cn(
                'text-center text-sm font-medium py-2',
                index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-gray-500'
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const { groupedFacilities, individualEvents, facilityEvents } = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const dayIsToday = isToday(day);
            const dayOfWeek = day.getDay();

            // 表示する項目を制限（月表示は狭いので）
            const displayItems: React.ReactNode[] = [];
            let remainingCount = 0;

            // まず施設全体イベントを追加
            facilityEvents.slice(0, 1).forEach((event) => {
              displayItems.push(
                <EventBadge
                  key={event.id}
                  event={event}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                />
              );
            });

            // 次に施設グループを追加
            const facilitySlots = Math.max(0, 2 - displayItems.length);
            groupedFacilities.slice(0, facilitySlots).forEach((group) => {
              displayItems.push(
                <FacilityGroupBadge
                  key={`facility-${group.facilityId}`}
                  group={group}
                  onClick={(e) => handleFacilityClick(group, e)}
                />
              );
            });

            // 次に個別イベントを追加（残り枠があれば）
            const remainingSlots = Math.max(0, 3 - displayItems.length);
            individualEvents.slice(0, remainingSlots).forEach((event) => {
              displayItems.push(
                <EventBadge
                  key={event.id}
                  event={event}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                />
              );
            });

            // 残り件数を計算
            remainingCount =
              facilityEvents.length - Math.min(facilityEvents.length, 1) +
              groupedFacilities.length - Math.min(groupedFacilities.length, facilitySlots) +
              individualEvents.length - Math.min(individualEvents.length, remainingSlots);

            return (
              <div
                key={day.toISOString()}
                onClick={() => onDateClick(day)}
                className={cn(
                  'min-h-[100px] p-2 rounded-lg border transition-colors cursor-pointer',
                  isCurrentMonth
                    ? 'bg-white border-gray-200 hover:border-gray-200'
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
                    dayOfWeek !== 0 && dayOfWeek !== 6 && isCurrentMonth && 'text-gray-600',
                    dayIsToday && 'text-emerald-400'
                  )}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {displayItems}
                  {remainingCount > 0 && (
                    <div className="text-xs text-gray-400">+{remainingCount}件</div>
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
                  {/* 訪問時注意事項 */}
                  {event.visitNotes && (
                    <div className="mt-2 p-2 rounded bg-amber-100 border border-amber-300 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 whitespace-pre-wrap">{event.visitNotes}</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FacilityGroupBadge({ group, onClick }: { group: GroupedFacilityEvents; onClick: (e: React.MouseEvent) => void }) {
  const allReportDone = group.events.every((e) => e.reportDone);

  return (
    <Badge
      variant="outline"
      onClick={onClick}
      className="w-full justify-start text-xs truncate font-normal border-0 cursor-pointer hover:opacity-80 bg-blue-500/20 text-blue-300"
    >
      <span className="mr-1">🏢</span>
      <span className="truncate">{group.facilityName}</span>
      <span className="ml-auto text-blue-400 shrink-0">({group.events.length})</span>
      {allReportDone && (
        <span className="text-green-400 text-[10px] ml-1">✓</span>
      )}
    </Badge>
  );
}

function EventBadge({ event, onClick }: { event: CalendarEvent; onClick: (e: React.MouseEvent) => void }) {
  const displayName = event.patientName;

  // 施設全体イベントは青、個人訪問は緑、施設内患者は緑、処方は紫
  const isFacilityWholeEvent = event.isFacilityEvent;
  const icon = event.type === 'visit'
    ? isFacilityWholeEvent ? '🏢' : event.facilityName ? '🏢' : '🏠'
    : '💊';

  return (
    <Badge
      variant="outline"
      onClick={onClick}
      className={cn(
        'w-full justify-start text-xs truncate font-normal border-0 cursor-pointer hover:opacity-80',
        isFacilityWholeEvent
          ? 'bg-blue-500/20 text-blue-600'
          : event.type === 'visit'
            ? 'bg-emerald-500/20 text-emerald-600'
            : 'bg-purple-500/20 text-purple-600'
      )}
    >
      <span className="mr-1">{icon}</span>
      {event.time && <span className="mr-1 opacity-70">{event.time}</span>}
      <span className="truncate">{displayName}</span>
      {event.reportDone && (
        <span className="ml-auto text-green-500 text-[10px]" title="報告書済">✓</span>
      )}
    </Badge>
  );
}
