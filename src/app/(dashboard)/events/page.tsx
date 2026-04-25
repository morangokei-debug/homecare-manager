'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Search, Home, Building2, ChevronLeft, ChevronRight, Loader2, FileDown } from 'lucide-react';
import type { CalendarEvent } from '@/app/(dashboard)/calendar/page';

const EventDialog = dynamic(
  () => import('@/components/calendar/event-dialog').then((m) => m.EventDialog),
  { ssr: false }
);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EventsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'visit' | 'prescription'>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfType, setPdfType] = useState<'visit' | 'prescription'>('visit');
  const [pdfStartDate, setPdfStartDate] = useState('');
  const [pdfEndDate, setPdfEndDate] = useState('');

  const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  // SWRでキャッシュ付きフェッチ（同じ月に戻った時は即座に表示）
  const { data: events = [], isLoading, mutate } = useSWR<CalendarEvent[]>(
    `/api/events?start=${start}&end=${end}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !event.patientName.toLowerCase().includes(q) &&
          !event.facilityName?.toLowerCase().includes(q) &&
          !event.assigneeName?.toLowerCase().includes(q)
        ) return false;
      }
      if (typeFilter !== 'all' && event.type !== typeFilter) return false;
      return true;
    });
  }, [events, searchQuery, typeFilter]);

  const visitEvents = filteredEvents.filter((e) => e.type === 'visit');
  const prescriptionEvents = filteredEvents.filter((e) => e.type === 'prescription');

  const openPdfDialog = (type: 'visit' | 'prescription') => {
    setPdfType(type);
    setPdfStartDate(format(startOfMonth(currentMonth), 'yyyy-MM-dd'));
    setPdfEndDate(format(endOfMonth(currentMonth), 'yyyy-MM-dd'));
    setPdfDialogOpen(true);
  };

  const handlePdfExport = () => {
    if (!pdfStartDate || !pdfEndDate) { alert('期間を設定してください'); return; }
    window.open(`/api/pdf/schedule-list?start=${pdfStartDate}&end=${pdfEndDate}&type=${pdfType}`, '_blank');
    setPdfDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">スケジュール一覧</h1>
          <p className="text-gray-500">訪問・処方の予定をリスト表示</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} className="border-gray-300 text-gray-600 hover:bg-gray-100">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-gray-800 font-medium min-w-[120px] text-center">
            {format(currentMonth, 'yyyy年M月', { locale: ja })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="border-gray-300 text-gray-600 hover:bg-gray-100">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="患者名、施設名で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 text-gray-800" />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="w-[160px] bg-gray-50 border-gray-200 text-gray-800"><SelectValue placeholder="種別" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="visit">🏠 訪問のみ</SelectItem>
                <SelectItem value="prescription">💊 処方のみ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {(typeFilter === 'all' || typeFilter === 'visit') && (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-gray-800 flex items-center gap-2">
                  🏠 訪問予定
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{visitEvents.length}件</Badge>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => openPdfDialog('visit')} className="border-gray-300 text-gray-600 hover:bg-gray-100">
                  <FileDown className="h-4 w-4 mr-1" />PDF
                </Button>
              </CardHeader>
              <CardContent>
                {visitEvents.length === 0 ? (
                  <p className="text-center py-8 text-gray-400">訪問予定はありません</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-100">
                        <TableHead className="text-gray-500">日付</TableHead>
                        <TableHead className="text-gray-500">患者名</TableHead>
                        <TableHead className="text-gray-500">担当</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visitEvents.map((event) => (
                        <TableRow key={event.id} className="border-gray-100 cursor-pointer hover:bg-gray-50" onClick={() => { setSelectedEvent(event); setDialogOpen(true); }}>
                          <TableCell className="text-gray-700 font-medium">
                            {format(new Date(event.date), 'M/d (E)', { locale: ja })}
                            {event.time && <span className="text-gray-400 ml-2 text-sm">{event.time}</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {event.facilityName ? <Building2 className="h-4 w-4 text-blue-400" /> : <Home className="h-4 w-4 text-emerald-400" />}
                              <span className="text-gray-800">{event.patientName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">{event.assigneeName || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {(typeFilter === 'all' || typeFilter === 'prescription') && (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-gray-800 flex items-center gap-2">
                  💊 処方予定（受診・発行予定日）
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">{prescriptionEvents.length}件</Badge>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => openPdfDialog('prescription')} className="border-gray-300 text-gray-600 hover:bg-gray-100">
                  <FileDown className="h-4 w-4 mr-1" />PDF
                </Button>
              </CardHeader>
              <CardContent>
                {prescriptionEvents.length === 0 ? (
                  <p className="text-center py-8 text-gray-400">処方予定はありません</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-100">
                        <TableHead className="text-gray-500">予定日</TableHead>
                        <TableHead className="text-gray-500">患者名</TableHead>
                        <TableHead className="text-gray-500">担当</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prescriptionEvents.map((event) => (
                        <TableRow key={event.id} className="border-gray-100 cursor-pointer hover:bg-gray-50" onClick={() => { setSelectedEvent(event); setDialogOpen(true); }}>
                          <TableCell className="text-gray-700 font-medium">{format(new Date(event.date), 'M/d (E)', { locale: ja })}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {event.facilityName ? <Building2 className="h-4 w-4 text-blue-400" /> : <Home className="h-4 w-4 text-orange-400" />}
                              <span className="text-gray-800">{event.patientName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">{event.assigneeName || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <EventDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedEvent(null); mutate(); }}
        selectedDate={null}
        event={selectedEvent}
      />

      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-800">
              {pdfType === 'visit' ? '🏠 訪問予定一覧' : '💊 処方予定一覧'} PDF出力
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-gray-700">出力期間</Label>
              <div className="flex items-center gap-2">
                <Input type="date" value={pdfStartDate} onChange={(e) => setPdfStartDate(e.target.value)} className="bg-gray-50 border-gray-200 text-gray-800" />
                <span className="text-gray-500">〜</span>
                <Input type="date" value={pdfEndDate} onChange={(e) => setPdfEndDate(e.target.value)} className="bg-gray-50 border-gray-200 text-gray-800" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setPdfDialogOpen(false)} className="border-gray-300 text-gray-600">キャンセル</Button>
              <Button onClick={handlePdfExport} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <FileDown className="h-4 w-4 mr-2" />PDF出力
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
