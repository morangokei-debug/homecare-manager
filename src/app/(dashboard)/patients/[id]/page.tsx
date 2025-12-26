'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Trash2, FileDown } from 'lucide-react';
import Link from 'next/link';
import { updatePatient, deletePatient } from '@/app/actions/patients';
import { PatientSummary } from '@/components/patient/patient-summary';
import { PatientDocuments } from '@/components/patient/patient-documents';
import { ApproachType } from '@prisma/client';

interface Facility {
  id: string;
  name: string;
}

interface PatientSummaryData {
  id: string;
  patientId: string;
  cautionMedicationRefusal: boolean;
  cautionUnderstandingDifficulty: boolean;
  cautionFamilyPresenceRequired: boolean;
  cautionTimeRestriction: boolean;
  cautionTroubleRisk: boolean;
  cautionOther: boolean;
  cautionOtherText: string | null;
  prohibitedActions: string | null;
  approachType: ApproachType;
  approachNote: string | null;
  primaryContactName: string;
  primaryContactRelation: string;
  primaryContactPhone: string;
  secondaryContactName: string | null;
  secondaryContactRelation: string | null;
  secondaryContactPhone: string | null;
  recentChanges: string;
  recentChangesUpdatedAt: string;
  freeNote: string | null;
  updatedAt: string;
  recentChangesUpdater?: { name: string };
  updater?: { name: string };
}

interface Patient {
  id: string;
  name: string;
  nameKana: string | null;
  phone: string | null;
  address: string | null;
  area: string | null;
  memo: string | null;
  facilityId: string | null;
  summary?: PatientSummaryData | null;
}

export default function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);

  const canEdit = session?.user?.role === 'admin' || session?.user?.role === 'staff';

  useEffect(() => {
    Promise.all([
      fetch('/api/facilities').then((res) => res.json()),
      fetch(`/api/patients/${id}`).then((res) => res.json()),
    ]).then(([facilitiesData, patientData]) => {
      setFacilities(facilitiesData);
      setPatient(patientData);
    });
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('id', id);
    const result = await updatePatient(formData);

    if (result.success) {
      router.push('/patients');
    } else {
      alert(result.error || '保存に失敗しました');
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('この患者を削除しますか？関連するイベントも削除されます。')) return;
    
    setDeleting(true);
    const result = await deletePatient(id);

    if (result.success) {
      router.push('/patients');
    } else {
      alert(result.error || '削除に失敗しました');
      setDeleting(false);
    }
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/patients">
            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">患者情報</h1>
            <p className="text-gray-500">{patient.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/api/pdf/patient-summary?patientId=${patient.id}`, '_blank')}
            className="border-gray-200"
          >
            <FileDown className="h-4 w-4 mr-2" />
            PDF出力
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  削除
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* 引き継ぎサマリー（必読）*/}
      <PatientSummary
        patientId={patient.id}
        patientName={patient.name}
        summary={patient.summary || null}
      />

      {/* フォーム */}
      <form onSubmit={handleSubmit}>
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-800">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-600">
                  患者名 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={patient.name}
                  className="bg-gray-50 border-gray-200 text-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameKana" className="text-gray-600">
                  フリガナ
                </Label>
                <Input
                  id="nameKana"
                  name="nameKana"
                  defaultValue={patient.nameKana || ''}
                  className="bg-gray-50 border-gray-200 text-gray-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facilityId" className="text-gray-600">
                所属施設
              </Label>
              <Select name="facilityId" defaultValue={patient.facilityId || 'none'}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                  <SelectValue placeholder="個人宅（施設なし）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">個人宅（施設なし）</SelectItem>
                  {facilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-600">
                  電話番号
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={patient.phone || ''}
                  className="bg-gray-50 border-gray-200 text-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area" className="text-gray-600">
                  エリア
                </Label>
                <Input
                  id="area"
                  name="area"
                  defaultValue={patient.area || ''}
                  className="bg-gray-50 border-gray-200 text-gray-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-gray-600">
                住所
              </Label>
              <Input
                id="address"
                name="address"
                defaultValue={patient.address || ''}
                className="bg-gray-50 border-gray-200 text-gray-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-600">
                備考
              </Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={patient.memo || ''}
                rows={4}
                className="bg-gray-50 border-gray-200 text-gray-800 resize-none"
              />
            </div>

            {canEdit && (
              <div className="flex justify-end gap-4 pt-4">
                <Link href="/patients">
                  <Button type="button" variant="outline" className="border-gray-200">
                    キャンセル
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-emerald-500 to-orange-500 hover:from-emerald-600 hover:to-cyan-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      保存する
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </form>

      {/* ドキュメント・写真 */}
      <PatientDocuments patientId={patient.id} />
    </div>
  );
}
