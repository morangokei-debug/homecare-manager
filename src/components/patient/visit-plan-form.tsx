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
import { Loader2, Save, Copy, Trash2, FileDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

type PlanFields = {
  planMonth: string;
  periodStart: string;
  periodEnd: string;
  visitFrequency: string;
  issuesAndGoals: string;
  guidanceDetails: string;
  considerations: string;
  prescribingClinic: string;
  prescribingDoctor: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  patientId: string;
  planId?: string | null;
}

function defaultFields(): PlanFields {
  const today = new Date();
  const month = format(today, 'yyyy-MM');
  return {
    planMonth: month,
    periodStart: format(startOfMonth(today), 'yyyy-MM-dd'),
    periodEnd: format(endOfMonth(today), 'yyyy-MM-dd'),
    visitFrequency: '',
    issuesAndGoals: '',
    guidanceDetails: '',
    considerations: '',
    prescribingClinic: '',
    prescribingDoctor: '',
  };
}

export function VisitPlanForm({ open, onClose, onSaved, patientId, planId }: Props) {
  const [fields, setFields] = useState<PlanFields>(defaultFields());
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (planId) {
      fetch(`/api/visit-plans/${planId}`)
        .then((r) => r.json())
        .then((data) => {
          setFields({
            planMonth: data.planMonth,
            periodStart: format(new Date(data.periodStart), 'yyyy-MM-dd'),
            periodEnd: format(new Date(data.periodEnd), 'yyyy-MM-dd'),
            visitFrequency: data.visitFrequency || '',
            issuesAndGoals: data.issuesAndGoals || '',
            guidanceDetails: data.guidanceDetails || '',
            considerations: data.considerations || '',
            prescribingClinic: data.prescribingClinic || '',
            prescribingDoctor: data.prescribingDoctor || '',
          });
        });
    } else {
      setFields(defaultFields());
    }
  }, [open, planId]);

  const setField = (k: keyof PlanFields, v: string) => setFields((prev) => ({ ...prev, [k]: v }));

  // planMonth 変更時に期間を自動で合わせる
  const handleMonthChange = (v: string) => {
    setField('planMonth', v);
    if (/^\d{4}-\d{2}$/.test(v)) {
      const base = new Date(`${v}-01T00:00:00`);
      setField('periodStart', format(startOfMonth(base), 'yyyy-MM-dd'));
      setField('periodEnd', format(endOfMonth(base), 'yyyy-MM-dd'));
    }
  };

  const handleCopyPrevious = async () => {
    if (!confirm('前回の計画書の内容を読み込みます。現在の入力内容は上書きされます。よろしいですか？')) return;
    setCopying(true);
    try {
      const qs = new URLSearchParams({ patientId });
      if (planId) qs.append('excludeId', planId);
      const res = await fetch(`/api/visit-plans/latest?${qs.toString()}`);
      const data = await res.json();
      if (!data) {
        toast.info('過去の計画書がありません');
        return;
      }
      setFields((prev) => ({
        ...prev,
        visitFrequency: data.visitFrequency || '',
        issuesAndGoals: data.issuesAndGoals || '',
        guidanceDetails: data.guidanceDetails || '',
        considerations: data.considerations || '',
        prescribingClinic: data.prescribingClinic || '',
        prescribingDoctor: data.prescribingDoctor || '',
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
      const url = planId ? `/api/visit-plans/${planId}` : '/api/visit-plans';
      const method = planId ? 'PATCH' : 'POST';
      const payload = planId ? fields : { patientId, ...fields };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '保存に失敗しました');
      }
      toast.success(planId ? '計画書を更新しました' : '計画書を作成しました');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!planId) return;
    if (!confirm('この計画書を削除します。よろしいですか？')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/visit-plans/${planId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      toast.success('計画書を削除しました');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const handlePdf = () => {
    if (!planId) return;
    window.open(`/api/pdf/visit-plan/${planId}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>居宅療養管理指導 計画書（月次）</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>対象月 <span className="text-red-500">*</span></Label>
              <Input
                type="month"
                value={fields.planMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                required
                disabled={!!planId}
              />
            </div>
            <div className="space-y-2">
              <Label>期間（開始）</Label>
              <Input
                type="date"
                value={fields.periodStart}
                onChange={(e) => setField('periodStart', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>期間（終了）</Label>
              <Input
                type="date"
                value={fields.periodEnd}
                onChange={(e) => setField('periodEnd', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>処方医療機関</Label>
              <Input
                value={fields.prescribingClinic}
                onChange={(e) => setField('prescribingClinic', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>処方医師</Label>
              <Input
                value={fields.prescribingDoctor}
                onChange={(e) => setField('prescribingDoctor', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>訪問頻度・回数</Label>
            <Input
              value={fields.visitFrequency}
              onChange={(e) => setField('visitFrequency', e.target.value)}
              placeholder="例：月2回（第1・第3水曜日）"
            />
          </div>

          <div className="space-y-2">
            <Label>課題・目標</Label>
            <Textarea
              rows={3}
              value={fields.issuesAndGoals}
              onChange={(e) => setField('issuesAndGoals', e.target.value)}
              placeholder="服薬コンプライアンスの維持、副作用の早期発見など"
            />
          </div>

          <div className="space-y-2">
            <Label>管理指導の具体的内容</Label>
            <Textarea
              rows={4}
              value={fields.guidanceDetails}
              onChange={(e) => setField('guidanceDetails', e.target.value)}
              placeholder="服薬状況の確認、薬効・副作用のモニタリング、一包化の提供など"
            />
          </div>

          <div className="space-y-2">
            <Label>留意事項</Label>
            <Textarea
              rows={2}
              value={fields.considerations}
              onChange={(e) => setField('considerations', e.target.value)}
              placeholder="家族・介護者への情報提供、医師・ケアマネとの連携など"
            />
          </div>

          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              {planId && (
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
