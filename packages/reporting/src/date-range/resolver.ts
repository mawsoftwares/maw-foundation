import { DateRangePreset } from '../types';
import type { DateRange, DateRangeRequest } from './types';
import { ReportValidationError } from '../errors';

export function resolveDateRange(request: DateRangeRequest): DateRange {
  const tz = request.timezone ?? 'UTC';

  if (request.preset === DateRangePreset.CUSTOM || !request.preset) {
    if (!request.from || !request.to) {
      throw new ReportValidationError('Custom date range requires both "from" and "to"');
    }
    const from = new Date(request.from);
    const to = new Date(request.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new ReportValidationError('Invalid date range: "from" or "to" is not a valid date');
    }
    if (from > to) {
      throw new ReportValidationError('"from" date must be before "to" date');
    }
    return { from, to, timezone: tz };
  }

  const now = nowInTimezone(tz);
  const { from, to } = resolvePreset(request.preset, now);
  return { from, to, timezone: tz };
}

function nowInTimezone(tz: string): Date {
  const str = new Date().toLocaleString('en-US', { timeZone: tz });
  return new Date(str);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(d, diff));
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1, 0, 0, 0, 0);
}

function endOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3 + 2;
  return endOfMonth(new Date(d.getFullYear(), q, 1));
}

function resolvePreset(
  preset: string,
  now: Date,
): { from: Date; to: Date } {
  switch (preset) {
    case DateRangePreset.TODAY:
      return { from: startOfDay(now), to: endOfDay(now) };

    case DateRangePreset.YESTERDAY: {
      const yesterday = addDays(now, -1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    }

    case DateRangePreset.THIS_WEEK:
      return { from: startOfWeek(now), to: endOfDay(now) };

    case DateRangePreset.LAST_WEEK: {
      const lastWeekEnd = addDays(startOfWeek(now), -1);
      const lastWeekStart = startOfWeek(lastWeekEnd);
      return { from: lastWeekStart, to: endOfDay(lastWeekEnd) };
    }

    case DateRangePreset.THIS_MONTH:
      return { from: startOfMonth(now), to: endOfDay(now) };

    case DateRangePreset.LAST_MONTH: {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
    }

    case DateRangePreset.THIS_QUARTER:
      return { from: startOfQuarter(now), to: endOfDay(now) };

    case DateRangePreset.LAST_QUARTER: {
      const prevQ = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return { from: startOfQuarter(prevQ), to: endOfQuarter(prevQ) };
    }

    case DateRangePreset.THIS_YEAR:
      return { from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), to: endOfDay(now) };

    case DateRangePreset.LAST_YEAR: {
      const lastYear = now.getFullYear() - 1;
      return {
        from: new Date(lastYear, 0, 1, 0, 0, 0, 0),
        to: new Date(lastYear, 11, 31, 23, 59, 59, 999),
      };
    }

    default:
      throw new ReportValidationError(`Unknown date range preset: ${preset}`);
  }
}
