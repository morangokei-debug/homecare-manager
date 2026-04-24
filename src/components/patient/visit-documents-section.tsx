'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ClipboardList, Plus, Loader2, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { VisitReportForm } from './visit-report-form';
import { VisitPlanForm } from './visit-plan-form';

interface ReportListItem {
  id: string;
  visitDate: string;
  createdAt: string;
  creator: { name: string };
}

interface PlanListItem {
  id: string;
  planMonth: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  creator: { name: string };
}

interface Props {
  patientId: string;
}

export function VisitDocumentsSection({ patientId }: Props) {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [rRes, pRes] = await Promise.all([
      fetch(`/api/visit-reports?patientId=${patientId}`),
      fetch(`/api/visit-plans?patientId=${patientId}`),
    ]);
    const [rData, pData] = await Promise.all([rRes.json(), pRes.json()]);
    setReports(rData);
    setPlans(pData);
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openNewReport = () => {
    setSelectedReportId(null);
    setReportFormOpen(true);
  };
  const openEditReport = (id: string) => {
    setSelectedReportId(id);
    setReportFormOpen(true);
  };
  const openNewPlan = () => {
    setSelectedPlanId(null);
    setPlanFormOpen(true);
  };
  const openEditPlan = (id: string) => {
    setSelectedPlanId(id);
    setPlanFormOpen(true);
  };

  return (
    <>
      {/* 訪問報告書 */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-500" />
            訪問報告書
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              {reports.length}件
            </Badge>
          </CardTitle>
          <Button
            onClick={openNewReport}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            新規作成
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">
              まだ報告書がありません
            </p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openEditReport(r.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">
                      {format(new Date(r.visitDate), 'yyyy年M月d日 (E)', { locale: ja })}
                    </p>
                    <p className="text-xs text-gray-500">
                      作成: {r.creator.name} / {format(new Date(r.createdAt), 'yyyy/M/d HH:mm')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/api/pdf/visit-report/${r.id}`, '_blank');
                    }}
                    className="text-blue-600 hover:bg-blue-50"
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 計画書 */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-500" />
            居宅療養管理指導 計画書（月次）
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {plans.length}件
            </Badge>
          </CardTitle>
          <Button
            onClick={openNewPlan}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            新規作成
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : plans.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">
              まだ計画書がありません
            </p>
          ) : (
            <div className="space-y-2">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openEditPlan(p.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">
                      {p.planMonth}
                      <span className="text-xs text-gray-500 ml-2">
                        ({format(new Date(p.periodStart), 'M/d')} 〜 {format(new Date(p.periodEnd), 'M/d')})
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      作成: {p.creator.name} / {format(new Date(p.createdAt), 'yyyy/M/d HH:mm')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/api/pdf/visit-plan/${p.id}`, '_blank');
                    }}
                    className="text-blue-600 hover:bg-blue-50"
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {reportFormOpen && (
        <VisitReportForm
          open={reportFormOpen}
          onClose={() => setReportFormOpen(false)}
          onSaved={fetchAll}
          patientId={patientId}
          reportId={selectedReportId}
        />
      )}
      {planFormOpen && (
        <VisitPlanForm
          open={planFormOpen}
          onClose={() => setPlanFormOpen(false)}
          onSaved={fetchAll}
          patientId={patientId}
          planId={selectedPlanId}
        />
      )}
    </>
  );
}
