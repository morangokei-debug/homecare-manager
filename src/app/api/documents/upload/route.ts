import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase, DOCUMENTS_BUCKET } from '@/lib/supabase';
import { auth } from '@/lib/auth';
import { DocumentType } from '@prisma/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
];

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    if (session.user.role === 'viewer') {
      return NextResponse.json({ error: '編集権限がありません' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const patientId = formData.get('patientId') as string;
    const type = (formData.get('type') as DocumentType) || 'other';
    const description = formData.get('description') as string | null;

    if (!file || !patientId) {
      return NextResponse.json(
        { error: 'ファイルと患者IDが必要です' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'ファイルサイズは10MB以下にしてください' },
        { status: 400 }
      );
    }

    // MIMEタイプチェック
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'PDF、JPEG、PNG、HEIC、WebPのみアップロード可能です' },
        { status: 400 }
      );
    }

    // 患者の存在確認
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: '患者が見つかりません' },
        { status: 404 }
      );
    }

    // ファイル名を生成（UUID + オリジナル拡張子）
    const ext = file.name.split('.').pop() || 'bin';
    const timestamp = Date.now();
    const storagePath = `${patientId}/${timestamp}_${crypto.randomUUID()}.${ext}`;

    // Supabase Storageにアップロード
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'ファイルのアップロードに失敗しました' },
        { status: 500 }
      );
    }

    // データベースにメタデータを保存
    const document = await prisma.patientDocument.create({
      data: {
        patientId,
        type,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storagePath,
        description: description || null,
        uploadedBy: session.user.id,
      },
      include: {
        uploader: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'アップロードに失敗しました' },
      { status: 500 }
    );
  }
}




