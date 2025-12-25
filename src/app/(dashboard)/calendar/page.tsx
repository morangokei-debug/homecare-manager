import { Suspense } from 'react';
import { CalendarView } from '@/components/calendar/calendar-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">カレンダー</h1>
          <p className="text-slate-400">訪問・処方スケジュールを管理</p>
        </div>
        <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">
          <Plus className="h-4 w-4 mr-2" />
          新規イベント
        </Button>
      </div>

      {/* カレンダーカード */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-white">2024年12月</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              今日
            </Button>
            <Button variant="outline" size="icon" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<CalendarSkeleton />}>
            <CalendarView />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-700/50 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

