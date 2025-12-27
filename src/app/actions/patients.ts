'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireOrganization } from '@/lib/organization';

export async function createPatient(formData: FormData) {
  try {
    const org = await requireOrganization();
    if (org.role === 'viewer') {
      return { success: false, error: '編集権限がありません' };
    }

    // super_adminは会社を選択する必要がある
    if (org.isSuperAdmin) {
      return { success: false, error: 'システム管理者は直接患者を登録できません' };
    }

    const name = formData.get('name') as string;
    const nameKana = formData.get('nameKana') as string | null;
    const phone = formData.get('phone') as string | null;
    const address = formData.get('address') as string | null;
    const area = formData.get('area') as string | null;
    const notes = formData.get('notes') as string | null;
    const facilityId = formData.get('facilityId') as string;

    await prisma.patient.create({
      data: {
        name,
        nameKana: nameKana || null,
        phone: phone || null,
        address: address || null,
        area: area || null,
        memo: notes || null,
        facilityId: facilityId && facilityId !== 'none' ? facilityId : null,
        organizationId: org.organizationId!,
      },
    });

    revalidatePath('/patients');
    return { success: true };
  } catch (error) {
    console.error('Failed to create patient:', error);
    return { success: false, error: '患者の登録に失敗しました' };
  }
}

export async function updatePatient(formData: FormData) {
  try {
    const org = await requireOrganization();
    if (org.role === 'viewer') {
      return { success: false, error: '編集権限がありません' };
    }

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const nameKana = formData.get('nameKana') as string | null;
    const phone = formData.get('phone') as string | null;
    const address = formData.get('address') as string | null;
    const area = formData.get('area') as string | null;
    const notes = formData.get('notes') as string | null;
    const facilityId = formData.get('facilityId') as string;

    // 自分の組織のデータのみ更新可能（super_adminは全て可能）
    const whereClause = org.isSuperAdmin 
      ? { id }
      : { id, organizationId: org.organizationId };

    await prisma.patient.update({
      where: whereClause,
      data: {
        name,
        nameKana: nameKana || null,
        phone: phone || null,
        address: address || null,
        area: area || null,
        memo: notes || null,
        facilityId: facilityId && facilityId !== 'none' ? facilityId : null,
      },
    });

    revalidatePath('/patients');
    return { success: true };
  } catch (error) {
    console.error('Failed to update patient:', error);
    return { success: false, error: '患者の更新に失敗しました' };
  }
}

export async function deletePatient(id: string) {
  try {
    const org = await requireOrganization();
    if (org.role === 'viewer') {
      return { success: false, error: '削除権限がありません' };
    }

    // 自分の組織のデータのみ削除可能（super_adminは全て可能）
    const whereClause = org.isSuperAdmin 
      ? { id }
      : { id, organizationId: org.organizationId };

    // 論理削除
    await prisma.patient.update({
      where: whereClause,
      data: { isActive: false },
    });

    revalidatePath('/patients');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete patient:', error);
    return { success: false, error: '患者の削除に失敗しました' };
  }
}
