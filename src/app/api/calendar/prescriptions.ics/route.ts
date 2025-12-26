import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format, addHours } from 'date-fns';

// ICS形式の日付フォーマット
function formatIcsDate(date: Date): string {
  // 処方予定は終日イベントとして扱う
  return format(date, 'yyyyMMdd');
}

// 文字列をICS用にエスケープ
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// 長い行を75文字で折り返し（ICS仕様）
function foldLine(line: string): string {
  const maxLength = 75;
  if (line.length <= maxLength) return line;
  
  let result = '';
  let remaining = line;
  let isFirst = true;
  
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, isFirst ? maxLength : maxLength - 1);
    result += (isFirst ? '' : '\r\n ') + chunk;
    remaining = remaining.slice(isFirst ? maxLength : maxLength - 1);
    isFirst = false;
  }
  
  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  // トークン検証
  if (!token) {
    return new NextResponse('Unauthorized: Token required', { status: 401 });
  }

  const icsToken = await prisma.icsToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!icsToken || !icsToken.isActive) {
    return new NextResponse('Unauthorized: Invalid or inactive token', { status: 401 });
  }

  // 処方イベントを取得（過去3ヶ月〜未来6ヶ月）
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  const events = await prisma.event.findMany({
    where: {
      type: 'prescription',
      date: {
        gte: threeMonthsAgo,
        lte: sixMonthsLater,
      },
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

  // ICSヘッダー
  const icsLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Homecare Manager//Prescription Calendar//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:処方予定',
    'X-WR-TIMEZONE:Asia/Tokyo',
  ];

  // タイムゾーン定義
  icsLines.push(
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Tokyo',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0900',
    'TZOFFSETTO:+0900',
    'TZNAME:JST',
    'END:STANDARD',
    'END:VTIMEZONE'
  );

  // 各イベントをVEVENTに変換
  for (const event of events) {
    const isFacilityEvent = event.facilityId && !event.patientId;
    
    // タイトル生成
    let summary = '💊';
    if (isFacilityEvent) {
      summary += event.facility?.name || '施設';
    } else if (event.patient) {
      summary += event.patient.name;
      if (event.patient.facility) {
        summary += `（${event.patient.facility.name}）`;
      }
    }

    // 説明
    const descriptionParts: string[] = [];
    descriptionParts.push('処方予定（受診・発行予定日）');
    if (event.patient?.phone) {
      descriptionParts.push(`TEL: ${event.patient.phone}`);
    }
    if (event.assignee?.name) {
      descriptionParts.push(`担当: ${event.assignee.name}`);
    }
    if (event.memo) {
      descriptionParts.push(`メモ: ${event.memo}`);
    }
    if (event.isRecurring && event.recurringInterval) {
      descriptionParts.push(`定期処方: ${event.recurringInterval}日間隔`);
    }
    const description = descriptionParts.join('\\n');

    // UID（永続的に一意）
    const uid = `rx-${event.id}@homecare-manager`;

    // タイムスタンプ
    const dtstamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
    const lastModified = format(event.updatedAt, "yyyyMMdd'T'HHmmss'Z'");

    // 終日イベント
    const dtstart = formatIcsDate(event.date);
    const nextDay = new Date(event.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const dtend = formatIcsDate(nextDay);

    icsLines.push('BEGIN:VEVENT');
    icsLines.push(`UID:${uid}`);
    icsLines.push(`DTSTAMP:${dtstamp}`);
    icsLines.push(`LAST-MODIFIED:${lastModified}`);
    icsLines.push(`DTSTART;VALUE=DATE:${dtstart}`);
    icsLines.push(`DTEND;VALUE=DATE:${dtend}`);
    icsLines.push(foldLine(`SUMMARY:${escapeIcsText(summary)}`));
    
    if (description) {
      icsLines.push(foldLine(`DESCRIPTION:${escapeIcsText(description)}`));
    }

    icsLines.push('STATUS:CONFIRMED');
    icsLines.push('END:VEVENT');
  }

  icsLines.push('END:VCALENDAR');

  // ICS出力
  const icsContent = icsLines.join('\r\n');

  return new NextResponse(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="prescriptions.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

