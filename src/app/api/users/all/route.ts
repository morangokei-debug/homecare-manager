import { NextResponse } from 'next/server';
import { getCurrentOrganization } from '@/lib/organization';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const org = await getCurrentOrganization();

  if (!org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // admin または super_admin のみアクセス可能
  if (org.role !== 'admin' && !org.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // super_admin は全ユーザー、admin は自組織のユーザーのみ
  const whereClause = org.isSuperAdmin
    ? { isActive: true }
    : { isActive: true, organizationId: org.organizationId };

  const users = await prisma.user.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return NextResponse.json(users);
}
