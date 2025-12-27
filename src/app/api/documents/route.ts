import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// ドキュメント一覧取得
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');

  if (!patientId) {
    return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
  }

  try {
    const documents = await prisma.patientDocument.findMany({
      where: { patientId },
      include: {
        uploader: {
          select: { name: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}


