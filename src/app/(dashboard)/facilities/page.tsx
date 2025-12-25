'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Building2, Phone, MapPin, Users, Loader2 } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  area: string | null;
  address: string | null;
  phone: string | null;
  displayMode: string;
  _count: { patients: number };
}

export default function FacilitiesPage() {
  const { data: session } = useSession();
  const canEdit = session?.user?.role !== 'viewer';
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/facilities/list')
      .then((res) => res.json())
      .then((data) => {
        setFacilities(data);
        setFilteredFacilities(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFacilities(facilities);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = facilities.filter(
      (facility) =>
        facility.name.toLowerCase().includes(query) ||
        facility.area?.toLowerCase().includes(query) ||
        facility.address?.toLowerCase().includes(query)
    );
    setFilteredFacilities(filtered);
  }, [searchQuery, facilities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">施設管理</h1>
          <p className="text-slate-400">施設情報の一覧・登録・編集</p>
        </div>
        {canEdit && (
          <Link href="/facilities/new">
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
              <Plus className="h-4 w-4 mr-2" />
              新規施設登録
            </Button>
          </Link>
        )}
      </div>

      {/* 検索 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="施設名、エリア、住所で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-slate-400">
              {filteredFacilities.length}件の結果
            </p>
          )}
        </CardContent>
      </Card>

      {/* 施設一覧 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredFacilities.map((facility) => (
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
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      facility.displayMode === 'grouped'
                        ? 'border-purple-500/50 text-purple-400 bg-purple-500/10'
                        : 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10'
                    }
                  >
                    {facility.displayMode === 'grouped' ? 'まとめ表示' : '個別表示'}
                  </Badge>
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

      {filteredFacilities.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">
              {searchQuery ? '検索結果がありません' : '施設が登録されていません'}
            </p>
            {!searchQuery && (
              <Link href="/facilities/new">
                <Button className="mt-4" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  最初の施設を登録
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
