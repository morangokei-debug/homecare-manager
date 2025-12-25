'use client';

import { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, Loader2 } from 'lucide-react';

interface PdfExportButtonProps {
  currentDate: Date;
  viewMode: 'week' | 'month';
}

export function PdfExportButton({ currentDate, viewMode }: PdfExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async (range: 'current' | 'month') => {
    setLoading(true);

    let start: Date, end: Date;

    if (range === 'current') {
      if (viewMode === 'week') {
        start = startOfWeek(currentDate, { weekStartsOn: 0 });
        end = endOfWeek(currentDate, { weekStartsOn: 0 });
      } else {
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
      }
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }

    try {
      const response = await fetch(
        `/api/pdf/schedule?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}`
      );

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schedule_${format(start, 'yyyyMMdd')}_${format(end, 'yyyyMMdd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF出力に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <FileDown className="h-4 w-4 mr-2" />
              PDF出力
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport('current')}>
          現在の{viewMode === 'week' ? '週' : '月'}をエクスポート
        </DropdownMenuItem>
        {viewMode === 'week' && (
          <DropdownMenuItem onClick={() => handleExport('month')}>
            今月全体をエクスポート
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

