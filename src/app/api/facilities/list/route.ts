import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const facilities = await prisma.facility.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { patients: { where: { isActive: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(facilities);
}




