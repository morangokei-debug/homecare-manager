'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
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
import { Loader2, Save, Trash2, Home, Building2 } from 'lucide-react';
import { createEvent, updateEvent, deleteEvent } from '@/app/actions/events';
import type { CalendarEvent } from '@/app/(dashboard)/calendar/page';

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
}

interface User {
  id: string;
  name: string;
}

interface Facility {
  id: string;
  name: string;
}

export function EventDialog({ open, onClose, selectedDate, event }: EventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [patientFilter, setPatientFilter] = useState<'all' | 'individual' | 'facility' | string>('all');

  const [formData, setFormData] = useState({
    type: 'visit' as 'visit' | 'prescription',
    date: '',
    time: '',
    patientId: '',
    assigneeId: '',
    notes: '',
    isCompleted: false,
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
    if (event) {
      setFormData({
        type: event.type,
        date: event.date,
        time: event.time || '',
        patientId: event.patientId,
        assigneeId: event.assigneeId || '',
        notes: event.notes || '',
        isCompleted: event.isCompleted,
      });
    } else if (selectedDate) {
      setFormData({
        type: 'visit',
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: '',
        patientId: '',
        assigneeId: '',
        notes: '',
        isCompleted: false,
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
      // 特定の施設でフィルタ
      return patients.filter((p) => p.facilityId === patientFilter);
    }
  }, [patients, patientFilter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append('type', formData.type);
    data.append('date', formData.date);
    data.append('time', formData.time);
    data.append('patientId', formData.patientId);
    data.append('assigneeId', formData.assigneeId);
    data.append('notes', formData.notes);
    data.append('isCompleted', String(formData.isCompleted));

    let result;
    if (event) {
      data.append('id', event.id);
      result = await updateEvent(data);
    } else {
      result = await createEvent(data);
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? 'イベント編集' : '新規イベント登録'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* イベント種別 */}
          <div className="space-y-2">
            <Label className="text-slate-300">種別</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'visit' | 'prescription') =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger className="bg-slate-700/50 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visit">🏠 訪問</SelectItem>
                <SelectItem value="prescription">💊 処方</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 日付 */}
          <div className="space-y-2">
            <Label className="text-slate-300">日付 <span className="text-red-400">*</span></Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="bg-slate-700/50 border-slate-600"
            />
          </div>

          {/* 予定時刻（任意） */}
          <div className="space-y-2">
            <Label className="text-slate-300">
              予定時刻
              <span className="text-slate-500 text-xs ml-2">（任意：空欄でタスクとして登録）</span>
            </Label>
            <Input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="bg-slate-700/50 border-slate-600"
            />
          </div>

          {/* 患者フィルタ */}
          <div className="space-y-2">
            <Label className="text-slate-300">患者を絞り込み</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={patientFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setPatientFilter('all')}
                className={patientFilter === 'all' 
                  ? 'bg-slate-600' 
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
              >
                すべて
              </Button>
              <Button
                type="button"
                size="sm"
                variant={patientFilter === 'individual' ? 'default' : 'outline'}
                onClick={() => setPatientFilter('individual')}
                className={patientFilter === 'individual' 
                  ? 'bg-emerald-600' 
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
              >
                <Home className="h-3.5 w-3.5 mr-1" />
                個人宅
              </Button>
              {facilities.map((facility) => (
                <Button
                  key={facility.id}
                  type="button"
                  size="sm"
                  variant={patientFilter === facility.id ? 'default' : 'outline'}
                  onClick={() => setPatientFilter(facility.id)}
                  className={patientFilter === facility.id 
                    ? 'bg-blue-600' 
                    : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
                >
                  <Building2 className="h-3.5 w-3.5 mr-1" />
                  {facility.name}
                </Button>
              ))}
            </div>
          </div>

          {/* 患者 */}
          <div className="space-y-2">
            <Label className="text-slate-300">
              患者 <span className="text-red-400">*</span>
              <span className="text-slate-500 text-xs ml-2">
                ({filteredPatients.length}名)
              </span>
            </Label>
            <Select
              value={formData.patientId}
              onValueChange={(value) => setFormData({ ...formData, patientId: value })}
              required
            >
              <SelectTrigger className="bg-slate-700/50 border-slate-600">
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
                        <span className="text-xs text-slate-400">
                          ({patient.facility.name})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {filteredPatients.length === 0 && (
                  <div className="px-2 py-4 text-center text-slate-500 text-sm">
                    該当する患者がいません
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 担当者 */}
          <div className="space-y-2">
            <Label className="text-slate-300">担当者</Label>
            <Select
              value={formData.assigneeId}
              onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
            >
              <SelectTrigger className="bg-slate-700/50 border-slate-600">
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

          {/* 備考 */}
          <div className="space-y-2">
            <Label className="text-slate-300">備考</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="メモを入力"
              rows={3}
              className="bg-slate-700/50 border-slate-600 resize-none"
            />
          </div>

          {/* 完了フラグ */}
          {event && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isCompleted"
                checked={formData.isCompleted}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isCompleted: checked as boolean })
                }
              />
              <Label htmlFor="isCompleted" className="text-slate-300">
                完了済みにする
              </Label>
            </div>
          )}

          {/* ボタン */}
          <div className="flex justify-between pt-4">
            {event ? (
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
                className="border-slate-600"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
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
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
