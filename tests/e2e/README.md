# E2E 테스트 가이드

EveryShift MVP의 End-to-End 통합 테스트 가이드입니다.

## 테스트 개요

Playwright를 사용하여 Step 1 → Step 2 → Step 3 → Step 4 전체 워크플로우를 자동으로 테스트합니다.

### 검증 사항

1. ✅ Step 1→2→3→4 전체 플로우가 에러 없이 완료
2. ✅ 각 Step에서 입력한 데이터가 다음 Step에 올바르게 전달
3. ✅ LocalStorage 복원 기능 정상 작동
4. ✅ AI Solver Polling 및 상태 전이 정상 작동
5. ✅ 최종 결과가 Supabase에 올바르게 저장

## 사전 준비

### 1. 테스트용 Supabase 계정 생성

테스트 실행을 위해 Supabase에 테스트용 계정을 생성해야 합니다.

```sql
-- Supabase SQL Editor에서 실행
-- 테스트용 사용자는 Supabase Auth를 통해 생성하거나,
-- 아래 명령으로 직접 생성 가능
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.test` 파일을 생성하고 테스트용 계정 정보를 입력합니다.

```bash
# .env.test
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
```

**.env.test 예시**:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Test User
TEST_USER_EMAIL=test@everyshift.com
TEST_USER_PASSWORD=TestPassword123!
```

### 3. Playwright 브라우저 설치

이미 `pnpm install` 실행 시 설치되었지만, 브라우저가 없다면 다음 명령을 실행합니다.

```bash
pnpm playwright install chromium
```

## 테스트 실행

### 기본 실행 (Headless)

```bash
pnpm test:e2e
```

### UI 모드 (브라우저에서 시각적 확인)

```bash
pnpm test:e2e:ui
```

### 디버그 모드 (단계별 실행)

```bash
pnpm test:e2e:debug
```

### 특정 테스트만 실행

```bash
pnpm playwright test schedule-workflow.spec.ts
```

### 테스트 리포트 확인

```bash
pnpm test:e2e:report
```

## 테스트 구조

### schedule-workflow.spec.ts

전체 워크플로우를 검증하는 메인 테스트 파일입니다.

**테스트 케이스**:

1. **Step 1 → Step 2 → Step 3 → Step 4 전체 플로우**
   - 로그인
   - Step 1: 월 선택 및 조직 정보 확인
   - Step 2: 요일별 필요 인력 설정
   - Step 3: 이전 달 마지막 5일 데이터 입력
   - AI Solver 폴링 및 대기
   - Step 4: 결과 확인 및 저장

2. **LocalStorage 복원 기능 테스트**
   - Step 3에서 데이터 입력
   - 페이지 새로고침
   - 데이터 복원 확인

3. **유효성 검증 테스트**
   - 이전 달 데이터 없이 생성 시도
   - 검증 에러 메시지 확인

## 주요 셀렉터

테스트에서 사용되는 주요 UI 셀렉터입니다.

```typescript
// Step 1
'text=근무표 생성 - 기본 정보 설정'
'.n-select' // 월 선택 드롭다운
'button:has-text("다음 단계")'

// Step 2
'text=근무표 생성 - 사이트 정보 설정'
'tr:has-text("월요일")' // 요일별 행
'input' // 인력 수 입력

// Step 3
'text=근무표 생성 - 초기 데이터 입력'
'table' // 그리드 테이블
'button:has-text("D")' // 시프트 선택 버튼

// Step 4
'text=근무표 생성 - 결과 확인'
'button:has-text("저장")'
'.n-message' // 성공 메시지
```

## 트러블슈팅

### 1. 브라우저가 실행되지 않음

```bash
# WSL 환경에서 시스템 의존성 설치
sudo apt-get install libnspr4 libnss3
```

### 2. 타임아웃 에러

AI Solver 폴링 시간이 길어질 수 있습니다. `playwright.config.ts`에서 타임아웃을 조정하세요.

```typescript
use: {
  actionTimeout: 30000, // 30초
}
```

### 3. Supabase 연결 실패

- `.env.test` 파일의 환경 변수가 올바른지 확인
- Supabase 프로젝트가 실행 중인지 확인
- 테스트용 계정이 존재하는지 확인

### 4. LocalStorage 복원 실패

브라우저 캐시가 문제일 수 있습니다. 테스트 전에 브라우저 컨텍스트를 초기화하세요.

```typescript
test.beforeEach(async ({ context }) => {
  await context.clearCookies()
})
```

## CI/CD 통합

### GitHub Actions 예시

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm playwright install chromium

      - name: Run E2E tests
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
        run: pnpm test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## 모범 사례

1. **테스트 데이터 격리**: 각 테스트가 독립적으로 실행되도록 테스트 데이터를 격리합니다.
2. **명확한 대기**: `waitForSelector`, `waitForURL` 등을 사용하여 명시적 대기를 구현합니다.
3. **재사용 가능한 헬퍼**: 공통 로직은 헬퍼 함수로 추출합니다.
4. **스크린샷 활용**: 실패 시 자동으로 스크린샷이 저장됩니다.
5. **셀렉터 관리**: 셀렉터를 상수로 관리하여 유지보수를 쉽게 합니다.

## 참고 자료

- [Playwright 공식 문서](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Naive UI 테스트 가이드](https://www.naiveui.com/en-US/os-theme/docs/testing)
