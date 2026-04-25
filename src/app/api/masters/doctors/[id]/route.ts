import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getCurrentOrganization();
  if (!org) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  if (org.role === 'viewer') return NextResponse.json({ error: '権限がありません' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const doctor = await prisma.doctor.findUnique({ where: { id } });
  if (!doctor) return NextResponse.json({ error: '見つかりません' }, { status: 404 });
  if (!org.isSuperAdmin && doctor.organizationId !== org.organizationId) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
  }

  const updated = await prisma.doctor.update({
    where: { id },
    data: {
      clinicName: body.clinicName ?? doctor.clinicName,
      doctorName: body.doctorName ?? doctor.doctorName,
      phone: body.phone ?? doctor.phone,
      memo: body.memo ?? doctor.memo,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getCurrentOrganization();
  if (!org) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  if (org.role === 'viewer') return NextResponse.json({ error: '権限がありません' }, { status: 403 });

  const { id } = await params;
  const doctor = await prisma.doctor.findUnique({ where: { id } });
  if (!doctor) return NextResponse.json({ error: '見つかりません' }, { status: 404 });
  if (!org.isSuperAdmin && doctor.organizationId !== org.organizationId) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
  }

  await prisma.doctor.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
