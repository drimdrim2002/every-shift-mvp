# Solver Request Payload 가이드

## 개요

이 문서는 Step5에서 AI Solver로 전송하는 `SolverRequest` 페이로드 구조를 정의합니다.
단일 기준 샘플은 `data/request.json`이며, 이 문서와 코드(`mapToSolverRequest`)는 해당 포맷을 기준으로 유지합니다.

## 최종 요청 구조

```typescript
interface SolverRequest {
  organization: {
    id: string;
    name: string;
    type: string;
    shifts: PlanningShift[]; // D/E/N only
    lastHistoricalDate: string;
    firstDraftDate: string;
    publishLength: number;
    draftLength: number;
  };
  employees: SolverRequestEmployee[];
  history: SolverRequestHistoryItem[];
  undesirable: SolverRequestUndesirableItem[];
  requirements: SolverRequestRequirementItem[];
}

interface PlanningShift {
  id: string;
  code: 'D' | 'E' | 'N';
  name: string;
  start_time: string;
  end_time: string;
}

interface SolverRequestEmployee {
  employee_id: string;
  name: string;
  available_shifts: string[];
  skill_set: string[]; // e.g. ["ALL"]
}

interface SolverRequestHistoryItem {
  employee_id: string;
  shift_id: string;
  date: string;      // YYYY-MM-DD
  is_locked: true;   // always true
}

interface SolverRequestUndesirableItem {
  employee_id: string;
  date: string;      // YYYY-MM-DD
  is_locked: false;  // always false
}

interface SolverRequestRequirementItem {
  shiftId: string;
  dayIndex: number;      // 0-based from firstDraftDate
  employeeCount: number;
}
```

## 핵심 규칙

1. `organization.shifts`는 `D/E/N`만 전송합니다. (`O` 제외)
2. `history`는 `date < firstDraftDate` 데이터만 포함합니다.
3. `history`에서는 `O` 시프트를 제외합니다.
4. `undesirable`에는 `shift_id`를 포함하지 않습니다.
5. `undesirable`는 `date >= firstDraftDate`인 `O` 요청만 포함합니다.

## 필드 매핑 출처

- `organization` / `employees` / `shifts`: 조직/직원/시프트 조회 데이터
- `history`: `schedule_assignments` 기반 기존 배정
- `undesirable`: `schedule_preferences`의 `O` 요청 기반
- `requirements`: Step2 요일별 요구사항을 날짜 인덱스(`dayIndex`)로 변환

## 구현 위치

- `src/views/schedule/Step5Result.vue`
: `buildSolverRequest()`에서 입력 데이터 수집
- `src/utils/solverMapper.ts`
: `mapToSolverRequest()`에서 최종 스키마로 변환
- `src/api/solver.ts`
: `createSolverExecution()`에서 POST `/api/solve` 호출

## 검증 체크리스트

1. `organization.shifts` 코드 집합이 정확히 `D/E/N`인지 확인
2. `history`의 모든 항목이 `firstDraftDate` 이전인지 확인
3. `history`에 `O` 시프트가 없는지 확인
4. `undesirable` 항목에 `shift_id` 키가 없는지 확인
5. `requirements.dayIndex`가 0부터 연속 증가하는지 확인

## 예시 JSON

```json
{
  "organization": {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "세브란스병원",
    "type": "hospital",
    "shifts": [
      {
        "id": "a5bcb7c0-b9b1-408d-9add-fd08c13b951c",
        "code": "D",
        "name": "Day",
        "start_time": "08:00:00",
        "end_time": "16:00:00"
      },
      {
        "id": "9ba021e7-1c4a-4f38-a577-ffc6dbcda56d",
        "code": "E",
        "name": "Evening",
        "start_time": "16:00:00",
        "end_time": "00:00:00"
      },
      {
        "id": "493edb73-a7a0-4751-8bc1-92745c8bf729",
        "code": "N",
        "name": "Night",
        "start_time": "00:00:00",
        "end_time": "08:00:00"
      }
    ],
    "lastHistoricalDate": "2025-11-26",
    "firstDraftDate": "2025-12-01",
    "publishLength": 4,
    "draftLength": 31
  },
  "employees": [
    {
      "employee_id": "3515886c-6359-4919-9c02-682565bb93c7",
      "name": "고소영",
      "available_shifts": ["D", "E", "N"],
      "skill_set": ["ALL"]
    }
  ],
  "history": [
    {
      "employee_id": "3515886c-6359-4919-9c02-682565bb93c7",
      "shift_id": "a5bcb7c0-b9b1-408d-9add-fd08c13b951c",
      "date": "2025-11-30",
      "is_locked": true
    }
  ],
  "undesirable": [
    {
      "employee_id": "3515886c-6359-4919-9c02-682565bb93c7",
      "date": "2025-12-03",
      "is_locked": false
    }
  ],
  "requirements": [
    {
      "shiftId": "a5bcb7c0-b9b1-408d-9add-fd08c13b951c",
      "dayIndex": 0,
      "employeeCount": 3
    }
  ]
}
```
