import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const type = searchParams.get('type') as 'visit' | 'prescription';

  if (!start || !end || !type) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // イベントを取得
  const events = await prisma.event.findMany({
    where: {
      date: {
        gte: new Date(start),
        lte: new Date(end),
      },
      type: type,
    },
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

  doc.setFont('helvetica');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // タイトル
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const typeLabel = type === 'visit' ? 'Visit Schedule' : 'Prescription Schedule';

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(typeLabel, margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(
    `Period: ${format(startDate, 'yyyy/MM/dd')} - ${format(endDate, 'yyyy/MM/dd')}`,
    margin,
    y
  );
  y += 5;
  doc.text(`Output: ${format(new Date(), 'yyyy/MM/dd HH:mm')}`, margin, y);
  y += 5;
  doc.text(`Total: ${events.length} events`, margin, y);
  doc.setTextColor(0);
  y += 10;

  // ヘッダー行
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', margin + 2, y);
  doc.text('Time', margin + 35, y);
  doc.text('Patient', margin + 55, y);
  doc.text('Location', margin + 100, y);
  doc.text('Staff', margin + 145, y);
  y += 8;

  doc.setFont('helvetica', 'normal');

  // イベント一覧
  for (const event of events) {
    // ページ送り
    if (y > 275) {
      doc.addPage();
      y = margin;

      // ヘッダー再描画
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Date', margin + 2, y);
      doc.text('Time', margin + 35, y);
      doc.text('Patient', margin + 55, y);
      doc.text('Location', margin + 100, y);
      doc.text('Staff', margin + 145, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
    }

    const dateStr = format(event.date, 'M/d (E)', { locale: ja });
    const timeStr = event.time ? format(event.time, 'HH:mm') : '--:--';
    
    // 施設全体イベントか患者イベントか判定
    const isFacilityEvent = event.facilityId && !event.patientId;
    const patientName = isFacilityEvent 
      ? (event.facility?.name || 'Facility') 
      : (event.patient?.name || '');
    const location = isFacilityEvent
      ? 'Facility'
      : event.patient?.facility?.name || 'Home';
    const staff = event.assignee?.name || '-';

    doc.setFontSize(9);
    doc.text(dateStr, margin + 2, y);
    doc.text(timeStr, margin + 35, y);
    
    // 長い名前は切り詰め
    const truncatedPatient = patientName.length > 15 ? patientName.substring(0, 14) + '...' : patientName;
    const truncatedLocation = location.length > 15 ? location.substring(0, 14) + '...' : location;
    const truncatedStaff = staff.length > 10 ? staff.substring(0, 9) + '...' : staff;
    
    doc.text(truncatedPatient, margin + 55, y);
    doc.text(truncatedLocation, margin + 100, y);
    doc.text(truncatedStaff, margin + 145, y);

    y += 6;

    // 薄い区切り線
    doc.setDrawColor(230);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
  }

  // 空の場合
  if (events.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('No events found for this period.', margin, y + 10);
    doc.setTextColor(0);
  }

  // PDFをバッファとして取得
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  const fileName = `${type}_schedule_${start}_to_${end}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
