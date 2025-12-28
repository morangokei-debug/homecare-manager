import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const facility = await prisma.facility.findUnique({
    where: { id },
    include: {
      patients: {
        where: { isActive: true },
        select: { id: true, name: true },
      },
    },
  });

  if (!facility) {
    return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
  }

  return NextResponse.json(facility);
}




