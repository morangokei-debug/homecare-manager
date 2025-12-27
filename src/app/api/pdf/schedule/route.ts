import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsPDF } from 'jspdf';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const typeFilter = searchParams.get('type') || 'all';
  const statusFilter = searchParams.get('status') || 'confirmed';
  const includeCompleted = searchParams.get('includeCompleted') === 'true';

  if (!start || !end) {
    return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
  }

  // イベントを取得
  const whereCondition: Record<string, unknown> = {
    date: {
      gte: new Date(start),
      lte: new Date(end),
    },
  };

  if (typeFilter !== 'all') {
    whereCondition.type = typeFilter;
  }

  // statusとisCompletedフィールドは削除されたため、フィルタリングは行わない

  const events = await prisma.event.findMany({
    where: whereCondition,
    include: {
      patient: {
        include: { facility: true },
      },
      facility: true,
      assignee: {
        select: { name: true },
      },
    },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });

  // PDF生成
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // 日本語フォント用の設定（ASCII文字のみ使用）
  doc.setFont('helvetica');

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // ヘッダー
  doc.setFontSize(16);
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const isDaily = start === end;
  
  const title = isDaily
    ? `Schedule: ${format(startDate, 'yyyy-MM-dd (EEE)', { locale: ja })}`
    : `Schedule: ${format(startDate, 'yyyy-MM-dd')} - ${format(endDate, 'yyyy-MM-dd')}`;
  
  doc.text(title, margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(128);
  doc.text(`Output: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, margin, y);
  y += 10;
  doc.setTextColor(0);

  // 日付ごとにイベントをグループ化
  const dates = eachDayOfInterval({ start: startDate, end: endDate });
  
  for (const date of dates) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayEvents = events.filter(
      (e) => format(e.date, 'yyyy-MM-dd') === dateStr
    );

    // 日付ヘッダー
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 7, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(format(date, 'M/d (EEE)', { locale: ja }), margin + 2, y);
    y += 6;

    if (dayEvents.length === 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128);
      doc.text('No events', margin + 4, y);
      doc.setTextColor(0);
      y += 6;
    } else {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      for (const event of dayEvents) {
        // ページ送り
        if (y > 270) {
          doc.addPage();
          y = margin;
        }

        const timeStr = event.time
          ? format(event.time, 'HH:mm')
          : '--:--';

        const typeIcon = event.type === 'visit' ? '[V]' : '[Rx]';
        
        // 施設か個人宅かを判定
        let targetName: string;
        let locationIcon: string;
        
        if (event.patient) {
          // 患者に紐づくイベント
          if (event.patient.facility && event.patient.facility.displayMode === 'grouped') {
            targetName = event.patient.facility.name;
          } else {
            targetName = event.patient.name;
          }
          locationIcon = event.patient.facility ? '[F]' : '[H]';
        } else if (event.facility) {
          // 施設全体イベント
          targetName = event.facility.name;
          locationIcon = '[F]';
        } else {
          targetName = 'Unknown';
          locationIcon = '[?]';
        }
        
        // 報告書記載状況
        const reportMark = event.reportDone ? ' [Done]' : '';

        // イベント行
        const line = `${timeStr}  ${typeIcon} ${locationIcon} ${targetName}${reportMark}`;
        doc.text(line, margin + 4, y);
        y += 5;

        // 担当者
        if (event.assignee) {
          doc.setTextColor(100);
          doc.text(`  Assignee: ${event.assignee.name}`, margin + 4, y);
          doc.setTextColor(0);
          y += 4;
        }

        // 備考
        if (event.memo) {
          doc.setTextColor(100);
          const memoLines = doc.splitTextToSize(`  Note: ${event.memo}`, pageWidth - margin * 2 - 10);
          doc.text(memoLines, margin + 4, y);
          y += memoLines.length * 4;
          doc.setTextColor(0);
        }

        y += 2;
      }
    }

    y += 4;
  }

  // フッター（凡例）
  if (y > 260) {
    doc.addPage();
    y = margin;
  }
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Legend: [V]=Visit, [Rx]=Prescription, [H]=Home, [F]=Facility, *=Draft', margin, y);
  doc.setTextColor(0);

  // PDFをバッファとして取得
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="schedule_${start}_to_${end}.pdf"`,
    },
  });
}
