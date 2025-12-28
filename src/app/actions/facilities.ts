'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireOrganization } from '@/lib/organization';

export async function createFacility(formData: FormData) {
  try {
    const org = await requireOrganization();
    if (org.role === 'viewer') {
      return { success: false, error: '編集権限がありません' };
    }

    // super_adminは会社を選択する必要がある
    if (org.isSuperAdmin) {
      return { success: false, error: 'システム管理者は直接施設を登録できません' };
    }

    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string | null;
    const address = formData.get('address') as string | null;
    const area = formData.get('area') as string | null;
    const contactPerson = formData.get('contactPerson') as string | null;
    const displayMode = formData.get('displayMode') as string;
    const notes = formData.get('notes') as string | null;

    await prisma.facility.create({
      data: {
        name,
        phone: phone || null,
        address: address || null,
        area: area || null,
        contactPerson: contactPerson || null,
        displayMode: (displayMode as 'grouped' | 'individual') || 'grouped',
        memo: notes || null,
        organizationId: org.organizationId!,
      },
    });

    revalidatePath('/facilities');
    return { success: true };
  } catch (error) {
    console.error('Failed to create facility:', error);
    return { success: false, error: '施設の登録に失敗しました' };
  }
}

export async function updateFacility(formData: FormData) {
  try {
    const org = await requireOrganization();
    if (org.role === 'viewer') {
      return { success: false, error: '編集権限がありません' };
    }

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string | null;
    const address = formData.get('address') as string | null;
    const area = formData.get('area') as string | null;
    const contactPerson = formData.get('contactPerson') as string | null;
    const displayMode = formData.get('displayMode') as string;
    const notes = formData.get('notes') as string | null;

    // 施設を取得して所有権を確認
    const facility = await prisma.facility.findUnique({
      where: { id },
    });

    if (!facility) {
      return { success: false, error: '施設が見つかりません' };
    }

    // super_admin以外は自分の組織のデータのみ更新可能
    if (!org.isSuperAdmin && facility.organizationId !== org.organizationId) {
      return { success: false, error: 'この施設を更新する権限がありません' };
    }

    await prisma.facility.update({
      where: { id },
      data: {
        name,
        phone: phone || null,
        address: address || null,
        area: area || null,
        contactPerson: contactPerson || null,
        displayMode: (displayMode as 'grouped' | 'individual') || 'grouped',
        memo: notes || null,
      },
    });

    revalidatePath('/facilities');
    return { success: true };
  } catch (error) {
    console.error('Failed to update facility:', error);
    return { success: false, error: '施設の更新に失敗しました' };
  }
}

export async function deleteFacility(id: string) {
  try {
    const org = await requireOrganization();
    if (org.role === 'viewer') {
      return { success: false, error: '削除権限がありません' };
    }

    // 施設を取得して所有権を確認
    const facility = await prisma.facility.findUnique({
      where: { id },
    });

    if (!facility) {
      return { success: false, error: '施設が見つかりません' };
    }

    // super_admin以外は自分の組織のデータのみ削除可能
    if (!org.isSuperAdmin && facility.organizationId !== org.organizationId) {
      return { success: false, error: 'この施設を削除する権限がありません' };
    }

    // 論理削除
    await prisma.facility.update({
      where: { id },
      data: { isActive: false },
    });

    // 所属患者の施設IDをクリア
    await prisma.patient.updateMany({
      where: { facilityId: id },
      data: { facilityId: null },
    });

    revalidatePath('/facilities');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete facility:', error);
    return { success: false, error: '施設の削除に失敗しました' };
  }
}
