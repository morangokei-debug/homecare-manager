'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Home,
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
} from 'lucide-react';
import { EventDialog } from '@/components/calendar/event-dialog';
import { confirmEvents } from '@/app/actions/events';
import type { CalendarEvent } from '@/app/(dashboard)/calendar/page';

export default function EventsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'visit' | 'prescription'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'confirmed'>('all');
  const [completedFilter, setCompletedFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const res = await fetch(`/api/events?start=${start}&end=${end}`);
    const data = await res.json();
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [currentMonth]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // 検索クエリ
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          event.patientName.toLowerCase().includes(query) ||
          event.facilityName?.toLowerCase().includes(query) ||
          event.assigneeName?.toLowerCase().includes(query) ||
          event.notes?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // 種別フィルタ
      if (typeFilter !== 'all' && event.type !== typeFilter) return false;

      // ステータスフィルタ
      if (statusFilter !== 'all' && event.status !== statusFilter) return false;

      // 完了フィルタ
      if (completedFilter === 'pending' && event.isCompleted) return false;
      if (completedFilter === 'completed' && !event.isCompleted) return false;

      return true;
    });
  }, [events, searchQuery, typeFilter, statusFilter, completedFilter]);

  const handleConfirmSelected = async () => {
    if (selectedIds.length === 0) return;
    setConfirming(true);
    const result = await confirmEvents(selectedIds);
    if (result.success) {
      setSelectedIds([]);
      fetchEvents();
    } else {
      alert(result.error);
    }
    setConfirming(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllDrafts = () => {
    const draftIds = filteredEvents
      .filter((e) => e.status === 'draft')
      .map((e) => e.id);
    setSelectedIds(draftIds);
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">イベント一覧</h1>
          <p className="text-gray-500">訪問・処方スケジュールをリスト表示</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
            className="border-gray-200 text-gray-600 hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-gray-800 font-medium min-w-[120px] text-center">
            {format(currentMonth, 'yyyy年M月', { locale: ja })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="border-gray-200 text-gray-600 hover:bg-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* フィルタ */}
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-5">
            {/* 検索 */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="患者名、施設名、担当者で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 text-gray-800"
              />
            </div>
            {/* 種別 */}
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                <SelectValue placeholder="種別" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての種別</SelectItem>
                <SelectItem value="visit">🏠 訪問</SelectItem>
                <SelectItem value="prescription">💊 処方</SelectItem>
              </SelectContent>
            </Select>
            {/* ステータス */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="draft">📝 下書き</SelectItem>
                <SelectItem value="confirmed">✅ 確定</SelectItem>
              </SelectContent>
            </Select>
            {/* 完了状態 */}
            <Select value={completedFilter} onValueChange={(v) => setCompletedFilter(v as typeof completedFilter)}>
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                <SelectValue placeholder="完了状態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="pending">未完了</SelectItem>
                <SelectItem value="completed">完了済み</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 一括操作 */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-purple-500/20 border border-purple-500/30">
          <span className="text-purple-300">{selectedIds.length}件選択中</span>
          <Button
            size="sm"
            onClick={handleConfirmSelected}
            disabled={confirming}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {confirming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                一括確定
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds([])}
            className="text-gray-500"
          >
            選択解除
          </Button>
        </div>
      )}

      {/* イベント一覧 */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-800">
            {filteredEvents.length}件のイベント
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllDrafts}
            className="border-gray-200 text-gray-600"
          >
            下書きを全選択
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              イベントがありません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="text-gray-500">日付</TableHead>
                  <TableHead className="text-gray-500">時刻</TableHead>
                  <TableHead className="text-gray-500">種別</TableHead>
                  <TableHead className="text-gray-500">患者/施設</TableHead>
                  <TableHead className="text-gray-500">担当者</TableHead>
                  <TableHead className="text-gray-500">報告</TableHead>
                    <TableHead className="text-gray-500">状態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow
                    key={event.id}
                    className="border-gray-200 cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      setSelectedEvent(event);
                      setDialogOpen(true);
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(event.id)}
                        onChange={() => toggleSelect(event.id)}
                        className="rounded border-gray-200"
                      />
                    </TableCell>
                    <TableCell className="text-gray-800">
                      {format(new Date(event.date), 'M/d (E)', { locale: ja })}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {event.time || '--:--'}
                    </TableCell>
                    <TableCell>
                      {event.type === 'visit' ? (
                        <span className="text-emerald-400">🏠 訪問</span>
                      ) : (
                        <span className="text-purple-400">💊 処方</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {event.facilityName && event.displayMode === 'grouped' ? (
                          <>
                            <Building2 className="h-4 w-4 text-blue-400" />
                            <span className="text-gray-800">{event.facilityName}</span>
                          </>
                        ) : (
                          <>
                            {event.facilityName ? (
                              <Building2 className="h-4 w-4 text-blue-400" />
                            ) : (
                              <Home className="h-4 w-4 text-emerald-400" />
                            )}
                            <span className="text-gray-800">{event.patientName}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {event.assigneeName || '-'}
                    </TableCell>
                    <TableCell>
                      {event.reportDone ? (
                        <span className="text-green-400" title="報告書済">✓</span>
                      ) : (
                        <span className="text-slate-600" title="報告書未">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            event.status === 'confirmed'
                              ? 'border-green-500/50 text-green-400'
                              : 'border-yellow-500/50 text-yellow-400'
                          }
                        >
                          {event.status === 'confirmed' ? '確定' : '下書き'}
                        </Badge>
                        {event.isCompleted && (
                          <Badge
                            variant="outline"
                            className="border-slate-500/50 text-gray-500"
                          >
                            完了
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* イベント編集ダイアログ */}
      <EventDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedEvent(null);
          fetchEvents();
        }}
        selectedDate={null}
        event={selectedEvent}
      />
    </div>
  );
}

