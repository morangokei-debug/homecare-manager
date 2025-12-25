import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const patients = await prisma.patient.findMany({
    where: { isActive: true },
    orderBy: { nameKana: 'asc' },
    select: {
      id: true,
      name: true,
      facilityId: true,
    },
  });

  return NextResponse.json(patients);
}

