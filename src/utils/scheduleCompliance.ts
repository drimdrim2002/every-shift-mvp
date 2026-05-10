import type { AssignmentMap, ConstraintMap } from '@/types/schedule';
import type {
  EvaluateScheduleComplianceInput,
  OffRequestComplianceSummary,
  ScheduleComplianceResult,
  ScheduleComplianceRuleCode,
  ScheduleComplianceRuleSummary,
  ScheduleComplianceViolation,
} from '@/types/scheduleCompliance';
import type { Shift } from '@/types/shift';

type WorkShiftCode = 'D' | 'E' | 'N';
type KnownShiftCode = WorkShiftCode | 'O';

interface ParsedDate {
  value: Date;
  time: number;
}

interface WorkInterval {
  start: Date;
  end: Date;
}

interface TimelineEntry {
  employeeId: string;
  employeeName: string;
  date: string;
  dateTime: number;
  shiftCode: string;
}

interface EmployeeTimeline {
  employeeId: string;
  employeeName: string;
  order: number;
  entries: TimelineEntry[];
}

interface NormalizedInput {
  month: string;
  employees: Array<{ id: string; name: string }>;
  employeeNames: Map<string, string>;
  employeeOrder: Map<string, number>;
  assignments: AssignmentMap;
  offRequests: ConstraintMap;
  shifts: Shift[];
  shiftTimes: Map<KnownShiftCode, ShiftTime>;
  checkRequiredReasons: string[];
}

interface ShiftTime {
  startTime: string | null;
  endTime: string | null;
}

const RULE_ORDER: ScheduleComplianceRuleCode[] = [
  'nod_pattern',
  'triple_night',
  'rest_after_two_nights',
  'monthly_night_limit',
];

export const RULE_LABELS: Record<ScheduleComplianceRuleCode, string> = {
  nod_pattern: 'NOD 금지',
  triple_night: '4연속 야간 금지 (3연속 허용)',
  rest_after_two_nights: '연속 야간 후 48시간 휴식',
  monthly_night_limit: '월 야간 15회 이하',
};

const FALLBACK_SHIFT_TIMES: Record<KnownShiftCode, ShiftTime> = {
  D: { startTime: '08:00:00', endTime: '16:00:00' },
  E: { startTime: '16:00:00', endTime: '00:00:00' },
  N: { startTime: '00:00:00', endTime: '08:00:00' },
  O: { startTime: null, endTime: null },
};

const KNOWN_SHIFT_CODES = new Set<string>(['D', 'E', 'N', 'O']);
const WORK_SHIFT_CODES = new Set<string>(['D', 'E', 'N']);
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_CONSECUTIVE_NIGHTS = 3;
const CONSECUTIVE_NIGHT_VIOLATION_THRESHOLD = MAX_CONSECUTIVE_NIGHTS + 1;
const MIN_REST_AFTER_CONSECUTIVE_NIGHTS_MS = 48 * 60 * 60 * 1000;

export function evaluateScheduleCompliance(
  input: EvaluateScheduleComplianceInput
): ScheduleComplianceResult {
  const normalized = normalizeInput(input);
  const timelines = buildEmployeeTimelines(normalized);
  const violations = [
    ...evaluateNodPattern(timelines),
    ...evaluateConsecutiveNightLimit(timelines),
    ...evaluateRestAfterTwoNights(timelines, normalized.shiftTimes),
    ...evaluateMonthlyNightLimit(timelines, normalized.month),
  ].sort((left, right) => compareViolations(left, right, normalized.employeeOrder));
  const mandatoryViolationCount = violations.length;
  const checkRequiredCount = normalized.checkRequiredReasons.length;
  const summaries = buildSummaries(violations, checkRequiredCount);
  const mandatoryPassed = mandatoryViolationCount === 0 && checkRequiredCount === 0;

  return {
    mandatoryPassed,
    canFinalizeLocally: mandatoryPassed,
    mandatoryViolationCount,
    checkRequiredCount,
    summaries,
    violations,
    offRequests: evaluateOffRequests(normalized),
  };
}

function normalizeInput(input: EvaluateScheduleComplianceInput): NormalizedInput {
  const checkRequiredReasons: string[] = [];
  const rawInput = input as Partial<EvaluateScheduleComplianceInput> | null | undefined;
  const month = typeof rawInput?.month === 'string' ? rawInput.month : '';
  const employees = Array.isArray(rawInput?.employees) ? rawInput.employees : [];
  const assignments = isRecord(rawInput?.assignments) ? rawInput.assignments as AssignmentMap : {};
  const offRequests = isRecord(rawInput?.offRequests) ? rawInput.offRequests as ConstraintMap : {};
  const shifts = Array.isArray(rawInput?.shifts) ? rawInput.shifts : [];

  if (!isValidMonth(month)) {
    checkRequiredReasons.push('대상 월 형식 확인 필요');
  }

  if (!Array.isArray(rawInput?.employees)) {
    checkRequiredReasons.push('직원 목록 확인 필요');
  }

  if (!isRecord(rawInput?.assignments)) {
    checkRequiredReasons.push('근무 배정 데이터 확인 필요');
  }

  if (!isRecord(rawInput?.offRequests)) {
    checkRequiredReasons.push('Off 요청 데이터 확인 필요');
  }

  if (!Array.isArray(rawInput?.shifts)) {
    checkRequiredReasons.push('근무 코드 데이터 확인 필요');
  }

  const employeeNames = new Map<string, string>();
  const knownEmployeeIds = new Set<string>();
  const validEmployees: Array<{ id: string; name: string }> = [];

  for (const employee of employees) {
    if (!employee || typeof employee.id !== 'string' || employee.id.trim() === '') {
      checkRequiredReasons.push('직원 ID 확인 필요');
      continue;
    }

    const id = employee.id.trim();
    const name = typeof employee.name === 'string' && employee.name.trim() !== ''
      ? employee.name
      : id;

    if (knownEmployeeIds.has(id)) {
      checkRequiredReasons.push(`${id} 직원 ID 중복 확인 필요`);
      continue;
    }

    knownEmployeeIds.add(id);
    employeeNames.set(id, name);
    validEmployees.push({ id, name });
  }

  const unknownEmployeeIds = findUnknownEmployeeIds(assignments, offRequests, knownEmployeeIds);
  for (const employeeId of unknownEmployeeIds) {
    employeeNames.set(employeeId, employeeId);
    validEmployees.push({ id: employeeId, name: employeeId });
    checkRequiredReasons.push(`${employeeId} 직원 정보 확인 필요`);
  }

  const employeeOrder = new Map<string, number>();
  validEmployees.forEach((employee, index) => {
    employeeOrder.set(employee.id, index);
  });

  const shiftTimes = buildShiftTimeMap(shifts);
  collectDataQualityChecks(assignments, offRequests, month, checkRequiredReasons);

  return {
    month,
    employees: validEmployees,
    employeeNames,
    employeeOrder,
    assignments,
    offRequests,
    shifts,
    shiftTimes,
    checkRequiredReasons,
  };
}

function buildEmployeeTimelines(input: NormalizedInput): EmployeeTimeline[] {
  return input.employees.map((employee, order) => {
    const employeeAssignments = input.assignments[employee.id] ?? {};
    const entries = Object.entries(employeeAssignments)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([date, rawShiftCode]) => {
        const parsedDate = parseDate(date);
        return {
          employeeId: employee.id,
          employeeName: input.employeeNames.get(employee.id) ?? employee.id,
          date,
          dateTime: parsedDate?.time ?? Number.POSITIVE_INFINITY,
          shiftCode: normalizeShiftCode(rawShiftCode),
        };
      })
      .sort((left, right) => left.dateTime - right.dateTime || left.date.localeCompare(right.date));

    return {
      employeeId: employee.id,
      employeeName: input.employeeNames.get(employee.id) ?? employee.id,
      order,
      entries,
    };
  });
}

function evaluateNodPattern(timelines: EmployeeTimeline[]): ScheduleComplianceViolation[] {
  const violations: ScheduleComplianceViolation[] = [];

  for (const timeline of timelines) {
    for (let index = 0; index <= timeline.entries.length - 3; index += 1) {
      const window = timeline.entries.slice(index, index + 3);
      if (
        hasConsecutiveDates(window)
        && window[0]?.shiftCode === 'N'
        && window[1]?.shiftCode === 'O'
        && window[2]?.shiftCode === 'D'
      ) {
        const dates = window.map((entry) => entry.date);
        violations.push(createViolation(
          'nod_pattern',
          timeline.employeeId,
          timeline.employeeName,
          dates,
          `${timeline.employeeName}님의 ${dates.join(', ')} 배정이 N-O-D 패턴입니다. 야간 후 휴무 다음 바로 주간 근무는 금지됩니다.`
        ));
      }
    }
  }

  return violations;
}

function evaluateConsecutiveNightLimit(timelines: EmployeeTimeline[]): ScheduleComplianceViolation[] {
  const violations: ScheduleComplianceViolation[] = [];

  for (const timeline of timelines) {
    for (let index = 0; index <= timeline.entries.length - CONSECUTIVE_NIGHT_VIOLATION_THRESHOLD; index += 1) {
      const window = timeline.entries.slice(index, index + CONSECUTIVE_NIGHT_VIOLATION_THRESHOLD);
      if (hasConsecutiveDates(window) && window.every((entry) => entry.shiftCode === 'N')) {
        const dates = window.map((entry) => entry.date);
        violations.push(createViolation(
          'triple_night',
          timeline.employeeId,
          timeline.employeeName,
          dates,
          `${timeline.employeeName}님에게 ${dates.join(', ')} 4연속 야간 근무가 배정되었습니다. 3연속까지는 허용됩니다.`
        ));
      }
    }
  }

  return violations;
}

function evaluateRestAfterTwoNights(
  timelines: EmployeeTimeline[],
  shiftTimes: Map<KnownShiftCode, ShiftTime>
): ScheduleComplianceViolation[] {
  const violations: ScheduleComplianceViolation[] = [];

  for (const timeline of timelines) {
    for (let index = 0; index < timeline.entries.length; index += 1) {
      const streak = collectConsecutiveNightStreak(timeline.entries, index);
      if (!streak) {
        continue;
      }

      const { endIndex, entries } = streak;
      const lastNight = entries[entries.length - 1];
      const lastNightInterval = lastNight
        ? buildWorkInterval(lastNight.date, 'N', shiftTimes)
        : null;
      if (!lastNightInterval) {
        index = endIndex;
        continue;
      }

      const nextWork = timeline.entries.slice(endIndex + 1).find((entry) =>
        WORK_SHIFT_CODES.has(entry.shiftCode)
      );

      if (!nextWork) {
        index = endIndex;
        continue;
      }

      const nextWorkInterval = buildWorkInterval(nextWork.date, nextWork.shiftCode as WorkShiftCode, shiftTimes);
      if (!nextWorkInterval) {
        index = endIndex;
        continue;
      }

      const restMs = nextWorkInterval.start.getTime() - lastNightInterval.end.getTime();
      if (restMs < MIN_REST_AFTER_CONSECUTIVE_NIGHTS_MS) {
        const dates = [...entries.map((entry) => entry.date), nextWork.date];
        violations.push(createViolation(
          'rest_after_two_nights',
          timeline.employeeId,
          timeline.employeeName,
          dates,
          `${timeline.employeeName}님은 연속 야간 종료 후 48시간 휴식 전에 다음 근무가 배정되었습니다.`
        ));
      }

      index = endIndex;
    }
  }

  return violations;
}

function evaluateMonthlyNightLimit(
  timelines: EmployeeTimeline[],
  month: string
): ScheduleComplianceViolation[] {
  const violations: ScheduleComplianceViolation[] = [];

  for (const timeline of timelines) {
    const nightDates = timeline.entries
      .filter((entry) => isTargetMonthDate(entry.date, month) && entry.shiftCode === 'N')
      .map((entry) => entry.date);

    if (nightDates.length >= 16) {
      violations.push(createViolation(
        'monthly_night_limit',
        timeline.employeeId,
        timeline.employeeName,
        nightDates,
        `${timeline.employeeName}님의 ${month} 야간 근무가 ${nightDates.length}회입니다. 월 15회를 초과할 수 없습니다.`
      ));
    }
  }

  return violations;
}

function evaluateOffRequests(input: NormalizedInput): OffRequestComplianceSummary {
  let totalRequests = 0;
  let fulfilledRequests = 0;

  for (const [employeeId, requestsByDate] of Object.entries(input.offRequests)) {
    if (!isRecord(requestsByDate)) {
      continue;
    }

    for (const [date, requestCode] of Object.entries(requestsByDate)) {
      if (requestCode !== 'O' || !isTargetMonthDate(date, input.month)) {
        continue;
      }

      totalRequests += 1;
      if (isOffRequestFulfilledByAssignment(input.assignments[employeeId]?.[date])) {
        fulfilledRequests += 1;
      }
    }
  }

  const unfulfilledRequests = totalRequests - fulfilledRequests;
  return {
    totalRequests,
    fulfilledRequests,
    unfulfilledRequests,
    reflectionRate: totalRequests === 0 ? null : Math.round((fulfilledRequests / totalRequests) * 100),
  };
}

function isOffRequestFulfilledByAssignment(assignment: string | undefined): boolean {
  if (assignment === undefined) {
    return true;
  }

  const shiftCode = normalizeShiftCode(assignment);
  return shiftCode === '' || shiftCode === 'O';
}

function buildSummaries(
  violations: ScheduleComplianceViolation[],
  checkRequiredCount: number
): ScheduleComplianceRuleSummary[] {
  return RULE_ORDER.map((code) => {
    const violationCount = violations.filter((violation) => violation.ruleCode === code).length;

    if (violationCount > 0) {
      return {
        code,
        label: RULE_LABELS[code],
        status: 'failed',
        violationCount,
        message: `${violationCount}건의 위반이 있습니다.`,
      };
    }

    if (checkRequiredCount > 0) {
      return {
        code,
        label: RULE_LABELS[code],
        status: 'check_required',
        violationCount: 0,
        message: '일부 데이터를 자동 확인할 수 없어 검토가 필요합니다.',
      };
    }

    return {
      code,
      label: RULE_LABELS[code],
      status: 'passed',
      violationCount: 0,
      message: '위반 없음',
    };
  });
}

function parseDate(date: string): ParsedDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = new Date(Date.UTC(year, month - 1, day));

  if (
    value.getUTCFullYear() !== year
    || value.getUTCMonth() !== month - 1
    || value.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    value,
    time: value.getTime(),
  };
}

function buildWorkInterval(
  date: string,
  shiftCode: WorkShiftCode,
  shiftTimes: Map<KnownShiftCode, ShiftTime>
): WorkInterval | null {
  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return null;
  }

  const shiftTime = shiftTimes.get(shiftCode) ?? FALLBACK_SHIFT_TIMES[shiftCode];
  const parsedStartTime = shiftTime.startTime ? parseTime(shiftTime.startTime) : null;
  const parsedEndTime = shiftTime.endTime ? parseTime(shiftTime.endTime) : null;
  const fallbackTime = FALLBACK_SHIFT_TIMES[shiftCode];
  const startTime = parsedStartTime ?? parseTime(fallbackTime.startTime ?? '');
  const endTime = parsedEndTime ?? parseTime(fallbackTime.endTime ?? '');

  if (startTime === null || endTime === null) {
    return null;
  }

  // Night shifts keep the solver's logical schedule-date-to-next-day offset,
  // even when custom start/end times are supplied.
  const baseOffset = shiftCode === 'N' ? DAY_IN_MS : 0;
  const start = new Date(parsedDate.time + baseOffset + startTime);
  let end = new Date(parsedDate.time + baseOffset + endTime);

  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime() + DAY_IN_MS);
  }

  return { start, end };
}

function isTargetMonthDate(date: string, month: string): boolean {
  return typeof date === 'string'
    && typeof month === 'string'
    && date.startsWith(month)
    && parseDate(date) !== null;
}

function buildShiftTimeMap(shifts: Shift[]): Map<KnownShiftCode, ShiftTime> {
  const shiftTimes = new Map<KnownShiftCode, ShiftTime>();

  for (const code of KNOWN_SHIFT_CODES) {
    shiftTimes.set(code as KnownShiftCode, FALLBACK_SHIFT_TIMES[code as KnownShiftCode]);
  }

  for (const shift of shifts) {
    if (!shift || !KNOWN_SHIFT_CODES.has(shift.code)) {
      continue;
    }

    if (shift.startTime && shift.endTime && parseTime(shift.startTime) !== null && parseTime(shift.endTime) !== null) {
      shiftTimes.set(shift.code as KnownShiftCode, {
        startTime: shift.startTime,
        endTime: shift.endTime,
      });
    }
  }

  return shiftTimes;
}

function collectDataQualityChecks(
  assignments: AssignmentMap,
  offRequests: ConstraintMap,
  month: string,
  checkRequiredReasons: string[]
) {
  for (const [employeeId, assignmentsByDate] of Object.entries(assignments)) {
    if (!isRecord(assignmentsByDate)) {
      checkRequiredReasons.push(`${employeeId} 근무 배정 형식 확인 필요`);
      continue;
    }

    for (const [date, shiftCode] of Object.entries(assignmentsByDate)) {
      if (!parseDate(date)) {
        checkRequiredReasons.push(`${employeeId} ${date} 날짜 확인 필요`);
      }

      if (typeof shiftCode !== 'string') {
        checkRequiredReasons.push(`${employeeId} ${date} 근무 코드 확인 필요`);
        continue;
      }

      const normalizedShiftCode = normalizeShiftCode(shiftCode);
      if (normalizedShiftCode !== '' && !KNOWN_SHIFT_CODES.has(normalizedShiftCode)) {
        checkRequiredReasons.push(`${employeeId} ${date} 알 수 없는 근무 코드 확인 필요`);
      }
    }
  }

  for (const [employeeId, requestsByDate] of Object.entries(offRequests)) {
    if (!isRecord(requestsByDate)) {
      checkRequiredReasons.push(`${employeeId} Off 요청 형식 확인 필요`);
      continue;
    }

    for (const [date, requestCode] of Object.entries(requestsByDate)) {
      if (!parseDate(date)) {
        checkRequiredReasons.push(`${employeeId} ${date} Off 요청 날짜 확인 필요`);
      }

      if (isTargetMonthDate(date, month) && requestCode !== 'O' && requestCode !== '') {
        checkRequiredReasons.push(`${employeeId} ${date} Off 요청 코드 확인 필요`);
      }
    }
  }
}

function createViolation(
  ruleCode: ScheduleComplianceRuleCode,
  employeeId: string,
  employeeName: string,
  dates: string[],
  message: string
): ScheduleComplianceViolation {
  return {
    id: `${ruleCode}:${employeeId}:${dates.join('|')}`,
    ruleCode,
    employeeId,
    employeeName,
    dates,
    message,
  };
}

function compareViolations(
  left: ScheduleComplianceViolation,
  right: ScheduleComplianceViolation,
  employeeOrder: Map<string, number>
): number {
  const leftOrder = employeeOrder.get(left.employeeId) ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = employeeOrder.get(right.employeeId) ?? Number.MAX_SAFE_INTEGER;
  return leftOrder - rightOrder
    || left.employeeId.localeCompare(right.employeeId)
    || (parseDate(left.dates[0] ?? '')?.time ?? Number.POSITIVE_INFINITY)
      - (parseDate(right.dates[0] ?? '')?.time ?? Number.POSITIVE_INFINITY)
    || RULE_ORDER.indexOf(left.ruleCode) - RULE_ORDER.indexOf(right.ruleCode);
}

function hasConsecutiveDates(entries: TimelineEntry[]): boolean {
  for (let index = 0; index < entries.length - 1; index += 1) {
    const current = entries[index];
    const next = entries[index + 1];
    if (!current || !next || !areConsecutiveDates(current, next)) {
      return false;
    }
  }

  return entries.length > 0;
}

function areConsecutiveDates(left: TimelineEntry, right: TimelineEntry): boolean {
  if (!Number.isFinite(left.dateTime) || !Number.isFinite(right.dateTime)) {
    return false;
  }

  return right.dateTime - left.dateTime === DAY_IN_MS;
}

function collectConsecutiveNightStreak(
  entries: TimelineEntry[],
  startIndex: number
): { endIndex: number; entries: TimelineEntry[] } | null {
  const first = entries[startIndex];
  if (!first || first.shiftCode !== 'N') {
    return null;
  }

  const streak: TimelineEntry[] = [first];
  let endIndex = startIndex;

  for (let index = startIndex + 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const current = entries[index];
    if (!previous || !current || current.shiftCode !== 'N' || !areConsecutiveDates(previous, current)) {
      break;
    }

    streak.push(current);
    endIndex = index;
  }

  return streak.length >= 2
    ? { endIndex, entries: streak }
    : null;
}

function findUnknownEmployeeIds(
  assignments: AssignmentMap,
  offRequests: ConstraintMap,
  knownEmployeeIds: Set<string>
): string[] {
  const employeeIds = new Set<string>([
    ...Object.keys(assignments),
    ...Object.keys(offRequests),
  ]);

  return Array.from(employeeIds)
    .filter((employeeId) => !knownEmployeeIds.has(employeeId))
    .sort((left, right) => left.localeCompare(right));
}

function isValidMonth(month: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return false;
  }

  const monthNumber = Number(match[2]);
  return monthNumber >= 1 && monthNumber <= 12;
}

function normalizeShiftCode(shiftCode: string): string {
  return shiftCode.trim().toUpperCase();
}

function parseTime(time: string): number | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? '0');

  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  return ((hour * 60 + minute) * 60 + second) * 1000;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
