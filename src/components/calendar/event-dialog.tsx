'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, addDays, addWeeks } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, Trash2, Home, Building2, Copy, ExternalLink, Users, CalendarPlus, AlertTriangle } from 'lucide-react';
import { createEvent, updateEvent, deleteEvent } from '@/app/actions/events';
import type { CalendarEvent } from '@/app/(dashboard)/calendar/page';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  event: CalendarEvent | null;
}

interface Patient {
  id: string;
  name: string;
  facilityId: string | null;
  facility: { id: string; name: string } | null;
  visitNotes: string | null;
}

interface User {
  id: string;
  name: string;
}

interface Facility {
  id: string;
  name: string;
}

type SelectionMode = 'patient' | 'facility';

export function EventDialog({ open, onClose, selectedDate, event }: EventDialogProps) {
  const { data: session } = useSession();
  const canEdit = session?.user?.role !== 'viewer';
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [patientFilter, setPatientFilter] = useState<'all' | 'individual' | string>('all');
  
  // 選択モード: 患者個人 or 施設全体
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('patient');
  
  // 複写機能
  const [copyMode, setCopyMode] = useState(false);
  const [copyType, setCopyType] = useState<'preset' | 'custom'>('preset');
  const [copyPreset, setCopyPreset] = useState<string>('7'); // 7, 14, 21, 28日
  const [copyWeeks, setCopyWeeks] = useState<string>('4'); // 週数
  const [copyCustomDays, setCopyCustomDays] = useState<string>(''); // カスタム日数（カンマ区切り）

  const [formData, setFormData] = useState({
    type: 'visit' as 'visit' | 'prescription' | 'both',
    date: '',
    time: '',
    patientId: '',
    facilityId: '',
    assigneeId: '',
    notes: '',
    isCompleted: false,
    isRecurring: false,
    recurringInterval: '',
    reportDone: false,
    planDone: false,
  });

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch('/api/patients?includeFacility=true').then((res) => res.json()),
        fetch('/api/users').then((res) => res.json()),
        fetch('/api/facilities').then((res) => res.json()),
      ]).then(([patientsData, usersData, facilitiesData]) => {
        setPatients(patientsData);
        setUsers(usersData);
        setFacilities(facilitiesData);
      });
    }
  }, [open]);

  useEffect(() => {
    // ダイアログが開くたびにコピーモードをリセット
    setCopyMode(false);
    setCopyType('preset');
    setCopyWeeks('4');
    setCopyCustomDays('');
    
    if (event) {
      // 施設全体の場合
      const isFacilityEvent = event.facilityId && !event.patientId;
      setSelectionMode(isFacilityEvent ? 'facility' : 'patient');
      
      setFormData({
        type: event.type,
        date: event.date,
        time: event.time || '',
        patientId: event.patientId || '',
        facilityId: event.facilityId || '',
        assigneeId: event.assigneeId || '',
        notes: event.notes || '',
        isCompleted: event.isCompleted,
        isRecurring: event.isRecurring || false,
        recurringInterval: event.recurringInterval?.toString() || '',
        reportDone: event.reportDone || false,
        planDone: event.planDone || false,
      });
    } else if (selectedDate) {
      setSelectionMode('patient');
      setFormData({
        type: 'visit',
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: '',
        patientId: '',
        facilityId: '',
        assigneeId: '',
        notes: '',
        isCompleted: false,
        isRecurring: false,
        recurringInterval: '',
        reportDone: false,
        planDone: false,
      });
    }
  }, [event, selectedDate]);

  // フィルタリングされた患者リスト
  const filteredPatients = useMemo(() => {
    if (patientFilter === 'all') {
      return patients;
    } else if (patientFilter === 'individual') {
      return patients.filter((p) => !p.facilityId);
    } else {
      return patients.filter((p) => p.facilityId === patientFilter);
    }
  }, [patients, patientFilter]);

  // 複写する日付リストを計算
  const getCopyDates = (): Date[] => {
    if (!copyMode || !formData.date) return [];
    
    const baseDate = new Date(formData.date);
    const dates: Date[] = [];
    
    if (copyType === 'preset') {
      // プリセット: 毎週同じ曜日に指定週数分
      const weeks = parseInt(copyWeeks) || 4;
      for (let i = 1; i <= weeks; i++) {
        dates.push(addWeeks(baseDate, i));
      }
    } else {
      // カスタム: カンマ区切りの日数
      const days = copyCustomDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d > 0);
      days.forEach(day => {
        dates.push(addDays(baseDate, day));
      });
    }
    
    return dates;
  };

  const copyDates = useMemo(() => getCopyDates(), [copyMode, copyType, copyPreset, copyWeeks, copyCustomDays, formData.date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const createEventData = (date: string) => {
      const data = new FormData();
      data.append('type', formData.type);
      data.append('date', date);
      data.append('time', formData.time);
      
      // 選択モードに応じてpatientIdまたはfacilityIdを送信
      if (selectionMode === 'facility') {
        data.append('facilityId', formData.facilityId);
        data.append('patientId', ''); // 空文字を送信
      } else {
        data.append('patientId', formData.patientId);
        data.append('facilityId', '');
      }
      
      data.append('assigneeId', formData.assigneeId);
      data.append('notes', formData.notes);
      data.append('isCompleted', String(false));
      data.append('isRecurring', String(formData.isRecurring));
      data.append('recurringInterval', formData.recurringInterval);
      data.append('reportDone', String(false));
      data.append('planDone', String(false));
      
      return data;
    };

    let result;
    if (event) {
      // 既存イベントの更新
      const data = createEventData(formData.date);
      data.append('id', event.id);
      data.append('isCompleted', String(formData.isCompleted));
      data.append('reportDone', String(formData.reportDone));
      data.append('planDone', String(formData.planDone));
      result = await updateEvent(data);
    } else {
      // 新規作成（メインの日付）
      result = await createEvent(createEventData(formData.date));
      
      // 複写モードの場合、追加の日付にも作成
      if (result.success && copyMode && copyDates.length > 0) {
        for (const copyDate of copyDates) {
          const copyResult = await createEvent(createEventData(format(copyDate, 'yyyy-MM-dd')));
          if (!copyResult.success) {
            console.error('Failed to create copy:', copyResult.error);
          }
        }
      }
    }

    if (result.success) {
      onClose();
    } else {
      alert(result.error || '保存に失敗しました');
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!event || !confirm('このイベントを削除しますか？')) return;

    setDeleting(true);
    const result = await deleteEvent(event.id);

    if (result.success) {
      onClose();
    } else {
      alert(result.error || '削除に失敗しました');
    }
    setDeleting(false);
  }

  // 次回作成機能
  function handleCreateNext() {
    if (!event || !formData.recurringInterval) return;
    
    const interval = parseInt(formData.recurringInterval);
    if (isNaN(interval) || interval <= 0) return;

    const currentDate = new Date(event.date);
    currentDate.setDate(currentDate.getDate() + interval);
    
    setFormData({
      ...formData,
      date: format(currentDate, 'yyyy-MM-dd'),
      isCompleted: false,
      reportDone: false,
      planDone: false,
    });
  }

  // 既存イベントをコピー
  async function handleCopyEvent(days: number) {
    if (!event) return;
    
    const newDate = addDays(new Date(event.date), days);
    const confirmMessage = `${format(newDate, 'M月d日(E)', { locale: ja })}にコピーを作成しますか？`;
    
    if (!confirm(confirmMessage)) return;
    
    setLoading(true);
    
    const data = new FormData();
    data.append('type', formData.type);
    data.append('date', format(newDate, 'yyyy-MM-dd'));
    data.append('time', formData.time);
    
    if (selectionMode === 'facility') {
      data.append('facilityId', formData.facilityId);
      data.append('patientId', '');
    } else {
      data.append('patientId', formData.patientId);
      data.append('facilityId', '');
    }
    
    data.append('assigneeId', formData.assigneeId);
    data.append('notes', formData.notes);
    data.append('isCompleted', 'false');
    data.append('isRecurring', String(formData.isRecurring));
    data.append('recurringInterval', formData.recurringInterval);
    data.append('reportDone', 'false');
    data.append('planDone', 'false');
    
    const result = await createEvent(data);
    
    if (result.success) {
      alert(`${format(newDate, 'M月d日(E)', { locale: ja })}にコピーを作成しました`);
      onClose();
    } else {
      alert(result.error || 'コピーに失敗しました');
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-white border-gray-200 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-800">
            {!canEdit ? 'イベント詳細' : event ? 'イベント編集' : '新規イベント登録'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* イベント種別 */}
          <div className="space-y-2">
            <Label className="text-gray-600">種別</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'visit' | 'prescription' | 'both') =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visit">🏠 訪問</SelectItem>
                <SelectItem value="prescription">💊 処方</SelectItem>
                <SelectItem value="both">🏠💊 訪問+処方</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 日付 */}
          <div className="space-y-2">
            <Label className="text-gray-600">日付 <span className="text-red-400">*</span></Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="bg-gray-50 border-gray-200 text-gray-800"
            />
          </div>

          {/* 複写機能（新規作成時のみ） */}
          {!event && canEdit && (
            <div className="space-y-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copyMode"
                  checked={copyMode}
                  onCheckedChange={(checked) => setCopyMode(checked as boolean)}
                />
                <Label htmlFor="copyMode" className="text-gray-700 font-medium flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4 text-blue-500" />
                  複数日に一括登録
                </Label>
              </div>
              
              {copyMode && (
                <div className="space-y-3 pt-2">
                  {/* 複写タイプ選択 */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCopyType('preset')}
                      className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                        copyType === 'preset'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      週単位で複写
                    </button>
                    <button
                      type="button"
                      onClick={() => setCopyType('custom')}
                      className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
                        copyType === 'custom'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      日数指定
                    </button>
                  </div>

                  {copyType === 'preset' ? (
                    <div className="space-y-2">
                      <Label className="text-gray-600 text-sm">何週間分コピーしますか？</Label>
                      <Select value={copyWeeks} onValueChange={setCopyWeeks}>
                        <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1週間（+7日）</SelectItem>
                          <SelectItem value="2">2週間（+7, 14日）</SelectItem>
                          <SelectItem value="3">3週間（+7, 14, 21日）</SelectItem>
                          <SelectItem value="4">4週間（+7, 14, 21, 28日）</SelectItem>
                          <SelectItem value="8">8週間分</SelectItem>
                          <SelectItem value="12">12週間分</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-gray-600 text-sm">
                        何日後にコピー？（カンマ区切り）
                      </Label>
                      <Input
                        value={copyCustomDays}
                        onChange={(e) => setCopyCustomDays(e.target.value)}
                        placeholder="例: 7, 14, 28"
                        className="bg-white border-gray-200 text-gray-800"
                      />
                      <p className="text-xs text-gray-400">
                        例: &quot;7, 14, 28&quot; → 7日後、14日後、28日後にコピー
                      </p>
                    </div>
                  )}

                  {/* プレビュー */}
                  {copyDates.length > 0 && (
                    <div className="p-2 bg-white rounded border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">作成される日付:</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                          {formData.date && format(new Date(formData.date), 'M/d(E)', { locale: ja })}
                        </span>
                        {copyDates.map((date, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {format(date, 'M/d(E)', { locale: ja })}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        計 {copyDates.length + 1} 件登録されます
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 予定時刻（任意） */}
          <div className="space-y-2">
            <Label className="text-gray-600">
              予定時刻
              <span className="text-gray-400 text-xs ml-2">（任意）</span>
            </Label>
            <Input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="bg-gray-50 border-gray-200 text-gray-800"
            />
          </div>

          {/* 訪問先選択モード */}
          <div className="space-y-2">
            <Label className="text-gray-600">訪問先タイプ</Label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setSelectionMode('patient');
                  setFormData({ ...formData, facilityId: '' });
                }}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  selectionMode === 'patient'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Home className="h-4 w-4" />
                患者個人
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectionMode('facility');
                  setFormData({ ...formData, patientId: '' });
                  setPatientFilter('all');
                }}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 flex items-center justify-center gap-2 ${
                  selectionMode === 'facility'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Building2 className="h-4 w-4" />
                施設全体
              </button>
            </div>
          </div>

          {selectionMode === 'patient' ? (
            <>
              {/* 患者フィルタ */}
              <div className="space-y-2">
                <Label className="text-gray-600">患者を絞り込み</Label>
                <Select
                  value={patientFilter}
                  onValueChange={(value) => setPatientFilter(value)}
                >
                  <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <span>📋</span>
                        <span>すべての患者</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="individual">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-emerald-400" />
                        <span>個人宅のみ</span>
                      </div>
                    </SelectItem>
                    {facilities.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs text-gray-400 border-t border-gray-200 mt-1">
                          施設で絞り込み
                        </div>
                        {facilities.map((facility) => (
                          <SelectItem key={facility.id} value={facility.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-blue-400" />
                              <span>{facility.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* 患者選択 */}
              <div className="space-y-2">
                <Label className="text-gray-600">
                  患者 <span className="text-red-400">*</span>
                  <span className="text-gray-400 text-xs ml-2">
                    ({filteredPatients.length}名)
                  </span>
                </Label>
                <Select
                  value={formData.patientId}
                  onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                  required
                >
                  <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                    <SelectValue placeholder="患者を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPatients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        <div className="flex items-center gap-2">
                          {patient.facility ? (
                            <Building2 className="h-3.5 w-3.5 text-blue-400" />
                          ) : (
                            <Home className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                          <span>{patient.name}</span>
                          {patient.facility && (
                            <span className="text-xs text-gray-500">
                              ({patient.facility.name})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    {filteredPatients.length === 0 && (
                      <div className="px-2 py-4 text-center text-gray-400 text-sm">
                        該当する患者がいません
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {formData.patientId && (
                  <Link href={`/patients/${formData.patientId}`} target="_blank">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full border-emerald-300 text-emerald-600 hover:bg-emerald-50 mt-2"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      患者詳細を開く
                    </Button>
                  </Link>
                )}
                {/* 訪問時注意事項 */}
                {formData.patientId && (() => {
                  const selectedPatient = patients.find(p => p.id === formData.patientId);
                  if (selectedPatient?.visitNotes) {
                    return (
                      <div className="mt-3 p-3 rounded-lg border-2 border-amber-300 bg-amber-50">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">訪問時の注意事項</p>
                            <p className="text-sm text-amber-700 mt-1 whitespace-pre-wrap">{selectedPatient.visitNotes}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </>
          ) : (
            /* 施設全体選択 */
            <div className="space-y-2">
              <Label className="text-gray-600">
                施設 <span className="text-red-400">*</span>
              </Label>
              <Select
                value={formData.facilityId}
                onValueChange={(value) => setFormData({ ...formData, facilityId: value })}
                required
              >
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                  <SelectValue placeholder="施設を選択" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-400" />
                        <span>{facility.name}</span>
                        <Users className="h-3 w-3 text-gray-400 ml-1" />
                      </div>
                    </SelectItem>
                  ))}
                  {facilities.length === 0 && (
                    <div className="px-2 py-4 text-center text-gray-400 text-sm">
                      施設が登録されていません
                    </div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                施設全体への訪問として登録されます
              </p>
            </div>
          )}

          {/* 担当者 */}
          <div className="space-y-2">
            <Label className="text-gray-600">担当者</Label>
            <Select
              value={formData.assigneeId}
              onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
            >
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                <SelectValue placeholder="担当者を選択（任意）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未割当</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 定期処方設定（処方の場合のみ） */}
          {formData.type === 'prescription' && (
            <div className="space-y-3 p-3 rounded-lg bg-gray-100/30 border border-gray-200">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isRecurring: checked as boolean })
                  }
                />
                <Label htmlFor="isRecurring" className="text-gray-600">
                  定期処方
                </Label>
              </div>
              {formData.isRecurring && (
                <div className="space-y-2">
                  <Label className="text-gray-600 text-sm">間隔（日数）</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.recurringInterval}
                    onChange={(e) =>
                      setFormData({ ...formData, recurringInterval: e.target.value })
                    }
                    placeholder="例: 28"
                    className="bg-gray-50 border-gray-200 text-gray-800"
                  />
                  {event && formData.recurringInterval && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCreateNext}
                      className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      次回分を作成（+{formData.recurringInterval}日）
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 備考 */}
          <div className="space-y-2">
            <Label className="text-gray-600">備考</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="メモを入力"
              rows={3}
              className="bg-gray-50 border-gray-200 text-gray-800 resize-none"
            />
          </div>

          {/* 既存イベントからのコピー機能 */}
          {event && canEdit && (
            <div className="space-y-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Label className="text-gray-700 font-medium flex items-center gap-2">
                <Copy className="h-4 w-4 text-blue-500" />
                先の予定をコピー作成
              </Label>
              
              {/* クイックコピー */}
              <div className="space-y-2">
                <p className="text-xs text-gray-600 font-medium">クイックコピー</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleCopyEvent(7)} className="border-blue-300 text-blue-600 hover:bg-blue-100">+7日後</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleCopyEvent(14)} className="border-blue-300 text-blue-600 hover:bg-blue-100">+14日後</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleCopyEvent(28)} className="border-blue-300 text-blue-600 hover:bg-blue-100">+28日後</Button>
                </div>
              </div>

              {/* 日数指定コピー */}
              <div className="space-y-2 pt-2 border-t border-blue-200">
                <p className="text-xs text-gray-600 font-medium">日数分一括コピー</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="日数"
                    className="w-20 bg-white border-blue-200 text-gray-800 text-sm"
                    id="bulkCopyDays"
                  />
                  <span className="text-sm text-gray-600">日分コピー</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const input = document.getElementById('bulkCopyDays') as HTMLInputElement;
                      const days = parseInt(input?.value || '0');
                      if (days <= 0) {
                        alert('1以上の日数を入力してください');
                        return;
                      }
                      if (days > 365) {
                        alert('365日以下で入力してください');
                        return;
                      }
                      if (!confirm(`${days}件の予定を作成します。よろしいですか？`)) return;
                      
                      setLoading(true);
                      let successCount = 0;
                      for (let i = 1; i <= days; i++) {
                        const newDate = addDays(new Date(event.date), i);
                        const data = new FormData();
                        data.append('type', formData.type);
                        data.append('date', format(newDate, 'yyyy-MM-dd'));
                        data.append('time', formData.time);
                        if (selectionMode === 'facility') {
                          data.append('facilityId', formData.facilityId);
                          data.append('patientId', '');
                        } else {
                          data.append('patientId', formData.patientId);
                          data.append('facilityId', '');
                        }
                        data.append('assigneeId', formData.assigneeId);
                        data.append('notes', formData.notes);
                        data.append('isCompleted', 'false');
                        data.append('isRecurring', String(formData.isRecurring));
                        data.append('recurringInterval', formData.recurringInterval);
                        data.append('reportDone', 'false');
                        data.append('planDone', 'false');
                        const result = await createEvent(data);
                        if (result.success) successCount++;
                      }
                      setLoading(false);
                      alert(`${successCount}件の予定を作成しました`);
                      onClose();
                    }}
                    className="border-blue-300 text-blue-600 hover:bg-blue-100"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '作成'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">翌日から指定日数分、毎日の予定を一括作成</p>
              </div>

              {/* 期限指定コピー */}
              <div className="space-y-2 pt-2 border-t border-blue-200">
                <p className="text-xs text-gray-600 font-medium">期限指定コピー</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    type="date"
                    className="w-40 bg-white border-blue-200 text-gray-800 text-sm"
                    id="copyUntilDate"
                    min={format(addDays(new Date(event.date), 1), 'yyyy-MM-dd')}
                  />
                  <span className="text-sm text-gray-600">まで</span>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    defaultValue="7"
                    placeholder="間隔"
                    className="w-16 bg-white border-blue-200 text-gray-800 text-sm"
                    id="copyInterval"
                  />
                  <span className="text-sm text-gray-600">日ごと</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const dateInput = document.getElementById('copyUntilDate') as HTMLInputElement;
                      const intervalInput = document.getElementById('copyInterval') as HTMLInputElement;
                      const endDate = dateInput?.value ? new Date(dateInput.value) : null;
                      const interval = parseInt(intervalInput?.value || '7');
                      
                      if (!endDate) {
                        alert('終了日を選択してください');
                        return;
                      }
                      if (interval < 1 || interval > 30) {
                        alert('間隔は1〜30日で入力してください');
                        return;
                      }
                      
                      const baseDate = new Date(event.date);
                      const datesToCreate: Date[] = [];
                      let currentDate = addDays(baseDate, interval);
                      while (currentDate <= endDate) {
                        datesToCreate.push(new Date(currentDate));
                        currentDate = addDays(currentDate, interval);
                      }
                      
                      if (datesToCreate.length === 0) {
                        alert('指定した条件では予定を作成できません');
                        return;
                      }
                      
                      if (!confirm(`${datesToCreate.length}件の予定を作成します。よろしいですか？`)) return;
                      
                      setLoading(true);
                      let successCount = 0;
                      for (const newDate of datesToCreate) {
                        const data = new FormData();
                        data.append('type', formData.type);
                        data.append('date', format(newDate, 'yyyy-MM-dd'));
                        data.append('time', formData.time);
                        if (selectionMode === 'facility') {
                          data.append('facilityId', formData.facilityId);
                          data.append('patientId', '');
                        } else {
                          data.append('patientId', formData.patientId);
                          data.append('facilityId', '');
                        }
                        data.append('assigneeId', formData.assigneeId);
                        data.append('notes', formData.notes);
                        data.append('isCompleted', 'false');
                        data.append('isRecurring', String(formData.isRecurring));
                        data.append('recurringInterval', formData.recurringInterval);
                        data.append('reportDone', 'false');
                        data.append('planDone', 'false');
                        const result = await createEvent(data);
                        if (result.success) successCount++;
                      }
                      setLoading(false);
                      alert(`${successCount}件の予定を作成しました`);
                      onClose();
                    }}
                    className="border-blue-300 text-blue-600 hover:bg-blue-100"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '作成'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">指定日まで、指定間隔で繰り返し予定を作成</p>
              </div>
            </div>
          )}

          {/* 書類チェック */}
          {event && (
            <div className="space-y-3 p-3 rounded-lg bg-gray-100/30 border border-gray-200">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reportDone"
                  checked={formData.reportDone}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, reportDone: checked as boolean })
                  }
                />
                <Label htmlFor="reportDone" className="text-gray-700 font-medium">
                  📄 報告書 記載済み
                </Label>
              </div>
              <div className="flex items-center space-x-2 pl-1">
                <Checkbox
                  id="planDone"
                  checked={formData.planDone}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, planDone: checked as boolean })
                  }
                  className="h-3.5 w-3.5"
                />
                <Label htmlFor="planDone" className="text-gray-500 text-sm">
                  📋 計画書 記載済み（該当時のみ）
                </Label>
              </div>
            </div>
          )}

          {/* ボタン */}
          <div className="flex justify-between pt-4">
            {event && canEdit ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={deleting}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    削除
                  </>
                )}
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                {canEdit ? 'キャンセル' : '閉じる'}
              </Button>
              {canEdit && (
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      保存
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
