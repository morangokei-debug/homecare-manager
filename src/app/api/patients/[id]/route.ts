import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: { 
      facility: true,
      summary: {
        include: {
          recentChangesUpdater: {
            select: { name: true },
          },
          updater: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  return NextResponse.json(patient);
}

