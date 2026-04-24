import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br/>');
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getCurrentOrganization();
  if (!org) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const report = await prisma.visitReport.findUnique({
    where: { id },
    include: {
      patient: {
        include: {
          facility: true,
        },
      },
      organization: true,
      creator: { select: { name: true } },
    },
  });

  if (!report) {
    return new Response('Not found', { status: 404 });
  }
  if (!org.isSuperAdmin && report.organizationId !== org.organizationId) {
    return new Response('Forbidden', { status: 403 });
  }

  const visitDate = format(new Date(report.visitDate), 'yyyy年M月d日（E）', { locale: ja });
  const today = format(new Date(), 'yyyy年M月d日', { locale: ja });

  const row = (label: string, value: string | null | undefined) => `
    <tr>
      <th>${label}</th>
      <td>${escapeHtml(value)}</td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<title>訪問薬剤管理指導 報告書 - ${escapeHtml(report.patient.name)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;
    color: #111;
    font-size: 11pt;
    line-height: 1.6;
    margin: 0;
    padding: 10mm 8mm;
    background: #fff;
  }
  h1 {
    font-size: 18pt;
    text-align: center;
    margin: 0 0 6mm;
    letter-spacing: 0.1em;
    border-bottom: 2px solid #333;
    padding-bottom: 3mm;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4mm;
    font-size: 10pt;
  }
  .patient-info {
    border: 1px solid #333;
    padding: 3mm 5mm;
    margin-bottom: 5mm;
  }
  .patient-info .row {
    display: flex;
    gap: 10mm;
    margin-bottom: 2mm;
  }
  .patient-info .row:last-child { margin-bottom: 0; }
  .patient-info .label {
    font-weight: bold;
    min-width: 24mm;
  }
  .patient-info .big-name {
    font-size: 14pt;
    font-weight: bold;
  }
  table.section {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 5mm;
  }
  table.section th, table.section td {
    border: 1px solid #666;
    padding: 3mm 4mm;
    vertical-align: top;
    text-align: left;
  }
  table.section th {
    background: #f2f2f2;
    width: 40mm;
    font-weight: bold;
  }
  .signature {
    margin-top: 8mm;
    display: flex;
    justify-content: flex-end;
    gap: 8mm;
    font-size: 10pt;
  }
  .signature .item {
    min-width: 50mm;
    border-bottom: 1px solid #333;
    padding-bottom: 2mm;
  }
  .print-toolbar {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1000;
    background: #fff;
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .print-toolbar button {
    background: #10b981;
    color: white;
    border: none;
    padding: 6px 14px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  .print-toolbar button:hover { background: #059669; }
  @media print {
    .print-toolbar { display: none; }
  }
</style>
</head>
<body>
  <div class="print-toolbar">
    <button onclick="window.print()">PDF出力 / 印刷</button>
  </div>

  <h1>訪問薬剤管理指導 報告書</h1>

  <div class="meta">
    <div>発行日: ${today}</div>
    <div>${escapeHtml(report.organization.name)}</div>
  </div>

  <div class="patient-info">
    <div class="row">
      <div class="label">患者氏名</div>
      <div class="big-name">${escapeHtml(report.patient.name)}</div>
    </div>
    ${report.patient.facility ? `
    <div class="row">
      <div class="label">所属施設</div>
      <div>${escapeHtml(report.patient.facility.name)}</div>
    </div>` : ''}
    <div class="row">
      <div class="label">訪問日</div>
      <div>${visitDate}</div>
    </div>
    <div class="row">
      <div class="label">処方医療機関</div>
      <div>${escapeHtml(report.prescribingClinic)}</div>
      <div class="label">処方医師</div>
      <div>${escapeHtml(report.prescribingDoctor)}</div>
    </div>
  </div>

  <table class="section">
    <tbody>
      ${row('全身状態', report.generalCondition)}
      ${row('服薬状況<br/>（残薬・飲み忘れ等）', report.medicationStatus)}
      ${row('副作用・有害事象', report.sideEffects)}
      ${row('薬物療法の効果', report.treatmentEffect)}
      ${row('理解度・<br/>アドヒアランス', report.understandingLevel)}
      ${row('生活状況', report.livingConditions)}
      ${row('指導内容', report.guidanceContent)}
      ${row('医師への報告・<br/>提案事項', report.reportToDoctor)}
      ${row('次回訪問予定', report.nextVisitPlan)}
      ${row('特記事項', report.specialNotes)}
    </tbody>
  </table>

  <div class="signature">
    <div>
      <div>報告者（薬剤師）</div>
      <div class="item">${escapeHtml(report.creator.name)}</div>
    </div>
  </div>

  <script>
    // 自動で印刷ダイアログを開く
    setTimeout(() => { window.print(); }, 500);
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
