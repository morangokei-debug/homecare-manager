import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { jsPDF } from 'jspdf';

// 日本語フォント用に明朝体のBase64を使わずにシンプルなテキスト出力
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end are required' }, { status: 400 });
  }

  const events = await prisma.event.findMany({
    where: {
      date: {
        gte: new Date(start),
        lte: new Date(end),
      },
    },
    include: {
      patient: {
        include: { facility: true },
      },
      assignee: {
        select: { name: true },
      },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  // PDFを生成（横向き）
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // ヘッダー
  doc.setFontSize(16);
  doc.text('Schedule Report', 14, 15);
  doc.setFontSize(10);
  doc.text(`Period: ${start} - ${end}`, 14, 22);
  doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 28);

  // テーブルデータの準備
  const tableData = events.map((event) => {
    const displayName = event.patient.displayMode === 'facility' && event.patient.facility
      ? event.patient.facility.name
      : event.patient.name;

    return [
      format(event.date, 'yyyy-MM-dd'),
      event.type === 'visit' ? 'Visit' : 'Prescription',
      displayName,
      event.startTime ? `${event.startTime.slice(0, 5)}${event.endTime ? ' - ' + event.endTime.slice(0, 5) : ''}` : '-',
      event.assignee?.name || '-',
      event.isCompleted ? 'Done' : 'Pending',
    ];
  });

  // シンプルなテーブル描画
  const headers = ['Date', 'Type', 'Patient/Facility', 'Time', 'Assignee', 'Status'];
  const colWidths = [30, 25, 80, 40, 50, 25];
  let yPos = 38;
  const xStart = 14;

  // ヘッダー行
  doc.setFillColor(59, 130, 246);
  doc.rect(xStart, yPos, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);

  let xPos = xStart + 2;
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5.5);
    xPos += colWidths[i];
  });

  yPos += 8;
  doc.setTextColor(0, 0, 0);

  // データ行
  tableData.forEach((row, rowIndex) => {
    if (yPos > 180) {
      doc.addPage();
      yPos = 20;
    }

    // 背景色（偶数行はグレー）
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(xStart, yPos, colWidths.reduce((a, b) => a + b, 0), 7, 'F');
    }

    xPos = xStart + 2;
    row.forEach((cell, i) => {
      // セル幅に収まるようにテキストを切り詰め
      const maxWidth = colWidths[i] - 4;
      let text = cell;
      while (doc.getTextWidth(text) > maxWidth && text.length > 3) {
        text = text.slice(0, -4) + '...';
      }
      doc.text(text, xPos, yPos + 5);
      xPos += colWidths[i];
    });

    yPos += 7;
  });

  // テーブルの枠線
  doc.setDrawColor(200, 200, 200);
  doc.rect(xStart, 38, colWidths.reduce((a, b) => a + b, 0), yPos - 38);

  // PDFをバイナリとして取得
  const pdfOutput = doc.output('arraybuffer');

  return new NextResponse(pdfOutput, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="schedule_${start}_${end}.pdf"`,
    },
  });
}

