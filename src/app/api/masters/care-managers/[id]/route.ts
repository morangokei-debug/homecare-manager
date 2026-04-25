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

  const cm = await prisma.careManager.findUnique({ where: { id } });
  if (!cm) return NextResponse.json({ error: '見つかりません' }, { status: 404 });
  if (!org.isSuperAdmin && cm.organizationId !== org.organizationId) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
  }

  const updated = await prisma.careManager.update({
    where: { id },
    data: {
      name: body.name ?? cm.name,
      officeName: body.officeName ?? cm.officeName,
      phone: body.phone ?? cm.phone,
      memo: body.memo ?? cm.memo,
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
  const cm = await prisma.careManager.findUnique({ where: { id } });
  if (!cm) return NextResponse.json({ error: '見つかりません' }, { status: 404 });
  if (!org.isSuperAdmin && cm.organizationId !== org.organizationId) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
  }

  await prisma.careManager.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
