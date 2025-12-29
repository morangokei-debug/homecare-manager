'use client';

import { useState, useRef } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Download, FileDown } from 'lucide-react';
import type { CalendarEvent } from '@/app/(dashboard)/calendar/page';

interface CalendarPdfExportProps {
  open: boolean;
  onClose: () => void;
  currentDate: Date;
  events: CalendarEvent[];
}

type ExportMode = 'week' | 'month';

const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

export function CalendarPdfExport({ open, onClose, currentDate, events }: CalendarPdfExportProps) {
  const [exportMode, setExportMode] = useState<ExportMode>('week');
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // 表示範囲を計算
  const getDateRange = () => {
    if (exportMode === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 }),
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    }
  };

  const { start, end } = getDateRange();
  const days = eachDayOfInterval({ start, end });

  // 月表示用のカレンダーグリッド
  const getMonthCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  // 日付ごとのイベントを取得
  const getEventsForDay = (date: Date) => {
    return events.filter((event) => isSameDay(new Date(event.date), date));
  };

  // PDF出力
  const handleExport = async () => {
    if (!printRef.current) return;
    
    setLoading(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: exportMode === 'week' ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

      const fileName = exportMode === 'week'
        ? `calendar_week_${format(start, 'yyyyMMdd')}.pdf`
        : `calendar_month_${format(currentDate, 'yyyyMM')}.pdf`;
      
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF出力に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-white border-gray-200 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-gray-800 flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            カレンダーPDF出力
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 出力モード選択 */}
          <div className="space-y-2">
            <Label className="text-gray-600">出力形式</Label>
            <div className="flex gap-2">
              <Button
                variant={exportMode === 'week' ? 'default' : 'outline'}
                onClick={() => setExportMode('week')}
                className={exportMode === 'week' ? 'bg-emerald-500 hover:bg-emerald-600' : 'border-gray-200'}
              >
                週表示（1週間）
              </Button>
              <Button
                variant={exportMode === 'month' ? 'default' : 'outline'}
                onClick={() => setExportMode('month')}
                className={exportMode === 'month' ? 'bg-emerald-500 hover:bg-emerald-600' : 'border-gray-200'}
              >
                月表示（1ヶ月）
              </Button>
            </div>
          </div>

          {/* プレビュー */}
          <div className="border border-gray-200 rounded-lg overflow-auto max-h-[50vh] bg-gray-50 p-4">
            <div ref={printRef} className="bg-white p-4" style={{ minWidth: exportMode === 'month' ? '800px' : '400px' }}>
              {/* タイトル */}
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {exportMode === 'week'
                    ? `${format(start, 'yyyy年M月d日', { locale: ja })} 〜 ${format(end, 'M月d日', { locale: ja })}`
                    : format(currentDate, 'yyyy年M月', { locale: ja })}
                </h2>
                <p className="text-sm text-gray-500">
                  出力日: {format(new Date(), 'yyyy/MM/dd HH:mm')}
                </p>
              </div>

              {exportMode === 'week' ? (
                /* 週表示 */
                <div className="space-y-2">
                  {days.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const dayOfWeek = day.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                    return (
                      <div key={day.toISOString()} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className={`px-3 py-2 font-medium ${
                          isToday(day) ? 'bg-emerald-500 text-white' :
                          dayOfWeek === 0 ? 'bg-red-50 text-red-600' :
                          dayOfWeek === 6 ? 'bg-blue-50 text-blue-600' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {format(day, 'M/d (E)', { locale: ja })}
                        </div>
                        <div className="p-2 min-h-[60px]">
                          {dayEvents.length === 0 ? (
                            <p className="text-gray-400 text-sm">予定なし</p>
                          ) : (
                            <div className="space-y-1">
                              {dayEvents.map((event) => (
                                <div
                                  key={event.id}
                                  className={`text-sm px-2 py-1 rounded ${
                                    event.type === 'visit'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}
                                >
                                  <span className="mr-1">{event.type === 'visit' ? '🏠' : '💊'}</span>
                                  {event.time && <span className="mr-1">{event.time}</span>}
                                  {event.patientName}
                                  {event.facilityName && !event.isFacilityEvent && (
                                    <span className="text-xs opacity-75 ml-1">({event.facilityName})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 月表示（カレンダーグリッド） */
                <div>
                  {/* 曜日ヘッダー */}
                  <div className="grid grid-cols-7 gap-px bg-gray-200">
                    {weekDays.map((day, index) => (
                      <div
                        key={day}
                        className={`text-center py-2 text-sm font-medium bg-gray-100 ${
                          index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-700'
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* カレンダーグリッド */}
                  <div className="grid grid-cols-7 gap-px bg-gray-200">
                    {getMonthCalendarDays().map((day) => {
                      const dayEvents = getEventsForDay(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const dayOfWeek = day.getDay();

                      return (
                        <div
                          key={day.toISOString()}
                          className={`min-h-[80px] p-1 bg-white ${
                            !isCurrentMonth ? 'opacity-40' : ''
                          }`}
                        >
                          <div className={`text-sm font-medium mb-1 ${
                            isToday(day) ? 'w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center' :
                            dayOfWeek === 0 ? 'text-red-500' :
                            dayOfWeek === 6 ? 'text-blue-500' :
                            'text-gray-700'
                          }`}>
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs px-1 py-0.5 rounded truncate ${
                                  event.type === 'visit'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {event.type === 'visit' ? '🏠' : '💊'}
                                {event.time && <span className="ml-0.5">{event.time}</span>}
                                <span className="ml-0.5">{event.patientName}</span>
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{dayEvents.length - 3}件
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 凡例 */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-4 text-sm text-gray-600">
                <span>🏠 訪問</span>
                <span>💊 処方</span>
              </div>
            </div>
          </div>

          {/* 出力ボタン */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-200"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleExport}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF出力
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}




