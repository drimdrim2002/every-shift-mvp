# Planning Payload 가이드

## 개요

Step4에서 "근무표 생성" 버튼을 누르면 AI Planning 엔진에 필요한 입력 데이터를 JSON 형태로 구성하여 전달합니다.

## 데이터 구조

### PlanningPayload 타입

```typescript
interface PlanningPayload {
  organization: PlanningOrganization;
  shifts: PlanningShift[];
  employees: PlanningEmployee[];
  assignments: PlanningAssignment[];
  requirements: SiteRequirements;
}
```

### 1. 조직 정보 (organization)

**테이블**: `organizations`  
**필드**: `id`, `name`, `type`

```typescript
interface PlanningOrganization {
  id: string;           // 조직 UUID
  name: string;         // 조직명
  type: string;         // 조직 유형 (hospital, fire, police)
}
```

### 2. 시프트 정보 (shifts)

**테이블**: `shifts`  
**필터**: `organization_id = {조직ID}`  
**필드**: `code`, `name`, `start_time`, `end_time`

```typescript
interface PlanningShift {
  code: string;         // 시프트 코드 (D, E, N, O)
  name: string;         // 시프트 이름 (Day, Evening, Night, Off)
  start_time: string;   // 시작 시간 (HH:MM:SS)
  end_time: string;     // 종료 시간 (HH:MM:SS)
}
```

### 3. 직원 정보 (employees)

**테이블**: `employees`  
**필터**: `organization_id = {조직ID}`  
**필드**: `id`, `name`, `available_shifts`

```typescript
interface PlanningEmployee {
  employee_id: string;      // 직원 UUID
  name: string;             // 직원 이름
  available_shifts: string[]; // 가능한 시프트 배열 (예: ["D","E","N","O"])
}
```

### 4. 배정 정보 (assignments)

**테이블**: `schedule_assignments`  
**필터**: `schedule_id = {스케줄ID}`  
**필드**: `employee_id`, `shift_id`, `date`, `is_locked`

```typescript
interface PlanningAssignment {
  employee_id: string;  // 직원 UUID
  shift_id: string;     // 시프트 UUID
  date: string;         // 날짜 (YYYY-MM-DD)
  is_locked: boolean;   // 잠금 여부 (true면 AI가 변경 불가)
}
```

**참고**: 
- 기존 DB의 배정과 현재 그리드의 배정을 병합합니다.
- 그리드 데이터가 우선순위를 가집니다.
- `off_reason`이 있는 셀은 `is_locked=true`로 설정됩니다.

### 5. 요구사항 (requirements)

**출처**: Step2에서 입력한 요일별 요구사항을 날짜별로 변환  
**형식**: `{ [date: string]: DailyRequirement }`

```typescript
interface SiteRequirements {
  [date: string]: DailyRequirement;
}

interface DailyRequirement {
  D: number;      // Day 시프트 필요 인원
  E: number;      // Evening 시프트 필요 인원
  N: number;      // Night 시프트 필요 인원
  O: number;      // Off 필요 인원
  total: number;  // 총 인원
}
```

## 구현 위치

### 타입 정의
- `src/types/schedule.ts` - Planning Payload 타입 정의

### API 함수
- `src/api/schedule.ts` - 데이터 조회 함수들
  - `getPlanningOrganization()` - 조직 정보 조회
  - `getPlanningShifts()` - 시프트 정보 조회
  - `getPlanningEmployees()` - 직원 정보 조회
  - `getPlanningAssignments()` - 배정 정보 조회

### 호출 위치
- `src/views/schedule/Step4InitialData.vue` - `handleGenerate()` 함수
- `src/composables/useAISolver.ts` - `startSolver()` 함수에 전달

## 사용 흐름

1. **Step4 진입**: 사용자가 전월/당월 데이터 입력
2. **"근무표 생성" 버튼 클릭**: `handleGenerate()` 실행
3. **데이터 수집**: 
   - 조직 정보 조회
   - 시프트 정보 조회
   - 직원 정보 조회
   - 기존 배정 조회
   - 그리드 배정 변환
4. **Payload 구성**: 모든 데이터를 `PlanningPayload` 형식으로 조합
5. **AI Solver 호출**: `solver.startSolver()`에 Planning Payload 전달
6. **개발 모드**: JSON 파일 자동 다운로드 (`planning-payload-{월}.json`)

## 디버깅

### 콘솔 로그
```javascript
console.log('[Step4] Planning Payload:', JSON.stringify(planningPayload, null, 2));
```

### JSON 파일 다운로드
개발 환경(`import.meta.env.DEV`)에서 자동으로 JSON 파일이 다운로드됩니다.
- 파일명: `planning-payload-{YYYY-MM}.json`
- 위치: 브라우저 다운로드 폴더

### 검증 포인트
1. 조직 정보가 올바른지 확인
2. 시프트 개수가 예상과 일치하는지 확인 (보통 4개: D, E, N, O)
3. 직원 수가 올바른지 확인 (테스트 환경: 30명)
4. 배정 개수가 합리적인지 확인 (직원 수 × 날짜 수)
5. 요구사항의 날짜 범위가 당월만 포함하는지 확인

## 향후 작업

현재는 Planning Payload를 구성하여 로그로 출력하고 있습니다.
실제 Google Cloud Run API 연동 시:

```typescript
// src/composables/useAISolver.ts 내부
const response = await fetch(CLOUD_RUN_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(planningPayload),
});
```

## 예시 JSON

```json
{
  "organization": {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "서울대학교병원",
    "type": "hospital"
  },
  "shifts": [
    {
      "code": "D",
      "name": "Day",
      "start_time": "08:00:00",
      "end_time": "16:00:00"
    },
    {
      "code": "E",
      "name": "Evening",
      "start_time": "16:00:00",
      "end_time": "00:00:00"
    },
    {
      "code": "N",
      "name": "Night",
      "start_time": "00:00:00",
      "end_time": "08:00:00"
    },
    {
      "code": "O",
      "name": "Off",
      "start_time": "00:00:00",
      "end_time": "00:00:00"
    }
  ],
  "employees": [
    {
      "employee_id": "uuid-1",
      "name": "김철수",
      "available_shifts": ["D", "E", "N", "O"]
    }
  ],
  "assignments": [
    {
      "employee_id": "uuid-1",
      "shift_id": "shift-uuid-1",
      "date": "2025-12-01",
      "is_locked": false
    }
  ],
  "requirements": {
    "2025-12-01": {
      "D": 3,
      "E": 4,
      "N": 3,
      "O": 0,
      "total": 10
    }
  }
}
```

