# 🍽️ 메뉴 시스템 Supabase 설정 가이드

## 📋 개요

Vue Vben Admin의 메뉴 시스템을 Supabase로 마이그레이션하기 위한 설정 가이드입니다.

## 🗄️ 1단계: 데이터베이스 테이블 생성

Supabase Dashboard의 SQL Editor에서 다음 스크립트를 실행하세요:

### 1. 메뉴 테이블 및 권한 시스템 생성

```sql
-- scripts/create-menu-tables.sql 파일의 내용 실행
```

### 2. 기본 메뉴 데이터 삽입

```sql
-- scripts/insert-menu-data.sql 파일의 내용 실행
```

## 🔧 2단계: 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Supabase 메뉴 시스템 활성화
USE_SUPABASE=true
VITE_USE_SUPABASE=true

# Supabase 연결 정보
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 🚀 3단계: 테스트

### 서버 시작

```bash
pnpm dev:antd
```

### API 테스트

```bash
# 메뉴 목록 조회 (로그인 후)
curl -H "Authorization: Bearer your-token" \
     http://localhost:5173/api/menu/all

# 메뉴 관리 목록 조회
curl -H "Authorization: Bearer your-token" \
     http://localhost:5173/api/menu/list?page=1&pageSize=10
```

## 📊 구현된 메뉴 API

| 엔드포인트                    | 메서드 | 권한        | 설명               |
| ----------------------------- | ------ | ----------- | ------------------ |
| `/api/menu/all`               | GET    | 모든 사용자 | 사용자별 메뉴 트리 |
| `/api/menu/list`              | GET    | admin+      | 관리용 메뉴 목록   |
| `/api/menu/:id`               | GET    | admin+      | 메뉴 상세 정보     |
| `/api/menu/create`            | POST   | super       | 메뉴 생성          |
| `/api/menu/update/:id`        | PUT    | admin+      | 메뉴 수정          |
| `/api/menu/delete/:id`        | DELETE | super       | 메뉴 삭제          |
| `/api/menu/reorder`           | POST   | admin+      | 메뉴 순서 변경     |
| `/api/menu/toggle-status/:id` | PATCH  | admin+      | 활성화/비활성화    |

## 🎯 메뉴 데이터 구조

### 메뉴 아이템

```typescript
interface MenuItem {
  id: number; // 메뉴 ID
  pid?: number; // 부모 메뉴 ID
  name: string; // 메뉴 이름
  path?: string; // 라우팅 경로
  component?: string; // 컴포넌트 경로
  type: 'menu' | 'catalog' | 'button' | 'embedded' | 'link';
  status: 0 | 1; // 활성 상태
  authCode?: string; // 권한 코드
  sortOrder: number; // 정렬 순서
  meta: {
    // 메타 정보
    icon?: string;
    title?: string;
    order?: number;
    badge?: string;
    // ... 기타 메타 데이터
  };
}
```

### 권한 구조

- **super**: 모든 메뉴 관리 권한
- **admin**: 제한적 메뉴 관리 권한 (생성/삭제 제외)
- **user**: 메뉴 조회만 가능

## 🔄 Dual Mode 지원

시스템은 Mock 모드와 Supabase 모드를 모두 지원합니다:

### Mock 모드 (기본값)

```bash
USE_SUPABASE=false
```

- 메모리 기반 데이터
- 서버 재시작 시 초기화
- 개발 및 테스트용

### Supabase 모드

```bash
USE_SUPABASE=true
```

- 실제 데이터베이스
- 영구 데이터 저장
- 프로덕션 환경

## 🎉 기능 특징

1. **계층형 메뉴**: 무제한 깊이의 메뉴 트리 지원
2. **권한 기반 접근**: 역할별 메뉴 필터링
3. **동적 메뉴**: 실시간 메뉴 수정 반영
4. **메뉴 관리**: 완전한 CRUD 기능
5. **순서 관리**: 드래그앤드롭 순서 변경 지원
6. **상태 관리**: 메뉴 활성화/비활성화
7. **검색 및 필터**: 메뉴 관리에서 효율적 검색

## 🚨 주의사항

1. **시스템 메뉴**: Workspace, System 메뉴는 삭제/비활성화 불가
2. **권한 체크**: 모든 API에서 적절한 권한 확인
3. **하위 메뉴**: 하위 메뉴가 있는 경우 부모 메뉴 삭제 불가
4. **ID 중복**: 메뉴 ID는 고유해야 함
5. **순환 참조**: 부모-자식 관계에서 순환 참조 방지

이제 완전한 메뉴 관리 시스템이 Supabase와 연동되어 사용할 준비가 완료되었습니다! 🎉
