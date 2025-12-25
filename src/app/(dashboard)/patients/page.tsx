'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Home, Building2, Phone, MapPin, Loader2 } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  nameKana: string | null;
  phone: string | null;
  area: string | null;
  facility: { id: string; name: string } | null;
}

export default function PatientsPage() {
  const { data: session } = useSession();
  const canEdit = session?.user?.role !== 'viewer';
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/patients/list')
      .then((res) => res.json())
      .then((data) => {
        setPatients(data);
        setFilteredPatients(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = patients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(query) ||
        patient.nameKana?.toLowerCase().includes(query) ||
        patient.area?.toLowerCase().includes(query) ||
        patient.facility?.name.toLowerCase().includes(query)
    );
    setFilteredPatients(filtered);
  }, [searchQuery, patients]);

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
          <h1 className="text-2xl font-bold text-white">患者管理</h1>
          <p className="text-slate-400">患者情報の一覧・登録・編集</p>
        </div>
        {canEdit && (
          <Link href="/patients/new">
            <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">
              <Plus className="h-4 w-4 mr-2" />
              新規患者登録
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
              placeholder="患者名、カナ、エリア、施設名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-slate-400">
              {filteredPatients.length}件の結果
            </p>
          )}
        </CardContent>
      </Card>

      {/* 患者一覧 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPatients.map((patient) => (
          <Link key={patient.id} href={`/patients/${patient.id}`}>
            <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {patient.facility ? (
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-blue-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Home className="h-4 w-4 text-emerald-400" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-white text-lg">{patient.name}</CardTitle>
                      {patient.nameKana && (
                        <p className="text-xs text-slate-500">{patient.nameKana}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      patient.facility
                        ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                        : 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                    }
                  >
                    {patient.facility ? '施設' : '個人宅'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {patient.facility && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{patient.facility.name}</span>
                  </div>
                )}
                {patient.area && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{patient.area}</span>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{patient.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">
              {searchQuery ? '検索結果がありません' : '患者が登録されていません'}
            </p>
            {!searchQuery && (
              <Link href="/patients/new">
                <Button className="mt-4" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  最初の患者を登録
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
