import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 毎回 DB に問い合わせるのではなく、CDN/ブラウザに 60 秒キャッシュさせる
// スタッフは頻繁に変わらないので、体感を上げるため stale-while-revalidate も併用
export async function GET() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
    },
  });

  return NextResponse.json(users, {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
    },
  });
}





