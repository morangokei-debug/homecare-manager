import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format, addHours } from 'date-fns';

// ICS形式の日付フォーマット（JSTをUTCに変換）
function formatIcsDate(date: Date, time: Date | null): string {
  if (time) {
    // 時刻がある場合：YYYYMMDDTHHMMSSZ（UTC形式）
    const hours = time.getUTCHours();
    const minutes = time.getUTCMinutes();
    const dateTime = new Date(date);
    dateTime.setUTCHours(hours, minutes, 0, 0);
    // JSTからUTCに変換（-9時間）
    const utcDate = new Date(dateTime.getTime() - 9 * 60 * 60 * 1000);
    return format(utcDate, "yyyyMMdd'T'HHmmss'Z'");
  } else {
    // 時刻がない場合：YYYYMMDD（終日イベント）
    return format(date, 'yyyyMMdd');
  }
}

// 終了時刻を計算（時刻がある場合は1時間後、ない場合は翌日）
function getEndDate(date: Date, time: Date | null): string {
  if (time) {
    const hours = time.getUTCHours();
    const minutes = time.getUTCMinutes();
    const dateTime = new Date(date);
    dateTime.setUTCHours(hours, minutes, 0, 0);
    // 1時間後
    const endTime = addHours(dateTime, 1);
    // JSTからUTCに変換
    const utcDate = new Date(endTime.getTime() - 9 * 60 * 60 * 1000);
    return format(utcDate, "yyyyMMdd'T'HHmmss'Z'");
  } else {
    // 終日イベントの場合は翌日
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return format(nextDay, 'yyyyMMdd');
  }
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

  // 訪問イベントを取得（過去3ヶ月〜未来6ヶ月）
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  const events = await prisma.event.findMany({
    where: {
      type: 'visit',
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
    'PRODID:-//Homecare Manager//Visit Calendar//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:訪問予定',
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
    let summary = '【訪問】';
    if (isFacilityEvent) {
      summary += event.facility?.name || '施設';
    } else if (event.patient) {
      summary += event.patient.name;
      if (event.patient.facility) {
        summary += `（${event.patient.facility.name}）`;
      } else {
        summary += '（個人宅）';
      }
    }

    // 場所
    let location = '';
    if (isFacilityEvent && event.facility) {
      location = event.facility.address || '';
    } else if (event.patient) {
      location = event.patient.facility?.address || event.patient.address || '';
    }

    // 説明
    const descriptionParts: string[] = [];
    if (event.patient?.phone) {
      descriptionParts.push(`TEL: ${event.patient.phone}`);
    }
    if (event.assignee?.name) {
      descriptionParts.push(`担当: ${event.assignee.name}`);
    }
    if (event.memo) {
      descriptionParts.push(`メモ: ${event.memo}`);
    }
    const description = descriptionParts.join('\\n');

    // UID（永続的に一意）
    const uid = `visit-${event.id}@homecare-manager`;

    // タイムスタンプ
    const dtstamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
    const lastModified = format(event.updatedAt, "yyyyMMdd'T'HHmmss'Z'");

    icsLines.push('BEGIN:VEVENT');
    icsLines.push(`UID:${uid}`);
    icsLines.push(`DTSTAMP:${dtstamp}`);
    icsLines.push(`LAST-MODIFIED:${lastModified}`);
    
    // 日時
    const dtstart = formatIcsDate(event.date, event.time);
    const dtend = getEndDate(event.date, event.time);
    
    if (event.time) {
      icsLines.push(`DTSTART:${dtstart}`);
      icsLines.push(`DTEND:${dtend}`);
    } else {
      // 終日イベント
      icsLines.push(`DTSTART;VALUE=DATE:${dtstart}`);
      icsLines.push(`DTEND;VALUE=DATE:${dtend}`);
    }

    icsLines.push(foldLine(`SUMMARY:${escapeIcsText(summary)}`));
    
    if (location) {
      icsLines.push(foldLine(`LOCATION:${escapeIcsText(location)}`));
    }
    
    if (description) {
      icsLines.push(foldLine(`DESCRIPTION:${escapeIcsText(description)}`));
    }

    // ステータス（報告書記載済みは完了扱い）
    if (event.reportDone) {
      icsLines.push('STATUS:CONFIRMED');
    } else {
      icsLines.push('STATUS:TENTATIVE');
    }

    icsLines.push('END:VEVENT');
  }

  icsLines.push('END:VCALENDAR');

  // ICS出力
  const icsContent = icsLines.join('\r\n');

  return new NextResponse(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="visits.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

