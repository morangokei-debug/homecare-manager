'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, Save, Trash2 } from 'lucide-react';
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
}

interface User {
  id: string;
  name: string;
}

export function EventDialog({ open, onClose, selectedDate, event }: EventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [formData, setFormData] = useState({
    type: 'visit' as 'visit' | 'prescription',
    date: '',
    startTime: '',
    endTime: '',
    patientId: '',
    assigneeId: '',
    notes: '',
    isCompleted: false,
  });

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch('/api/patients').then((res) => res.json()),
        fetch('/api/users').then((res) => res.json()),
      ]).then(([patientsData, usersData]) => {
        setPatients(patientsData);
        setUsers(usersData);
      });
    }
  }, [open]);

  useEffect(() => {
    if (event) {
      setFormData({
        type: event.type,
        date: event.date,
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        patientId: event.patientId,
        assigneeId: event.assigneeId || '',
        notes: event.notes || '',
        isCompleted: event.isCompleted,
      });
    } else if (selectedDate) {
      setFormData({
        type: 'visit',
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: '',
        endTime: '',
        patientId: '',
        assigneeId: '',
        notes: '',
        isCompleted: false,
      });
    }
  }, [event, selectedDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, String(value));
    });

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
            <Label className="text-slate-300">日付</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="bg-slate-700/50 border-slate-600"
            />
          </div>

          {/* 時間 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">開始時間</Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="bg-slate-700/50 border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">終了時間</Label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="bg-slate-700/50 border-slate-600"
              />
            </div>
          </div>

          {/* 患者 */}
          <div className="space-y-2">
            <Label className="text-slate-300">患者</Label>
            <Select
              value={formData.patientId}
              onValueChange={(value) => setFormData({ ...formData, patientId: value })}
              required
            >
              <SelectTrigger className="bg-slate-700/50 border-slate-600">
                <SelectValue placeholder="患者を選択" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </SelectItem>
                ))}
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

