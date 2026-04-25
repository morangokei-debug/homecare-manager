'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus, Search, Home, Building2, Phone, MapPin,
  LayoutGrid, List, ChevronDown, ChevronRight, Users,
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  nameKana: string | null;
  phone: string | null;
  area: string | null;
  facility: { id: string; name: string } | null;
}

type ViewMode = 'grouped' | 'table';
type FilterMode = 'all' | 'facility' | 'individual';

interface Props {
  patients: Patient[];
  canEdit: boolean;
}

export function PatientsClient({ patients, canEdit }: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const initialGroups = useMemo(() => {
    const groups = new Set<string>(['個人宅']);
    patients.forEach((p) => { if (p.facility) groups.add(p.facility.name); });
    return groups;
  }, [patients]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(initialGroups);

  const filteredPatients = useMemo(() => {
    let result = patients;
    if (filterMode === 'facility') result = result.filter((p) => p.facility);
    else if (filterMode === 'individual') result = result.filter((p) => !p.facility);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.nameKana?.toLowerCase().includes(q) ||
          p.area?.toLowerCase().includes(q) ||
          p.facility?.name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [patients, searchQuery, filterMode]);

  const groupedPatients = useMemo(() => {
    const groups: Record<string, Patient[]> = {};
    filteredPatients.forEach((p) => {
      const g = p.facility?.name || '個人宅';
      if (!groups[g]) groups[g] = [];
      groups[g].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === '個人宅') return 1;
      if (b === '個人宅') return -1;
      return a.localeCompare(b, 'ja');
    });
  }, [filteredPatients]);

  const facilityCount = patients.filter((p) => p.facility).length;
  const individualCount = patients.filter((p) => !p.facility).length;

  const toggleGroup = (name: string) => {
    const next = new Set(openGroups);
    next.has(name) ? next.delete(name) : next.add(name);
    setOpenGroups(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">患者管理</h1>
          <p className="text-gray-500">
            全 {patients.length}名（施設 {facilityCount}名 / 個人宅 {individualCount}名）
          </p>
        </div>
        {canEdit && (
          <Link href="/patients/new">
            <Button className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="h-4 w-4 mr-2" />新規患者登録
            </Button>
          </Link>
        )}
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="患者名、カナ、エリア、施設名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400"
              />
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['all', 'facility', 'individual'] as FilterMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-l first:border-l-0 border-gray-200 ${
                    filterMode === mode
                      ? mode === 'facility' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {mode === 'all' && 'すべて'}
                  {mode === 'facility' && <><Building2 className="h-3.5 w-3.5 inline mr-1" />施設</>}
                  {mode === 'individual' && <><Home className="h-3.5 w-3.5 inline mr-1" />個人宅</>}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button onClick={() => setViewMode('grouped')} className={`px-3 py-2 transition-colors ${viewMode === 'grouped' ? 'bg-gray-100 text-gray-800' : 'bg-white text-gray-400 hover:bg-gray-50'}`} title="グループ表示">
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode('table')} className={`px-3 py-2 transition-colors border-l border-gray-200 ${viewMode === 'table' ? 'bg-gray-100 text-gray-800' : 'bg-white text-gray-400 hover:bg-gray-50'}`} title="リスト表示">
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
          {searchQuery && <p className="mt-3 text-sm text-gray-500">{filteredPatients.length}件の結果</p>}
        </CardContent>
      </Card>

      {filteredPatients.length === 0 ? (
        <Card className="bg-white border-gray-200">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">{searchQuery ? '検索結果がありません' : '患者が登録されていません'}</p>
            {!searchQuery && canEdit && (
              <Link href="/patients/new"><Button className="mt-4" variant="outline"><Plus className="h-4 w-4 mr-2" />最初の患者を登録</Button></Link>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-4">
          {groupedPatients.map(([groupName, groupPatients]) => {
            const isFacility = groupName !== '個人宅';
            const isOpen = openGroups.has(groupName);
            return (
              <Card key={groupName} className="bg-white border-gray-200 shadow-sm overflow-hidden">
                <Collapsible open={isOpen} onOpenChange={() => toggleGroup(groupName)}>
                  <CollapsibleTrigger className="w-full">
                    <div className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${isFacility ? 'bg-blue-50 hover:bg-blue-100' : 'bg-emerald-50 hover:bg-emerald-100'}`}>
                      <div className="flex items-center gap-3">
                        {isFacility ? <Building2 className="h-5 w-5 text-blue-500" /> : <Home className="h-5 w-5 text-emerald-500" />}
                        <span className="font-medium text-gray-800">{groupName}</span>
                        <Badge variant="secondary" className={isFacility ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}>
                          <Users className="h-3 w-3 mr-1" />{groupPatients.length}名
                        </Badge>
                      </div>
                      {isOpen ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-100">
                          <TableHead className="text-gray-500">患者名</TableHead>
                          <TableHead className="text-gray-500">カナ</TableHead>
                          {!isFacility && <TableHead className="text-gray-500">エリア</TableHead>}
                          <TableHead className="text-gray-500">電話番号</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupPatients.map((patient) => (
                          <TableRow key={patient.id} className="border-gray-100 cursor-pointer hover:bg-gray-50" onMouseEnter={() => router.prefetch(`/patients/${patient.id}`)} onClick={() => router.push(`/patients/${patient.id}`)}>
                            <TableCell className="font-medium text-gray-800">{patient.name}</TableCell>
                            <TableCell className="text-gray-500 text-sm">{patient.nameKana || '-'}</TableCell>
                            {!isFacility && <TableCell className="text-gray-500 text-sm">{patient.area || '-'}</TableCell>}
                            <TableCell className="text-gray-500 text-sm">{patient.phone || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white border-gray-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-100">
                <TableHead className="text-gray-500">種別</TableHead>
                <TableHead className="text-gray-500">患者名</TableHead>
                <TableHead className="text-gray-500">カナ</TableHead>
                <TableHead className="text-gray-500">施設/エリア</TableHead>
                <TableHead className="text-gray-500">電話番号</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow key={patient.id} className="border-gray-100 cursor-pointer hover:bg-gray-50" onMouseEnter={() => router.prefetch(`/patients/${patient.id}`)} onClick={() => router.push(`/patients/${patient.id}`)}>
                  <TableCell>
                    {patient.facility
                      ? <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Building2 className="h-3 w-3 mr-1" />施設</Badge>
                      : <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><Home className="h-3 w-3 mr-1" />個人宅</Badge>}
                  </TableCell>
                  <TableCell className="font-medium text-gray-800">{patient.name}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{patient.nameKana || '-'}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{patient.facility?.name || patient.area || '-'}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{patient.phone || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
