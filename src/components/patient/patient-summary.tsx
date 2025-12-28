'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { AlertTriangle, Phone, Edit2, X, Check, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createOrUpdatePatientSummary, PatientSummaryInput } from '@/app/actions/patient-summary';
import { ApproachType } from '@prisma/client';

interface PatientSummaryData {
  id: string;
  patientId: string;
  cautionMedicationRefusal: boolean;
  cautionUnderstandingDifficulty: boolean;
  cautionFamilyPresenceRequired: boolean;
  cautionTimeRestriction: boolean;
  cautionTroubleRisk: boolean;
  cautionOther: boolean;
  cautionOtherText: string | null;
  prohibitedActions: string | null;
  approachType: ApproachType;
  approachNote: string | null;
  primaryContactName: string;
  primaryContactRelation: string;
  primaryContactPhone: string;
  secondaryContactName: string | null;
  secondaryContactRelation: string | null;
  secondaryContactPhone: string | null;
  recentChanges: string;
  recentChangesUpdatedAt: Date | string;
  freeNote: string | null;
  updatedAt: Date | string;
  recentChangesUpdater?: { name: string };
  updater?: { name: string };
}

interface Props {
  patientId: string;
  patientName: string;
  summary: PatientSummaryData | null;
}

const CAUTION_LABELS = {
  cautionMedicationRefusal: '服薬拒否・飲み忘れが多い',
  cautionUnderstandingDifficulty: '説明理解が困難（認知症・難聴など）',
  cautionFamilyPresenceRequired: '家族・施設職員の同席が必要',
  cautionTimeRestriction: '時間帯・曜日の制約あり',
  cautionTroubleRisk: '急な変更・トラブルが起きやすい',
};

const APPROACH_LABELS: Record<ApproachType, string> = {
  normal: '通常対応で問題なし',
  careful: '慎重な対応が必要',
  contact_first: '事前連絡をしてから対応',
};

export function PatientSummary({ patientId, patientName, summary }: Props) {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = session?.user?.role === 'super_admin' || session?.user?.role === 'admin' || session?.user?.role === 'staff';

  // 注意患者判定
  const cautionCount = summary
    ? [
        summary.cautionMedicationRefusal,
        summary.cautionUnderstandingDifficulty,
        summary.cautionFamilyPresenceRequired,
        summary.cautionTimeRestriction,
        summary.cautionTroubleRisk,
        summary.cautionOther,
      ].filter(Boolean).length
    : 0;

  const isWarningPatient = cautionCount > 0;

  // 編集フォームの状態
  const [formData, setFormData] = useState<PatientSummaryInput>({
    patientId,
    cautionMedicationRefusal: summary?.cautionMedicationRefusal ?? false,
    cautionUnderstandingDifficulty: summary?.cautionUnderstandingDifficulty ?? false,
    cautionFamilyPresenceRequired: summary?.cautionFamilyPresenceRequired ?? false,
    cautionTimeRestriction: summary?.cautionTimeRestriction ?? false,
    cautionTroubleRisk: summary?.cautionTroubleRisk ?? false,
    cautionOther: summary?.cautionOther ?? false,
    cautionOtherText: summary?.cautionOtherText ?? '',
    prohibitedActions: summary?.prohibitedActions ?? '',
    approachType: summary?.approachType ?? 'normal',
    approachNote: summary?.approachNote ?? '',
    primaryContactName: summary?.primaryContactName ?? '',
    primaryContactRelation: summary?.primaryContactRelation ?? '',
    primaryContactPhone: summary?.primaryContactPhone ?? '',
    secondaryContactName: summary?.secondaryContactName ?? '',
    secondaryContactRelation: summary?.secondaryContactRelation ?? '',
    secondaryContactPhone: summary?.secondaryContactPhone ?? '',
    recentChanges: summary?.recentChanges ?? '',
    freeNote: summary?.freeNote ?? '',
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors([]);

    const result = await createOrUpdatePatientSummary(formData);

    if (result.success) {
      setIsEditing(false);
      window.location.reload();
    } else {
      setErrors(result.errors || ['保存に失敗しました']);
    }

    setIsSubmitting(false);
  };

  const openEditDialog = () => {
    setFormData({
      patientId,
      cautionMedicationRefusal: summary?.cautionMedicationRefusal ?? false,
      cautionUnderstandingDifficulty: summary?.cautionUnderstandingDifficulty ?? false,
      cautionFamilyPresenceRequired: summary?.cautionFamilyPresenceRequired ?? false,
      cautionTimeRestriction: summary?.cautionTimeRestriction ?? false,
      cautionTroubleRisk: summary?.cautionTroubleRisk ?? false,
      cautionOther: summary?.cautionOther ?? false,
      cautionOtherText: summary?.cautionOtherText ?? '',
      prohibitedActions: summary?.prohibitedActions ?? '',
      approachType: summary?.approachType ?? 'normal',
      approachNote: summary?.approachNote ?? '',
      primaryContactName: summary?.primaryContactName ?? '',
      primaryContactRelation: summary?.primaryContactRelation ?? '',
      primaryContactPhone: summary?.primaryContactPhone ?? '',
      secondaryContactName: summary?.secondaryContactName ?? '',
      secondaryContactRelation: summary?.secondaryContactRelation ?? '',
      secondaryContactPhone: summary?.secondaryContactPhone ?? '',
      recentChanges: summary?.recentChanges ?? '',
      freeNote: summary?.freeNote ?? '',
    });
    setErrors([]);
    setIsEditing(true);
  };

  // サマリーが未作成の場合
  if (!summary) {
    return (
      <Card className="border-2 border-dashed border-orange-300 bg-orange-50 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            引き継ぎサマリー（必読）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            この患者の引き継ぎサマリーはまだ作成されていません。
            <br />
            初見のスタッフが安全に対応できるよう、サマリーを作成してください。
          </p>
          {canEdit && (
            <Button onClick={openEditDialog} variant="default">
              <Edit2 className="h-4 w-4 mr-2" />
              サマリーを作成
            </Button>
          )}

          <EditDialog
            isOpen={isEditing}
            onClose={() => setIsEditing(false)}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            errors={errors}
            isSubmitting={isSubmitting}
            patientName={patientName}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card
        className={`mb-6 ${
          isWarningPatient
            ? 'border-2 border-red-400 bg-red-50'
            : 'border-2 border-blue-300 bg-blue-50'
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle
                className={`h-5 w-5 ${isWarningPatient ? 'text-red-500' : 'text-blue-500'}`}
              />
              引き継ぎサマリー（必読）
              {isWarningPatient && (
                <Badge variant="destructive" className="ml-2">
                  注意患者（{cautionCount}項目）
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>
                最終更新: {format(new Date(summary.updatedAt), 'M/d HH:mm', { locale: ja })}
              </span>
              {summary.updater && <span>({summary.updater.name})</span>}
              {canEdit && (
                <Button variant="outline" size="sm" onClick={openEditDialog}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ① 対応時の最重要注意点 */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
              ① 対応時の最重要注意点
            </h4>
            <div className="bg-white rounded-md p-3 space-y-1">
              {Object.entries(CAUTION_LABELS).map(([key, label]) => {
                const isChecked = summary[key as keyof typeof CAUTION_LABELS];
                return (
                  <div key={key} className="flex items-center gap-2">
                    {isChecked ? (
                      <Check className="h-4 w-4 text-red-500" />
                    ) : (
                      <span className="h-4 w-4" />
                    )}
                    <span className={isChecked ? 'text-red-700 font-medium' : 'text-gray-400'}>
                      {label}
                    </span>
                  </div>
                );
              })}
              {summary.cautionOther && (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-red-500" />
                  <span className="text-red-700 font-medium">
                    その他注意あり → {summary.cautionOtherText}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ② 絶対に守ること */}
          {summary.prohibitedActions && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                <Ban className="h-4 w-4 text-red-500" />
                ② 絶対に守ること（やってはいけないこと）
              </h4>
              <div className="bg-red-100 border border-red-300 rounded-md p-3">
                <p className="text-red-800 whitespace-pre-wrap">{summary.prohibitedActions}</p>
              </div>
            </div>
          )}

          {/* ③ 対応の基本方針 */}
          <div>
            <h4 className="font-semibold text-sm mb-2">③ 対応の基本方針</h4>
            <div className="bg-white rounded-md p-3">
              <Badge
                variant={
                  summary.approachType === 'normal'
                    ? 'secondary'
                    : summary.approachType === 'careful'
                    ? 'default'
                    : 'destructive'
                }
              >
                {APPROACH_LABELS[summary.approachType]}
              </Badge>
              {summary.approachNote && (
                <p className="text-gray-600 mt-2 text-sm">{summary.approachNote}</p>
              )}
            </div>
          </div>

          {/* ④ 困った時の連絡先 */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
              <Phone className="h-4 w-4" />
              ④ 困った時の連絡先
            </h4>
            <div className="bg-white rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-yellow-500">
                  ★最優先
                </Badge>
                <span className="font-medium">{summary.primaryContactName}</span>
                <span className="text-gray-500">({summary.primaryContactRelation})</span>
                <a
                  href={`tel:${summary.primaryContactPhone}`}
                  className="text-blue-600 hover:underline"
                >
                  {summary.primaryContactPhone}
                </a>
              </div>
              {summary.secondaryContactName && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">次点</Badge>
                  <span>{summary.secondaryContactName}</span>
                  <span className="text-gray-500">({summary.secondaryContactRelation})</span>
                  <a
                    href={`tel:${summary.secondaryContactPhone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {summary.secondaryContactPhone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* ⑤ 最近の変化・直近トピック */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center justify-between">
              <span>⑤ 最近の変化・直近トピック</span>
              <span className="text-xs text-gray-500 font-normal">
                更新: {format(new Date(summary.recentChangesUpdatedAt), 'M/d', { locale: ja })}
                {summary.recentChangesUpdater && ` (${summary.recentChangesUpdater.name})`}
              </span>
            </h4>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="whitespace-pre-wrap">{summary.recentChanges}</p>
            </div>
          </div>

          {/* ⑥ 自由補足 */}
          {summary.freeNote && (
            <div>
              <h4 className="font-semibold text-sm mb-2">⑥ 自由補足</h4>
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-gray-700 whitespace-pre-wrap">{summary.freeNote}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditDialog
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        errors={errors}
        isSubmitting={isSubmitting}
        patientName={patientName}
      />
    </>
  );
}

// 編集ダイアログコンポーネント
interface EditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formData: PatientSummaryInput;
  setFormData: (data: PatientSummaryInput) => void;
  onSubmit: () => void;
  errors: string[];
  isSubmitting: boolean;
  patientName: string;
}

function EditDialog({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  errors,
  isSubmitting,
  patientName,
}: EditDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>引き継ぎサマリー編集 - {patientName}</DialogTitle>
        </DialogHeader>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <ul className="text-red-700 text-sm list-disc list-inside">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-6">
          {/* ① 対応時の最重要注意点 */}
          <div>
            <h4 className="font-semibold mb-3">① 対応時の最重要注意点</h4>
            <div className="space-y-2">
              {Object.entries(CAUTION_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    checked={formData[key as keyof typeof CAUTION_LABELS]}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, [key]: checked === true })
                    }
                  />
                  <Label htmlFor={key}>{label}</Label>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="cautionOther"
                  checked={formData.cautionOther}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, cautionOther: checked === true })
                  }
                />
                <Label htmlFor="cautionOther">その他注意あり</Label>
              </div>
              {formData.cautionOther && (
                <Input
                  placeholder="その他注意の内容（100文字以内）"
                  value={formData.cautionOtherText || ''}
                  onChange={(e) => setFormData({ ...formData, cautionOtherText: e.target.value })}
                  className="ml-6"
                  maxLength={100}
                />
              )}
            </div>
          </div>

          {/* ② 絶対に守ること */}
          <div>
            <h4 className="font-semibold mb-2">② 絶対に守ること（やってはいけないこと）</h4>
            <p className="text-sm text-gray-500 mb-2">
              この患者で"やってはいけないこと"があれば記載してください
            </p>
            <Textarea
              placeholder="最大3行まで（300文字以内）"
              value={formData.prohibitedActions || ''}
              onChange={(e) => setFormData({ ...formData, prohibitedActions: e.target.value })}
              rows={3}
              maxLength={300}
            />
          </div>

          {/* ③ 対応の基本方針 */}
          <div>
            <h4 className="font-semibold mb-2">③ 対応の基本方針 *</h4>
            <RadioGroup
              value={formData.approachType}
              onValueChange={(value) =>
                setFormData({ ...formData, approachType: value as ApproachType })
              }
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal">通常対応で問題なし</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="careful" id="careful" />
                <Label htmlFor="careful">慎重な対応が必要</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="contact_first" id="contact_first" />
                <Label htmlFor="contact_first">事前連絡をしてから対応</Label>
              </div>
            </RadioGroup>
            <Input
              placeholder="補足コメント（任意、100文字以内）"
              value={formData.approachNote || ''}
              onChange={(e) => setFormData({ ...formData, approachNote: e.target.value })}
              className="mt-2"
              maxLength={100}
            />
          </div>

          {/* ④ 困った時の連絡先 */}
          <div>
            <h4 className="font-semibold mb-2">④ 困った時の連絡先</h4>
            <div className="space-y-3">
              <div className="bg-yellow-50 p-3 rounded-md">
                <p className="text-sm font-medium mb-2">★最優先連絡先（必須）</p>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="氏名 *"
                    value={formData.primaryContactName}
                    onChange={(e) =>
                      setFormData({ ...formData, primaryContactName: e.target.value })
                    }
                    maxLength={50}
                  />
                  <Input
                    placeholder="関係（家族等） *"
                    value={formData.primaryContactRelation}
                    onChange={(e) =>
                      setFormData({ ...formData, primaryContactRelation: e.target.value })
                    }
                    maxLength={30}
                  />
                  <Input
                    placeholder="電話番号 *"
                    value={formData.primaryContactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, primaryContactPhone: e.target.value })
                    }
                    maxLength={20}
                  />
                </div>
              </div>
              <div className="p-3 rounded-md border">
                <p className="text-sm font-medium mb-2">次点連絡先（任意）</p>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="氏名"
                    value={formData.secondaryContactName || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, secondaryContactName: e.target.value })
                    }
                    maxLength={50}
                  />
                  <Input
                    placeholder="関係"
                    value={formData.secondaryContactRelation || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, secondaryContactRelation: e.target.value })
                    }
                    maxLength={30}
                  />
                  <Input
                    placeholder="電話番号"
                    value={formData.secondaryContactPhone || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, secondaryContactPhone: e.target.value })
                    }
                    maxLength={20}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ⑤ 最近の変化・直近トピック */}
          <div>
            <h4 className="font-semibold mb-2">⑤ 最近の変化・直近トピック *</h4>
            <p className="text-sm text-gray-500 mb-2">
              直近1〜2週間で変わったことがあれば記載してください
            </p>
            <Textarea
              placeholder="最大3行まで（300文字以内）"
              value={formData.recentChanges}
              onChange={(e) => setFormData({ ...formData, recentChanges: e.target.value })}
              rows={3}
              maxLength={300}
            />
          </div>

          {/* ⑥ 自由補足 */}
          <div>
            <h4 className="font-semibold mb-2">⑥ 自由補足（任意）</h4>
            <Textarea
              placeholder="上記に当てはまらない補足情報（500文字以内）"
              value={formData.freeNote || ''}
              onChange={(e) => setFormData({ ...formData, freeNote: e.target.value })}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" />
            キャンセル
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}




