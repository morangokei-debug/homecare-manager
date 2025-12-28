'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { ApproachType } from '@prisma/client';

export interface PatientSummaryInput {
  patientId: string;
  // ① 対応時の最重要注意点
  cautionMedicationRefusal: boolean;
  cautionUnderstandingDifficulty: boolean;
  cautionFamilyPresenceRequired: boolean;
  cautionTimeRestriction: boolean;
  cautionTroubleRisk: boolean;
  cautionOther: boolean;
  cautionOtherText?: string;
  // ② 絶対に守ること
  prohibitedActions?: string;
  // ③ 対応の基本方針
  approachType: ApproachType;
  approachNote?: string;
  // ④ 連絡先
  primaryContactName: string;
  primaryContactRelation: string;
  primaryContactPhone: string;
  secondaryContactName?: string;
  secondaryContactRelation?: string;
  secondaryContactPhone?: string;
  // ⑤ 最近の変化
  recentChanges: string;
  // ⑥ 自由補足
  freeNote?: string;
}

// バリデーション
function validateSummary(data: PatientSummaryInput): string[] {
  const errors: string[] = [];

  // ③ 対応方針は必須
  if (!data.approachType) {
    errors.push('対応の基本方針を選択してください');
  }

  // ④ 最優先連絡先は必須
  if (!data.primaryContactName?.trim()) {
    errors.push('最優先連絡先の氏名を入力してください');
  }
  if (!data.primaryContactRelation?.trim()) {
    errors.push('最優先連絡先の関係を入力してください');
  }
  if (!data.primaryContactPhone?.trim()) {
    errors.push('最優先連絡先の電話番号を入力してください');
  }

  // 電話番号フォーマット
  const phonePattern = /^[0-9\-]+$/;
  if (data.primaryContactPhone && !phonePattern.test(data.primaryContactPhone)) {
    errors.push('電話番号は数字とハイフンのみで入力してください');
  }
  if (data.secondaryContactPhone && !phonePattern.test(data.secondaryContactPhone)) {
    errors.push('次点連絡先の電話番号は数字とハイフンのみで入力してください');
  }

  // ⑤ 最近の変化は必須
  if (!data.recentChanges?.trim()) {
    errors.push('最近の変化・直近トピックを入力してください');
  }

  // 「その他注意あり」がチェックされている場合はテキスト必須
  if (data.cautionOther && !data.cautionOtherText?.trim()) {
    errors.push('「その他注意あり」のテキストを入力してください');
  }

  // 文字数制限
  if (data.cautionOtherText && data.cautionOtherText.length > 100) {
    errors.push('その他注意は100文字以内で入力してください');
  }
  if (data.prohibitedActions && data.prohibitedActions.length > 300) {
    errors.push('やってはいけないことは300文字以内で入力してください');
  }
  if (data.approachNote && data.approachNote.length > 100) {
    errors.push('対応方針の補足は100文字以内で入力してください');
  }
  if (data.recentChanges && data.recentChanges.length > 300) {
    errors.push('最近の変化は300文字以内で入力してください');
  }
  if (data.freeNote && data.freeNote.length > 500) {
    errors.push('自由補足は500文字以内で入力してください');
  }

  return errors;
}

export async function createOrUpdatePatientSummary(data: PatientSummaryInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, errors: ['認証が必要です'] };
  }

  // Viewer権限は編集不可
  if (session.user.role === 'viewer') {
    return { success: false, errors: ['編集権限がありません'] };
  }

  const errors = validateSummary(data);
  if (errors.length > 0) {
    return { success: false, errors };
  }

  try {
    const userId = session.user.id;
    const now = new Date();

    // 既存のサマリーを取得
    const existingSummary = await prisma.patientSummary.findUnique({
      where: { patientId: data.patientId },
    });

    const summaryData = {
      cautionMedicationRefusal: data.cautionMedicationRefusal,
      cautionUnderstandingDifficulty: data.cautionUnderstandingDifficulty,
      cautionFamilyPresenceRequired: data.cautionFamilyPresenceRequired,
      cautionTimeRestriction: data.cautionTimeRestriction,
      cautionTroubleRisk: data.cautionTroubleRisk,
      cautionOther: data.cautionOther,
      cautionOtherText: data.cautionOther ? data.cautionOtherText : null,
      prohibitedActions: data.prohibitedActions || null,
      approachType: data.approachType,
      approachNote: data.approachNote || null,
      primaryContactName: data.primaryContactName,
      primaryContactRelation: data.primaryContactRelation,
      primaryContactPhone: data.primaryContactPhone,
      secondaryContactName: data.secondaryContactName || null,
      secondaryContactRelation: data.secondaryContactRelation || null,
      secondaryContactPhone: data.secondaryContactPhone || null,
      recentChanges: data.recentChanges,
      recentChangesUpdatedAt: now,
      recentChangesUpdatedBy: userId,
      freeNote: data.freeNote || null,
      updatedBy: userId,
    };

    if (existingSummary) {
      // 履歴を保存
      const changedFields: string[] = [];
      const keys = Object.keys(summaryData) as (keyof typeof summaryData)[];
      for (const key of keys) {
        if (existingSummary[key as keyof typeof existingSummary] !== summaryData[key]) {
          changedFields.push(key);
        }
      }

      if (changedFields.length > 0) {
        await prisma.patientSummaryHistory.create({
          data: {
            summaryId: existingSummary.id,
            snapshot: JSON.parse(JSON.stringify(existingSummary)),
            changedFields: changedFields,
            changedBy: userId,
          },
        });
      }

      // 更新
      await prisma.patientSummary.update({
        where: { patientId: data.patientId },
        data: summaryData,
      });
    } else {
      // 新規作成
      await prisma.patientSummary.create({
        data: {
          patientId: data.patientId,
          ...summaryData,
          createdBy: userId,
        },
      });
    }

    revalidatePath(`/patients/${data.patientId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to save patient summary:', error);
    return { success: false, errors: ['保存に失敗しました'] };
  }
}

export async function getPatientSummary(patientId: string) {
  try {
    const summary = await prisma.patientSummary.findUnique({
      where: { patientId },
      include: {
        recentChangesUpdater: {
          select: { name: true },
        },
        updater: {
          select: { name: true },
        },
      },
    });

    return summary;
  } catch (error) {
    console.error('Failed to get patient summary:', error);
    return null;
  }
}

export async function getPatientSummaryHistory(patientId: string) {
  try {
    const summary = await prisma.patientSummary.findUnique({
      where: { patientId },
      select: { id: true },
    });

    if (!summary) return [];

    const history = await prisma.patientSummaryHistory.findMany({
      where: { summaryId: summary.id },
      include: {
        changer: {
          select: { name: true },
        },
      },
      orderBy: { changedAt: 'desc' },
    });

    return history;
  } catch (error) {
    console.error('Failed to get patient summary history:', error);
    return [];
  }
}




