'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Stethoscope, Users, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Doctor {
  id: string;
  clinicName: string;
  doctorName: string;
  phone: string | null;
  memo: string | null;
}

interface CareManager {
  id: string;
  name: string;
  officeName: string | null;
  phone: string | null;
  memo: string | null;
}

type DoctorForm = { clinicName: string; doctorName: string; address: string; phone: string; memo: string };
type CareManagerForm = { name: string; officeName: string; address: string; phone: string; memo: string };

const EMPTY_DOCTOR: DoctorForm = { clinicName: '', doctorName: '', address: '', phone: '', memo: '' };
const EMPTY_CM: CareManagerForm = { name: '', officeName: '', address: '', phone: '', memo: '' };

export default function MastersPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [careManagers, setCareManagers] = useState<CareManager[]>([]);
  const [loading, setLoading] = useState(true);

  // 医師ダイアログ
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [doctorForm, setDoctorForm] = useState<DoctorForm>(EMPTY_DOCTOR);
  const [savingDoctor, setSavingDoctor] = useState(false);

  // ケアマネダイアログ
  const [cmDialogOpen, setCmDialogOpen] = useState(false);
  const [editingCm, setEditingCm] = useState<CareManager | null>(null);
  const [cmForm, setCmForm] = useState<CareManagerForm>(EMPTY_CM);
  const [savingCm, setSavingCm] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [dRes, cRes] = await Promise.all([
      fetch('/api/masters/doctors'),
      fetch('/api/masters/care-managers'),
    ]);
    const [d, c] = await Promise.all([dRes.json(), cRes.json()]);
    setDoctors(d);
    setCareManagers(c);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── 医師 ──
  const openNewDoctor = () => {
    setEditingDoctor(null);
    setDoctorForm(EMPTY_DOCTOR);
    setDoctorDialogOpen(true);
  };
  const openEditDoctor = (d: Doctor) => {
    setEditingDoctor(d);
    setDoctorForm({ clinicName: d.clinicName, doctorName: d.doctorName, address: (d as Doctor & { address?: string }).address || '', phone: d.phone || '', memo: d.memo || '' });
    setDoctorDialogOpen(true);
  };
  const saveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDoctor(true);
    try {
      const url = editingDoctor ? `/api/masters/doctors/${editingDoctor.id}` : '/api/masters/doctors';
      const method = editingDoctor ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doctorForm) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(editingDoctor ? '医師情報を更新しました' : '医師を追加しました');
      setDoctorDialogOpen(false);
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSavingDoctor(false);
    }
  };
  const deleteDoctor = async (id: string) => {
    if (!confirm('この医師をマスタから削除しますか？')) return;
    const res = await fetch(`/api/masters/doctors/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('削除しました'); fetchAll(); }
    else toast.error('削除に失敗しました');
  };

  // ── ケアマネ ──
  const openNewCm = () => {
    setEditingCm(null);
    setCmForm(EMPTY_CM);
    setCmDialogOpen(true);
  };
  const openEditCm = (c: CareManager) => {
    setEditingCm(c);
    setCmForm({ name: c.name, officeName: c.officeName || '', address: (c as CareManager & { address?: string }).address || '', phone: c.phone || '', memo: c.memo || '' });
    setCmDialogOpen(true);
  };
  const saveCm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCm(true);
    try {
      const url = editingCm ? `/api/masters/care-managers/${editingCm.id}` : '/api/masters/care-managers';
      const method = editingCm ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cmForm) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(editingCm ? 'ケアマネ情報を更新しました' : 'ケアマネを追加しました');
      setCmDialogOpen(false);
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSavingCm(false);
    }
  };
  const deleteCm = async (id: string) => {
    if (!confirm('このケアマネージャーをマスタから削除しますか？')) return;
    const res = await fetch(`/api/masters/care-managers/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('削除しました'); fetchAll(); }
    else toast.error('削除に失敗しました');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">マスタ管理</h1>
        <p className="text-sm text-gray-500 mt-1">医師・ケアマネージャーの名前を登録しておくと、報告書・計画書作成時に選択できます</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* 医師マスタ */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-gray-800 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-emerald-500" />
                医師マスタ
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{doctors.length}件</Badge>
              </CardTitle>
              <Button onClick={openNewDoctor} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Plus className="h-4 w-4 mr-1" /> 追加
              </Button>
            </CardHeader>
            <CardContent>
              {doctors.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">まだ登録されていません</p>
              ) : (
                <div className="space-y-2">
                  {doctors.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800">{d.doctorName} 先生</p>
                        <p className="text-sm text-gray-500">{d.clinicName}{d.phone && ` ／ ${d.phone}`}</p>
                        {d.memo && <p className="text-xs text-gray-400 mt-0.5">{d.memo}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openEditDoctor(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteDoctor(d.id)} className="text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ケアマネマスタ */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-gray-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                ケアマネージャーマスタ
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">{careManagers.length}件</Badge>
              </CardTitle>
              <Button onClick={openNewCm} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                <Plus className="h-4 w-4 mr-1" /> 追加
              </Button>
            </CardHeader>
            <CardContent>
              {careManagers.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">まだ登録されていません</p>
              ) : (
                <div className="space-y-2">
                  {careManagers.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800">{c.name} 様</p>
                        <p className="text-sm text-gray-500">
                          {c.officeName && `${c.officeName}`}{c.phone && ` ／ ${c.phone}`}
                        </p>
                        {c.memo && <p className="text-xs text-gray-400 mt-0.5">{c.memo}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openEditCm(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteCm(c.id)} className="text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 医師ダイアログ */}
      <Dialog open={doctorDialogOpen} onOpenChange={setDoctorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDoctor ? '医師情報を編集' : '医師を追加'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveDoctor} className="space-y-4">
            <div className="space-y-2">
              <Label>医療機関名 <span className="text-red-500">*</span></Label>
              <Input
                value={doctorForm.clinicName}
                onChange={(e) => setDoctorForm((p) => ({ ...p, clinicName: e.target.value }))}
                placeholder="○○クリニック"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>医師名 <span className="text-red-500">*</span></Label>
              <Input
                value={doctorForm.doctorName}
                onChange={(e) => setDoctorForm((p) => ({ ...p, doctorName: e.target.value }))}
                placeholder="田中 一郎"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>住所（送付先）</Label>
              <Input
                value={doctorForm.address}
                onChange={(e) => setDoctorForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="〒000-0000 北九州市○○区..."
              />
            </div>
            <div className="space-y-2">
              <Label>電話番号</Label>
              <Input
                value={doctorForm.phone}
                onChange={(e) => setDoctorForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="093-000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label>メモ</Label>
              <Input
                value={doctorForm.memo}
                onChange={(e) => setDoctorForm((p) => ({ ...p, memo: e.target.value }))}
                placeholder="備考など"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDoctorDialogOpen(false)}>キャンセル</Button>
              <Button type="submit" disabled={savingDoctor} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {savingDoctor && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                保存
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ケアマネダイアログ */}
      <Dialog open={cmDialogOpen} onOpenChange={setCmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCm ? 'ケアマネ情報を編集' : 'ケアマネを追加'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveCm} className="space-y-4">
            <div className="space-y-2">
              <Label>氏名 <span className="text-red-500">*</span></Label>
              <Input
                value={cmForm.name}
                onChange={(e) => setCmForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="山田 花子"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>事業所名</Label>
              <Input
                value={cmForm.officeName}
                onChange={(e) => setCmForm((p) => ({ ...p, officeName: e.target.value }))}
                placeholder="○○居宅介護支援事業所"
              />
            </div>
            <div className="space-y-2">
              <Label>住所（送付先）</Label>
              <Input
                value={cmForm.address}
                onChange={(e) => setCmForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="〒000-0000 北九州市○○区..."
              />
            </div>
            <div className="space-y-2">
              <Label>電話番号</Label>
              <Input
                value={cmForm.phone}
                onChange={(e) => setCmForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="093-000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label>メモ</Label>
              <Input
                value={cmForm.memo}
                onChange={(e) => setCmForm((p) => ({ ...p, memo: e.target.value }))}
                placeholder="備考など"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCmDialogOpen(false)}>キャンセル</Button>
              <Button type="submit" disabled={savingCm} className="bg-blue-500 hover:bg-blue-600 text-white">
                {savingCm && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                保存
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
