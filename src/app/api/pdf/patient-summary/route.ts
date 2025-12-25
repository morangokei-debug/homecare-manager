import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const APPROACH_LABELS: Record<string, string> = {
  normal: 'Normal care OK',
  careful: 'Careful approach required',
  contact_first: 'Contact before visit',
};

const CAUTION_LABELS: Record<string, string> = {
  cautionMedicationRefusal: 'Medication refusal/forgetting',
  cautionUnderstandingDifficulty: 'Understanding difficulty',
  cautionFamilyPresenceRequired: 'Family/staff presence required',
  cautionTimeRestriction: 'Time/day restrictions',
  cautionTroubleRisk: 'Trouble risk',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');

  if (!patientId) {
    return NextResponse.json({ error: 'Missing patientId' }, { status: 400 });
  }

  // 患者とサマリーを取得
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      facility: true,
      summary: {
        include: {
          recentChangesUpdater: { select: { name: true } },
          updater: { select: { name: true } },
        },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  // PDF生成
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // タイトル
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Patient Summary: ${patient.name}`, margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128);
  doc.text(`Output: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, margin, y);
  y += 10;
  doc.setTextColor(0);

  // サマリーがない場合
  if (!patient.summary) {
    doc.setFontSize(11);
    doc.setTextColor(200, 100, 0);
    doc.text('** NO HANDOVER SUMMARY CREATED **', margin, y);
    doc.setTextColor(0);
    y += 10;

    // 基本情報のみ表示
    doc.setFontSize(10);
    doc.text('Basic Information:', margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.text(`Name: ${patient.name}`, margin + 4, y);
    y += 5;
    if (patient.nameKana) {
      doc.text(`Kana: ${patient.nameKana}`, margin + 4, y);
      y += 5;
    }
    if (patient.facility) {
      doc.text(`Facility: ${patient.facility.name}`, margin + 4, y);
      y += 5;
    } else {
      doc.text('Location: Home', margin + 4, y);
      y += 5;
    }
    if (patient.phone) {
      doc.text(`Phone: ${patient.phone}`, margin + 4, y);
      y += 5;
    }
    if (patient.address) {
      doc.text(`Address: ${patient.address}`, margin + 4, y);
      y += 5;
    }
  } else {
    const summary = patient.summary;

    // 注意患者かどうかの判定
    const cautionCount = [
      summary.cautionMedicationRefusal,
      summary.cautionUnderstandingDifficulty,
      summary.cautionFamilyPresenceRequired,
      summary.cautionTimeRestriction,
      summary.cautionTroubleRisk,
      summary.cautionOther,
    ].filter(Boolean).length;

    if (cautionCount > 0) {
      doc.setFillColor(255, 230, 230);
      doc.rect(margin, y - 3, pageWidth - margin * 2, 8, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text(`!! CAUTION PATIENT (${cautionCount} items) !!`, margin + 2, y + 2);
      doc.setTextColor(0);
      y += 12;
    }

    // セクション1: 対応時の最重要注意点
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 3, pageWidth - margin * 2, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Key Cautions', margin + 2, y + 1);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (const [key, label] of Object.entries(CAUTION_LABELS)) {
      const isChecked = summary[key as keyof typeof summary];
      const mark = isChecked ? '[X]' : '[ ]';
      doc.text(`${mark} ${label}`, margin + 4, y);
      y += 5;
    }
    if (summary.cautionOther) {
      doc.text(`[X] Other: ${summary.cautionOtherText || ''}`, margin + 4, y);
      y += 5;
    } else {
      doc.text('[ ] Other', margin + 4, y);
      y += 5;
    }
    y += 3;

    // セクション2: 絶対に守ること
    if (summary.prohibitedActions) {
      doc.setFillColor(255, 240, 240);
      doc.rect(margin, y - 3, pageWidth - margin * 2, 7, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 0, 0);
      doc.text('2. PROHIBITED ACTIONS', margin + 2, y + 1);
      doc.setTextColor(0);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const prohibitedLines = doc.splitTextToSize(
        summary.prohibitedActions,
        pageWidth - margin * 2 - 10
      );
      doc.text(prohibitedLines, margin + 4, y);
      y += prohibitedLines.length * 4 + 3;
    }

    // セクション3: 対応の基本方針
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 3, pageWidth - margin * 2, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Approach Type', margin + 2, y + 1);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    doc.text(`> ${APPROACH_LABELS[summary.approachType] || summary.approachType}`, margin + 4, y);
    y += 5;
    if (summary.approachNote) {
      doc.setTextColor(100);
      doc.text(`Note: ${summary.approachNote}`, margin + 4, y);
      doc.setTextColor(0);
      y += 5;
    }
    y += 3;

    // セクション4: 連絡先
    doc.setFillColor(255, 250, 230);
    doc.rect(margin, y - 3, pageWidth - margin * 2, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Emergency Contacts', margin + 2, y + 1);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    doc.text(
      `* PRIMARY: ${summary.primaryContactName} (${summary.primaryContactRelation}) - ${summary.primaryContactPhone}`,
      margin + 4,
      y
    );
    y += 5;
    if (summary.secondaryContactName) {
      doc.text(
        `  Secondary: ${summary.secondaryContactName} (${summary.secondaryContactRelation}) - ${summary.secondaryContactPhone}`,
        margin + 4,
        y
      );
      y += 5;
    }
    y += 3;

    // セクション5: 最近の変化
    doc.setFillColor(255, 255, 230);
    doc.rect(margin, y - 3, pageWidth - margin * 2, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('5. Recent Changes', margin + 2, y + 1);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const recentLines = doc.splitTextToSize(summary.recentChanges, pageWidth - margin * 2 - 10);
    doc.text(recentLines, margin + 4, y);
    y += recentLines.length * 4;
    doc.setTextColor(100);
    doc.text(
      `Updated: ${format(new Date(summary.recentChangesUpdatedAt), 'M/d', { locale: ja })} by ${summary.recentChangesUpdater?.name || 'Unknown'}`,
      margin + 4,
      y
    );
    doc.setTextColor(0);
    y += 6;

    // セクション6: 自由補足
    if (summary.freeNote) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 3, pageWidth - margin * 2, 7, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('6. Additional Notes', margin + 2, y + 1);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const freeLines = doc.splitTextToSize(summary.freeNote, pageWidth - margin * 2 - 10);
      doc.text(freeLines, margin + 4, y);
      y += freeLines.length * 4 + 3;
    }

    // 最終更新情報
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Last updated: ${format(new Date(summary.updatedAt), 'yyyy-MM-dd HH:mm')} by ${summary.updater?.name || 'Unknown'}`,
      margin,
      y
    );
    doc.setTextColor(0);
  }

  // 基本情報セクション
  y += 10;
  if (y > 250) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(230, 240, 250);
  doc.rect(margin, y - 3, pageWidth - margin * 2, 7, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Basic Information', margin + 2, y + 1);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  doc.text(`Name: ${patient.name}`, margin + 4, y);
  y += 5;
  if (patient.nameKana) {
    doc.text(`Kana: ${patient.nameKana}`, margin + 4, y);
    y += 5;
  }
  doc.text(`Location: ${patient.facility ? patient.facility.name : 'Home'}`, margin + 4, y);
  y += 5;
  if (patient.phone) {
    doc.text(`Phone: ${patient.phone}`, margin + 4, y);
    y += 5;
  }
  if (patient.address) {
    doc.text(`Address: ${patient.address}`, margin + 4, y);
    y += 5;
  }
  if (patient.area) {
    doc.text(`Area: ${patient.area}`, margin + 4, y);
    y += 5;
  }
  if (patient.memo) {
    doc.text(`Notes: ${patient.memo}`, margin + 4, y);
    y += 5;
  }

  // PDFをバッファとして取得
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="patient_summary_${patient.id}.pdf"`,
    },
  });
}

