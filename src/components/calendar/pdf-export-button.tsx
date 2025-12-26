'use client';

import { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileDown, Loader2 } from 'lucide-react';

interface PdfExportButtonProps {
  currentDate: Date;
  viewMode: 'week' | 'month';
}

export function PdfExportButton({ currentDate, viewMode }: PdfExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState<'daily' | 'weekly'>('weekly');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [typeFilter, setTypeFilter] = useState<'all' | 'visit' | 'prescription'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'draft'>('confirmed');
  const [includeCompleted, setIncludeCompleted] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      let startDate: string;
      let endDate: string;

      if (exportType === 'daily') {
        startDate = selectedDate;
        endDate = selectedDate;
      } else {
        const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }); // 月曜始まり
        const weekEnd = addDays(weekStart, 6);
        startDate = format(weekStart, 'yyyy-MM-dd');
        endDate = format(weekEnd, 'yyyy-MM-dd');
      }

      const params = new URLSearchParams({
        start: startDate,
        end: endDate,
        type: typeFilter,
        status: statusFilter,
        includeCompleted: String(includeCompleted),
      });

      const res = await fetch(`/api/pdf/schedule?${params}`);
      
      if (!res.ok) {
        throw new Error('PDF生成に失敗しました');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportType === 'daily'
        ? `schedule_${selectedDate}.pdf`
        : `schedule_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setOpen(false);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF出力に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-gray-200 text-gray-600 hover:bg-gray-100">
          <FileDown className="h-4 w-4 mr-2" />
          PDF出力
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-gray-200 text-gray-800">
        <DialogHeader>
          <DialogTitle>予定表PDF出力</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* 出力単位 */}
          <div className="space-y-2">
            <Label className="text-gray-600">出力単位</Label>
            <Select
              value={exportType}
              onValueChange={(v) => setExportType(v as 'daily' | 'weekly')}
            >
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">日次（1日分）</SelectItem>
                <SelectItem value="weekly">週次（月〜日）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 日付選択 */}
          <div className="space-y-2">
            <Label className="text-gray-600">
              {exportType === 'daily' ? '対象日' : '対象週（この日を含む週）'}
            </Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-800"
            />
            {exportType === 'weekly' && selectedDate && (
              <p className="text-xs text-gray-400">
                {format(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 'M月d日(E)', { locale: ja })}
                〜
                {format(addDays(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 6), 'M月d日(E)', { locale: ja })}
              </p>
            )}
          </div>

          {/* 種別フィルタ */}
          <div className="space-y-2">
            <Label className="text-gray-600">種別</Label>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
            >
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="visit">訪問のみ</SelectItem>
                <SelectItem value="prescription">処方のみ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ステータスフィルタ */}
          <div className="space-y-2">
            <Label className="text-gray-600">ステータス</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">確定のみ</SelectItem>
                <SelectItem value="draft">下書きのみ</SelectItem>
                <SelectItem value="all">すべて（下書きは※マーク付き）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 完了済み含む */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeCompleted"
              checked={includeCompleted}
              onCheckedChange={(checked) => setIncludeCompleted(checked as boolean)}
            />
            <Label htmlFor="includeCompleted" className="text-gray-600">
              完了済みを含める
            </Label>
          </div>

          {/* 出力ボタン */}
          <Button
            onClick={handleExport}
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-orange-500 hover:from-emerald-600 hover:to-cyan-600"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            PDFをダウンロード
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
