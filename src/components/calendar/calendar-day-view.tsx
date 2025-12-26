'use client';

import { useState } from 'react';
import { format, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CalendarEvent } from '@/app/(dashboard)/calendar/page';

interface CalendarDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

interface GroupedFacilityEvents {
  facilityId: string;
  facilityName: string;
  events: CalendarEvent[];
  earliestTime: string | null;
}

export function CalendarDayView({ currentDate, events, onEventClick }: CalendarDayViewProps) {
  const dayIsToday = isToday(currentDate);
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [selectedFacilityGroup, setSelectedFacilityGroup] = useState<GroupedFacilityEvents | null>(null);

  // grouped施設のイベントをまとめる
  const groupedFacilities: Map<string, GroupedFacilityEvents> = new Map();
  const individualEvents: CalendarEvent[] = [];

  events.forEach((event) => {
    if (event.facilityName && event.displayMode === 'grouped') {
      const key = event.facilityName;
      if (!groupedFacilities.has(key)) {
        groupedFacilities.set(key, {
          facilityId: key,
          facilityName: event.facilityName,
          events: [],
          earliestTime: null,
        });
      }
      const group = groupedFacilities.get(key)!;
      group.events.push(event);
      // 最も早い時刻を記録
      if (event.time) {
        if (!group.earliestTime || event.time < group.earliestTime) {
          group.earliestTime = event.time;
        }
      }
    } else {
      individualEvents.push(event);
    }
  });

  // すべてのアイテムをソート用に統合
  const allItems: Array<{ type: 'facility' | 'event'; time: string | null; data: GroupedFacilityEvents | CalendarEvent }> = [];

  groupedFacilities.forEach((group) => {
    allItems.push({ type: 'facility', time: group.earliestTime, data: group });
  });

  individualEvents.forEach((event) => {
    allItems.push({ type: 'event', time: event.time, data: event });
  });

  // 時間でソート
  allItems.sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  // 時間帯別にグループ化
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  const getItemsForHour = (hour: number) => {
    return allItems.filter((item) => {
      if (!item.time) return false;
      const itemHour = parseInt(item.time.split(':')[0], 10);
      return itemHour === hour;
    });
  };

  const itemsWithoutTime = allItems.filter((item) => !item.time);

  const handleFacilityClick = (group: GroupedFacilityEvents) => {
    setSelectedFacilityGroup(group);
    setFacilityDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        {/* 日付ヘッダー */}
        <div
          className={cn(
            'text-center p-4 rounded-lg',
            dayIsToday && 'bg-emerald-500/20'
          )}
        >
          <div className="text-sm text-gray-500">
            {format(currentDate, 'yyyy年M月', { locale: ja })}
          </div>
          <div
            className={cn(
              'text-4xl font-bold mt-1',
              dayIsToday ? 'text-emerald-400' : 'text-gray-800'
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
                : 'text-gray-600'
            )}
          >
            {format(currentDate, 'EEEE', { locale: ja })}
          </div>
        </div>

        {/* 時間未指定のイベント */}
        {itemsWithoutTime.length > 0 && (
          <div className="p-3 rounded-lg bg-white border border-gray-200">
            <div className="text-sm text-gray-500 mb-2">終日・時間未定</div>
            <div className="space-y-2">
              {itemsWithoutTime.map((item, index) =>
                item.type === 'facility' ? (
                  <FacilityRow
                    key={`facility-${(item.data as GroupedFacilityEvents).facilityId}`}
                    group={item.data as GroupedFacilityEvents}
                    onClick={() => handleFacilityClick(item.data as GroupedFacilityEvents)}
                  />
                ) : (
                  <EventRow
                    key={(item.data as CalendarEvent).id}
                    event={item.data as CalendarEvent}
                    onClick={() => onEventClick(item.data as CalendarEvent)}
                  />
                )
              )}
            </div>
          </div>
        )}

        {/* タイムライン */}
        <div className="space-y-0.5">
          {timeSlots.map((hour) => {
            const hourItems = getItemsForHour(hour);
            if (hour < 7 || hour > 20) {
              if (hourItems.length === 0) return null;
            }

            return (
              <div
                key={hour}
                className="flex gap-3 min-h-[50px]"
              >
                <div className="w-14 text-right text-sm text-gray-400 pt-1">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 border-l border-gray-200 pl-3 py-1">
                  {hourItems.length > 0 ? (
                    <div className="space-y-1">
                      {hourItems.map((item, index) =>
                        item.type === 'facility' ? (
                          <FacilityRow
                            key={`facility-${(item.data as GroupedFacilityEvents).facilityId}`}
                            group={item.data as GroupedFacilityEvents}
                            onClick={() => handleFacilityClick(item.data as GroupedFacilityEvents)}
                          />
                        ) : (
                          <EventRow
                            key={(item.data as CalendarEvent).id}
                            event={item.data as CalendarEvent}
                            onClick={() => onEventClick(item.data as CalendarEvent)}
                          />
                        )
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* イベントがない場合 */}
        {allItems.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            予定がありません
          </div>
        )}
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
                          : 'border-purple-500/50 text-purple-400'
                      )}
                    >
                      {event.type === 'visit' ? '訪問' : '処方'}
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

function FacilityRow({ group, onClick }: { group: GroupedFacilityEvents; onClick: () => void }) {
  const hasVisit = group.events.some((e) => e.type === 'visit');
  const hasPrescription = group.events.some((e) => e.type === 'prescription');
  const allReportDone = group.events.every((e) => e.reportDone);

  return (
    <div
      onClick={onClick}
      className="p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-3 bg-blue-500/20 hover:bg-blue-500/30"
    >
      <span className="text-xl">🏢</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-800 font-medium truncate">{group.facilityName}</span>
          <Badge
            variant="outline"
            className="text-xs border-blue-500/50 text-blue-400 shrink-0"
          >
            {group.events.length}件
          </Badge>
          {allReportDone && (
            <span className="text-green-400 text-sm shrink-0" title="全件報告書済">✓</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
          {group.earliestTime && <span>{group.earliestTime}〜</span>}
          <span className="flex items-center gap-1">
            {hasVisit && <span className="text-emerald-400">訪問</span>}
            {hasVisit && hasPrescription && <span>・</span>}
            {hasPrescription && <span className="text-purple-400">処方</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

function EventRow({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const displayName = event.patientName;

  const icon = event.type === 'visit'
    ? event.facilityName ? '🏢' : '🏠'
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
          <span className="text-gray-800 font-medium truncate">{displayName}</span>
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
        <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
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
