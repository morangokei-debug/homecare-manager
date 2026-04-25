'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, Save, Copy, Trash2, FileDown, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DoctorMaster {
  id: string;
  clinicName: string;
  doctorName: string;
}

type ReportFields = {
  visitDate: string;
  prescribingClinic: string;
  prescribingDoctor: string;
  generalCondition: string;
  medicationStatus: string;
  sideEffects: string;
  treatmentEffect: string;
  understandingLevel: string;
  livingConditions: string;
  guidanceContent: string;
  reportToDoctor: string;
  nextVisitPlan: string;
  specialNotes: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  patientId: string;
  reportId?: string | null; // 既存編集時
  eventId?: string | null;  // カレンダーから開いた場合
  defaultDate?: string | null;
}

const EMPTY: ReportFields = {
  visitDate: format(new Date(), 'yyyy-MM-dd'),
  prescribingClinic: '',
  prescribingDoctor: '',
  generalCondition: '',
  medicationStatus: '',
  sideEffects: '',
  treatmentEffect: '',
  understandingLevel: '',
  livingConditions: '',
  guidanceContent: '',
  reportToDoctor: '',
  nextVisitPlan: '',
  specialNotes: '',
};

export function VisitReportForm({ open, onClose, onSaved, patientId, reportId, eventId, defaultDate }: Props) {
  const [fields, setFields] = useState<ReportFields>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [doctors, setDoctors] = useState<DoctorMaster[]>([]);

  useEffect(() => {
    fetch('/api/masters/doctors').then((r) => r.json()).then((d) => Array.isArray(d) && setDoctors(d));
  }, []);

  // 既存報告書を読み込み
  useEffect(() => {
    if (!open) return;
    if (reportId) {
      fetch(`/api/visit-reports/${reportId}`)
        .then((r) => r.json())
        .then((data) => {
          setFields({
            visitDate: format(new Date(data.visitDate), 'yyyy-MM-dd'),
            prescribingClinic: data.prescribingClinic || '',
            prescribingDoctor: data.prescribingDoctor || '',
            generalCondition: data.generalCondition || '',
            medicationStatus: data.medicationStatus || '',
            sideEffects: data.sideEffects || '',
            treatmentEffect: data.treatmentEffect || '',
            understandingLevel: data.understandingLevel || '',
            livingConditions: data.livingConditions || '',
            guidanceContent: data.guidanceContent || '',
            reportToDoctor: data.reportToDoctor || '',
            nextVisitPlan: data.nextVisitPlan || '',
            specialNotes: data.specialNotes || '',
          });
        });
    } else {
      setFields({
        ...EMPTY,
        visitDate: defaultDate || format(new Date(), 'yyyy-MM-dd'),
      });
    }
  }, [open, reportId, defaultDate]);

  const setField = (k: keyof ReportFields, v: string) => setFields((prev) => ({ ...prev, [k]: v }));

  const handleCopyPrevious = async () => {
    if (!confirm('前回の報告書の内容をフォームに読み込みます。現在の入力内容は上書きされます。よろしいですか？')) return;
    setCopying(true);
    try {
      const qs = new URLSearchParams({ patientId });
      if (reportId) qs.append('excludeId', reportId);
      const res = await fetch(`/api/visit-reports/latest?${qs.toString()}`);
      const data = await res.json();
      if (!data) {
        toast.info('過去の報告書がありません');
        return;
      }
      setFields((prev) => ({
        ...prev,
        prescribingClinic: data.prescribingClinic || '',
        prescribingDoctor: data.prescribingDoctor || '',
        generalCondition: data.generalCondition || '',
        medicationStatus: data.medicationStatus || '',
        sideEffects: data.sideEffects || '',
        treatmentEffect: data.treatmentEffect || '',
        understandingLevel: data.understandingLevel || '',
        livingConditions: data.livingConditions || '',
        guidanceContent: data.guidanceContent || '',
        reportToDoctor: data.reportToDoctor || '',
        nextVisitPlan: data.nextVisitPlan || '',
        specialNotes: data.specialNotes || '',
      }));
      toast.success('前回の内容を読み込みました');
    } finally {
      setCopying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = reportId ? `/api/visit-reports/${reportId}` : '/api/visit-reports';
      const method = reportId ? 'PATCH' : 'POST';
      const payload = reportId
        ? fields
        : { patientId, eventId: eventId || null, ...fields };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '保存に失敗しました');
      }
      const saved = await res.json();
      const savedId = reportId || saved.id;
      toast.success(reportId ? '報告書を更新しました' : '報告書を作成しました', {
        action: {
          label: 'PDFを開く',
          onClick: () => window.open(`/api/pdf/visit-report/${savedId}`, '_blank'),
        },
      });
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!reportId) return;
    if (!confirm('この報告書を削除します。よろしいですか？')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/visit-reports/${reportId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      toast.success('報告書を削除しました');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const handlePdf = () => {
    if (!reportId) return;
    window.open(`/api/pdf/visit-report/${reportId}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>訪問薬剤管理指導 報告書</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 前回コピー */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyPrevious}
              disabled={copying}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              {copying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Copy className="h-4 w-4 mr-1" />}
              前回の内容をコピー
            </Button>
          </div>

          {/* 訪問日・医師 */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>訪問日 <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={fields.visitDate}
                onChange={(e) => setField('visitDate', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>処方医師（マスタから選択）</Label>
              {doctors.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={doctors.find(d => d.doctorName === fields.prescribingDoctor && d.clinicName === fields.prescribingClinic)?.id || ''}
                    onChange={(e) => {
                      const doc = doctors.find((d) => d.id === e.target.value);
                      if (doc) {
                        setField('prescribingClinic', doc.clinicName);
                        setField('prescribingDoctor', doc.doctorName);
                      } else {
                        setField('prescribingClinic', '');
                        setField('prescribingDoctor', '');
                      }
                    }}
                  >
                    <option value="">-- 選択してください --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.doctorName}（{d.clinicName}）</option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={fields.prescribingClinic}
                  onChange={(e) => setField('prescribingClinic', e.target.value)}
                  placeholder="処方医療機関"
                />
                <Input
                  value={fields.prescribingDoctor}
                  onChange={(e) => setField('prescribingDoctor', e.target.value)}
                  placeholder="処方医師名"
                />
              </div>
            </div>
          </div>

          {/* 患者の状態 */}
          <div className="space-y-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">患者の状態</h3>
            <div className="space-y-2">
              <Label>全身状態</Label>
              <Textarea
                rows={2}
                value={fields.generalCondition}
                onChange={(e) => setField('generalCondition', e.target.value)}
                placeholder="バイタル、食事、睡眠など"
              />
            </div>
            <div className="space-y-2">
              <Label>服薬状況（残薬・飲み忘れ等）</Label>
              <Textarea
                rows={2}
                value={fields.medicationStatus}
                onChange={(e) => setField('medicationStatus', e.target.value)}
                placeholder="残薬○日、服薬コンプライアンス良好など"
              />
            </div>
            <div className="space-y-2">
              <Label>副作用・有害事象</Label>
              <Textarea
                rows={2}
                value={fields.sideEffects}
                onChange={(e) => setField('sideEffects', e.target.value)}
                placeholder="特記事項なし / ○○を訴える"
              />
            </div>
            <div className="space-y-2">
              <Label>薬物療法の効果</Label>
              <Textarea
                rows={2}
                value={fields.treatmentEffect}
                onChange={(e) => setField('treatmentEffect', e.target.value)}
                placeholder="血圧安定、痛み軽減など"
              />
            </div>
            <div className="space-y-2">
              <Label>理解度・アドヒアランス</Label>
              <Textarea
                rows={2}
                value={fields.understandingLevel}
                onChange={(e) => setField('understandingLevel', e.target.value)}
                placeholder="本人理解あり、家族によるサポートが必要など"
              />
            </div>
            <div className="space-y-2">
              <Label>生活状況</Label>
              <Textarea
                rows={2}
                value={fields.livingConditions}
                onChange={(e) => setField('livingConditions', e.target.value)}
                placeholder="ADL、介護状況など"
              />
            </div>
          </div>

          {/* 指導・医師報告 */}
          <div className="space-y-2">
            <Label>指導内容</Label>
            <Textarea
              rows={3}
              value={fields.guidanceContent}
              onChange={(e) => setField('guidanceContent', e.target.value)}
              placeholder="服薬タイミングの確認、一包化の提案など"
            />
          </div>
          <div className="space-y-2">
            <Label>医師への報告・提案事項</Label>
            <Textarea
              rows={3}
              value={fields.reportToDoctor}
              onChange={(e) => setField('reportToDoctor', e.target.value)}
              placeholder="処方変更の提案、副作用疑いの報告など"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>次回訪問予定</Label>
              <Input
                value={fields.nextVisitPlan}
                onChange={(e) => setField('nextVisitPlan', e.target.value)}
                placeholder="○月○日 午前"
              />
            </div>
            <div className="space-y-2">
              <Label>特記事項</Label>
              <Input
                value={fields.specialNotes}
                onChange={(e) => setField('specialNotes', e.target.value)}
                placeholder="家族への連絡事項など"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              {reportId && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePdf}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                    削除
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
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
