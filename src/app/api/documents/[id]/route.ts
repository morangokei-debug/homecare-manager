import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase, DOCUMENTS_BUCKET } from '@/lib/supabase';
import { auth } from '@/lib/auth';

// ドキュメントのダウンロードURL取得
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const document = await prisma.patientDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'ドキュメントが見つかりません' },
        { status: 404 }
      );
    }

    // Supabase Storageから署名付きURLを取得
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(document.storagePath, 60 * 60); // 1時間有効

    if (error) {
      console.error('Signed URL error:', error);
      return NextResponse.json(
        { error: 'ダウンロードURLの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.signedUrl, document });
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json(
      { error: 'ドキュメントの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// ドキュメントの削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    if (session.user.role === 'viewer') {
      return NextResponse.json({ error: '編集権限がありません' }, { status: 403 });
    }

    const { id } = await params;

    const document = await prisma.patientDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'ドキュメントが見つかりません' },
        { status: 404 }
      );
    }

    // Supabase Storageからファイルを削除
    const { error: storageError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove([document.storagePath]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // ストレージ削除が失敗してもDBレコードは削除する
    }

    // データベースからレコードを削除
    await prisma.patientDocument.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: '削除に失敗しました' },
      { status: 500 }
    );
  }
}




