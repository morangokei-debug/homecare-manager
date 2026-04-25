'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, ClipboardList, FileDown, Loader2, Search, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { VisitReportForm } from '@/components/patient/visit-report-form';
import { VisitPlanForm } from '@/components/patient/visit-plan-form';

interface ReportItem {
  id: string;
  visitDate: string;
  prescribingClinic: string | null;
  prescribingDoctor: string | null;
  createdAt: string;
  creator: { name: string };
  patient: { id: string; name: string };
}

interface PlanItem {
  id: string;
  planMonth: string;
  periodStart: string;
  periodEnd: string;
  prescribingClinic: string | null;
  prescribingDoctor: string | null;
  createdAt: string;
  creator: { name: string };
  patient: { id: string; name: string };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'reports' | 'plans'>('reports');

  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<{ id: string; patientId: string } | null>(null);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; patientId: string } | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [rRes, pRes] = await Promise.all([
      fetch('/api/visit-reports'),
      fetch('/api/visit-plans'),
    ]);
    const [r, p] = await Promise.all([rRes.json(), pRes.json()]);
    setReports(Array.isArray(r) ? r : []);
    setPlans(Array.isArray(p) ? p : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredReports = reports.filter((r) =>
    !search || r.patient.name.includes(search) || (r.prescribingDoctor || '').includes(search) || (r.prescribingClinic || '').includes(search)
  );
  const filteredPlans = plans.filter((p) =>
    !search || p.patient.name.includes(search) || (p.prescribingDoctor || '').includes(search) || (p.prescribingClinic || '').includes(search)
  );

  const openPdf = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">報告書・計画書一覧</h1>
          <p className="text-sm text-gray-500 mt-1">全患者の報告書・計画書を確認・印刷できます</p>
        </div>
      </div>

      {/* 検索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="患者名・医師名・医療機関名で絞り込み..."
          className="pl-9"
        />
      </div>

      {/* タブ */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('reports')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'reports'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            訪問報告書
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
              {filteredReports.length}
            </Badge>
          </span>
        </button>
        <button
          onClick={() => setTab('plans')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'plans'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" />
            計画書
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
              {filteredPlans.length}
            </Badge>
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : tab === 'reports' ? (
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              訪問薬剤管理指導 報告書
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReports.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">
                {search ? '該当する報告書がありません' : 'まだ報告書がありません'}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredReports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    onClick={() => { setSelectedReport({ id: r.id, patientId: r.patient.id }); setReportFormOpen(true); }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800">{r.patient.name}</span>
                        <span className="text-sm text-gray-600">
                          {format(new Date(r.visitDate), 'yyyy年M月d日 (E)', { locale: ja })}
                        </span>
                        {r.prescribingDoctor && (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            {r.prescribingClinic && `${r.prescribingClinic} / `}{r.prescribingDoctor}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        作成: {r.creator.name} ／ {format(new Date(r.createdAt), 'yyyy/M/d HH:mm')}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPdf(`/api/pdf/visit-report/${r.id}`)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-1"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        印刷
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPdf(`/api/pdf/visit-report/${r.id}`)}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        title="PDF出力"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-800 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-amber-500" />
              居宅療養管理指導 計画書
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPlans.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">
                {search ? '該当する計画書がありません' : 'まだ計画書がありません'}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredPlans.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    onClick={() => { setSelectedPlan({ id: p.id, patientId: p.patient.id }); setPlanFormOpen(true); }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800">{p.patient.name}</span>
                        <span className="text-sm text-gray-600">{p.planMonth}</span>
                        {p.prescribingDoctor && (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            {p.prescribingClinic && `${p.prescribingClinic} / `}{p.prescribingDoctor}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        作成: {p.creator.name} ／ {format(new Date(p.createdAt), 'yyyy/M/d HH:mm')}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPdf(`/api/pdf/visit-plan/${p.id}`)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-1"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        印刷
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPdf(`/api/pdf/visit-plan/${p.id}`)}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        title="PDF出力"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {reportFormOpen && selectedReport && (
        <VisitReportForm
          open={reportFormOpen}
          onClose={() => setReportFormOpen(false)}
          onSaved={fetchAll}
          patientId={selectedReport.patientId}
          reportId={selectedReport.id}
        />
      )}
      {planFormOpen && selectedPlan && (
        <VisitPlanForm
          open={planFormOpen}
          onClose={() => setPlanFormOpen(false)}
          onSaved={fetchAll}
          patientId={selectedPlan.patientId}
          planId={selectedPlan.id}
        />
      )}
    </div>
  );
}
