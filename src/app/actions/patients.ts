'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createPatient(formData: FormData) {
  try {
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
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const nameKana = formData.get('nameKana') as string | null;
    const phone = formData.get('phone') as string | null;
    const address = formData.get('address') as string | null;
    const area = formData.get('area') as string | null;
    const notes = formData.get('notes') as string | null;
    const facilityId = formData.get('facilityId') as string;

    await prisma.patient.update({
      where: { id },
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
    // 論理削除
    await prisma.patient.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath('/patients');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete patient:', error);
    return { success: false, error: '患者の削除に失敗しました' };
  }
}
