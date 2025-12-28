import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const patients = await prisma.patient.findMany({
    where: { isActive: true },
    include: {
      facility: {
        select: { id: true, name: true },
      },
    },
    orderBy: { nameKana: 'asc' },
  });

  return NextResponse.json(patients);
}




