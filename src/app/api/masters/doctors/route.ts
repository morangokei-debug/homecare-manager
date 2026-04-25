import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';

export async function GET() {
  const org = await getCurrentOrganization();
  if (!org) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const where = org.isSuperAdmin ? {} : { organizationId: org.organizationId! };
  const doctors = await prisma.doctor.findMany({
    where: { ...where, isActive: true },
    orderBy: [{ clinicName: 'asc' }, { doctorName: 'asc' }],
  });
  return NextResponse.json(doctors);
}

export async function POST(request: Request) {
  const org = await getCurrentOrganization();
  if (!org) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  if (!org.organizationId) return NextResponse.json({ error: '組織に所属していません' }, { status: 403 });
  if (org.role === 'viewer') return NextResponse.json({ error: '権限がありません' }, { status: 403 });

  const body = await request.json();
  const { clinicName, doctorName, phone, memo } = body;
  if (!clinicName || !doctorName) {
    return NextResponse.json({ error: '医療機関名と医師名は必須です' }, { status: 400 });
  }

  const doctor = await prisma.doctor.create({
    data: {
      organizationId: org.organizationId,
      clinicName,
      doctorName,
      phone: phone || null,
      memo: memo || null,
    },
  });
  return NextResponse.json(doctor);
}
