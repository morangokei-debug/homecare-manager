import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Building2, Phone, MapPin, Users } from 'lucide-react';

export default async function FacilitiesPage() {
  const facilities = await prisma.facility.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { patients: { where: { isActive: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">施設管理</h1>
          <p className="text-slate-400">施設情報の一覧・登録・編集</p>
        </div>
        <Link href="/facilities/new">
          <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
            <Plus className="h-4 w-4 mr-2" />
            新規施設登録
          </Button>
        </Link>
      </div>

      {/* 検索 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="施設名、住所で検索..."
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* 施設一覧 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {facilities.map((facility) => (
          <Link key={facility.id} href={`/facilities/${facility.id}`}>
            <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{facility.name}</CardTitle>
                      {facility.area && (
                        <p className="text-xs text-slate-500">{facility.area}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <Users className="h-3.5 w-3.5" />
                  <span>患者数: {facility._count.patients}名</span>
                </div>
                {facility.address && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{facility.address}</span>
                  </div>
                )}
                {facility.phone && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{facility.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {facilities.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">施設が登録されていません</p>
            <Link href="/facilities/new">
              <Button className="mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                最初の施設を登録
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

