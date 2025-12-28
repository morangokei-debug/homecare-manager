'use client';

import { useState, useEffect } from 'react';
import { format, addDays, isBefore, isToday, isTomorrow, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  BellOff,
  Clock,
  Home,
  Building2,
  Check,
  Loader2,
  Settings2,
  Calendar,
  Pill,
} from 'lucide-react';

interface Reminder {
  id: string;
  eventId: string;
  scheduledAt: string;
  message: string;
  isRead: boolean;
  event: {
    id: string;
    type: string;
    date: string;
    time: string | null;
    patient: {
      name: string;
      facility: { name: string } | null;
    };
  };
}

interface ReminderSetting {
  visitEnabled: boolean;
  visitTimings: string[];
  rxEnabled: boolean;
  rxTimings: string[];
}

const visitTimingOptions = [
  { value: 'day_before_18', label: '前日 18:00' },
  { value: 'same_day_9', label: '当日 9:00' },
  { value: '1_hour_before', label: '1時間前' },
  { value: '30_min_before', label: '30分前' },
];

const rxTimingOptions = [
  { value: 'day_before_18', label: '前日 18:00' },
  { value: 'same_day_9', label: '当日 9:00' },
];

export default function RemindersPage() {
  const { data: session } = useSession();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [settings, setSettings] = useState<ReminderSetting>({
    visitEnabled: true,
    visitTimings: ['day_before_18', 'same_day_9'],
    rxEnabled: true,
    rxTimings: ['day_before_18'],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('reminders');

  useEffect(() => {
    fetchReminders();
    fetchSettings();
  }, []);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reminders');
      const data = await res.json();
      setReminders(data);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    }
    setLoading(false);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/reminders/settings');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setSettings(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const markAsRead = async (reminderId: string) => {
    try {
      await fetch(`/api/reminders/${reminderId}/read`, { method: 'PUT' });
      setReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, isRead: true } : r))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/reminders/read-all', { method: 'PUT' });
      setReminders((prev) => prev.map((r) => ({ ...r, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch('/api/reminders/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      alert('設定を保存しました');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('設定の保存に失敗しました');
    }
    setSaving(false);
  };

  const toggleTiming = (type: 'visit' | 'rx', timing: string) => {
    const key = type === 'visit' ? 'visitTimings' : 'rxTimings';
    const currentTimings = settings[key];
    const newTimings = currentTimings.includes(timing)
      ? currentTimings.filter((t) => t !== timing)
      : [...currentTimings, timing];
    setSettings({ ...settings, [key]: newTimings });
  };

  const unreadCount = reminders.filter((r) => !r.isRead).length;

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return '今日';
    if (isTomorrow(date)) return '明日';
    return format(date, 'M/d(E)', { locale: ja });
  };

  // 今後7日間の予定（リマインド対象）を取得
  const upcomingEvents = reminders
    .filter((r) => !r.isRead)
    .sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">リマインド</h1>
          <p className="text-gray-500">予定の通知と設定</p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={markAllAsRead}
            className="border-gray-200 text-gray-600"
          >
            <Check className="h-4 w-4 mr-2" />
            すべて既読にする
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger value="reminders" className="data-[state=active]:bg-gray-100">
            <Bell className="h-4 w-4 mr-2" />
            リマインド一覧
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-gray-800">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-gray-100">
            <Settings2 className="h-4 w-4 mr-2" />
            通知設定
          </TabsTrigger>
        </TabsList>

        {/* リマインド一覧 */}
        <TabsContent value="reminders" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : reminders.length === 0 ? (
            <Card className="bg-white border-gray-200">
              <CardContent className="py-12 text-center">
                <BellOff className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">リマインドはありません</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <Card
                  key={reminder.id}
                  className={`border-gray-200 transition-colors ${
                    reminder.isRead
                      ? 'bg-white/30'
                      : 'bg-white border-l-4 border-l-emerald-500'
                  }`}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            reminder.event.type === 'visit'
                              ? 'bg-emerald-500/20'
                              : 'bg-purple-500/20'
                          }`}
                        >
                          {reminder.event.type === 'visit' ? (
                            reminder.event.patient.facility ? (
                              <Building2 className="h-5 w-5 text-blue-400" />
                            ) : (
                              <Home className="h-5 w-5 text-emerald-400" />
                            )
                          ) : (
                            <Pill className="h-5 w-5 text-purple-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-800 font-medium">
                              {reminder.event.patient.facility?.name ||
                                reminder.event.patient.name}
                            </span>
                            <Badge
                              variant="outline"
                              className={
                                reminder.event.type === 'visit'
                                  ? 'border-emerald-500/50 text-emerald-400'
                                  : 'border-purple-500/50 text-purple-400'
                              }
                            >
                              {reminder.event.type === 'visit' ? '訪問' : '処方'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {getDateLabel(reminder.event.date)}
                            </span>
                            {reminder.event.time && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {reminder.event.time}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1">{reminder.message}</p>
                        </div>
                      </div>
                      {!reminder.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(reminder.id)}
                          className="text-gray-500 hover:text-gray-800"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 通知設定 */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          {/* 訪問リマインド */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Home className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-gray-800">訪問リマインド</CardTitle>
                    <CardDescription>訪問予定の通知設定</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="visitEnabled"
                    checked={settings.visitEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, visitEnabled: checked as boolean })
                    }
                  />
                  <Label htmlFor="visitEnabled" className="text-gray-600">
                    有効
                  </Label>
                </div>
              </div>
            </CardHeader>
            {settings.visitEnabled && (
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-500">通知タイミング</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {visitTimingOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2 p-3 rounded-lg bg-gray-50"
                    >
                      <Checkbox
                        id={`visit-${option.value}`}
                        checked={settings.visitTimings.includes(option.value)}
                        onCheckedChange={() => toggleTiming('visit', option.value)}
                      />
                      <Label
                        htmlFor={`visit-${option.value}`}
                        className="text-gray-600 cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* 処方リマインド */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Pill className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-gray-800">処方リマインド</CardTitle>
                    <CardDescription>処方予定の通知設定</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rxEnabled"
                    checked={settings.rxEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, rxEnabled: checked as boolean })
                    }
                  />
                  <Label htmlFor="rxEnabled" className="text-gray-600">
                    有効
                  </Label>
                </div>
              </div>
            </CardHeader>
            {settings.rxEnabled && (
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-500">通知タイミング</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {rxTimingOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2 p-3 rounded-lg bg-gray-50"
                    >
                      <Checkbox
                        id={`rx-${option.value}`}
                        checked={settings.rxTimings.includes(option.value)}
                        onCheckedChange={() => toggleTiming('rx', option.value)}
                      />
                      <Label
                        htmlFor={`rx-${option.value}`}
                        className="text-gray-600 cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          <Button
            onClick={saveSettings}
            disabled={saving}
            className="bg-emerald-500 hover:from-emerald-600 hover:to-cyan-600"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            設定を保存
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}




