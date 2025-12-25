import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeFacility = searchParams.get('includeFacility') === 'true';

  const patients = await prisma.patient.findMany({
    where: { isActive: true },
    orderBy: { nameKana: 'asc' },
    select: {
      id: true,
      name: true,
      facilityId: true,
      facility: includeFacility ? {
        select: {
          id: true,
          name: true,
        },
      } : false,
    },
  });

  return NextResponse.json(patients);
}
