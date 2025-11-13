# 📊 테이블 데이터 시스템 Supabase 설정 가이드

## 📋 개요

Vue Vben Admin의 테이블 데이터 시스템을 Supabase로 마이그레이션하기 위한 설정 가이드입니다.

## 🗄️ 1단계: 데이터베이스 테이블 생성

Supabase Dashboard의 SQL Editor에서 다음 스크립트를 실행하세요:

### 1. 상품 테이블 및 검색 시스템 생성

```sql
-- scripts/create-table-data-schema.sql 파일의 내용 실행
```

### 2. 기본 상품 데이터 삽입

```sql
-- scripts/insert-table-data.sql 파일의 내용 실행
```

## 🔧 2단계: 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Supabase 테이블 데이터 시스템 활성화
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
# 상품 목록 조회 (로그인 후)
curl -H "Authorization: Bearer your-token" \
     "http://localhost:5173/api/table/list?page=1&pageSize=10"

# 카테고리별 필터링
curl -H "Authorization: Bearer your-token" \
     "http://localhost:5173/api/table/list?category=Electronics"

# 검색
curl -H "Authorization: Bearer your-token" \
     "http://localhost:5173/api/table/list?search=phone"

# 상품 생성 (관리자 권한 필요)
curl -X POST -H "Authorization: Bearer your-token" \
     -H "Content-Type: application/json" \
     -d '{"productName":"Test Product","category":"Electronics","price":99.99}' \
     http://localhost:5173/api/table/create
```

## 📊 구현된 테이블 데이터 API

| 엔드포인트 | 메서드 | 권한 | 설명 |
| --- | --- | --- | --- |
| `/api/table/list` | GET | 모든 사용자 | 상품 목록 (페이징, 검색, 필터) |
| `/api/table/:id` | GET | 모든 사용자 | 상품 상세 정보 |
| `/api/table/categories` | GET | 모든 사용자 | 카테고리 목록 |
| `/api/table/create` | POST | admin+ | 상품 생성 |
| `/api/table/update/:id` | PUT | admin+ | 상품 수정 |
| `/api/table/delete/:id` | DELETE | super | 상품 삭제 |
| `/api/table/bulk-delete` | POST | super | 상품 일괄 삭제 |
| `/api/table/bulk-update-status` | POST | admin+ | 상태 일괄 변경 |

## 🎯 상품 데이터 구조

### 상품 아이템

```typescript
interface Product {
  id: string; // UUID
  productName: string; // 상품명
  description?: string; // 설명
  category: string; // 카테고리
  price: number; // 가격
  currency: string; // 통화 (USD, KRW 등)
  quantity: number; // 재고 수량
  status: 'success' | 'error' | 'warning'; // 상태
  available: boolean; // 판매 가능 여부
  inProduction: boolean; // 생산 중 여부
  open: boolean; // 공개 여부
  imageUrl?: string; // 이미지 URL
  imageUrl2?: string; // 두 번째 이미지 URL
  weight?: number; // 무게
  color?: string; // 색상
  rating?: number; // 평점 (0-5)
  tags: string[]; // 태그 배열
  releaseDate?: string; // 출시일
  createdAt: string; // 생성일
  updatedAt: string; // 수정일
}
```

## 🔍 검색 및 필터링 기능

### 1. **고급 검색**

```typescript
// 검색 매개변수
{
  search: string; // 상품명, 설명, 카테고리 검색
  category: string; // 카테고리 필터
  status: string; // 상태 필터
  available: boolean; // 판매가능 필터
  minPrice: number; // 최소 가격
  maxPrice: number; // 최대 가격
  minRating: number; // 최소 평점
  sortBy: string; // 정렬 필드
  sortOrder: 'asc' | 'desc'; // 정렬 방향
  page: number; // 페이지 번호
  pageSize: number; // 페이지 크기
}
```

### 2. **정렬 지원 컬럼**

- `productName` - 상품명
- `price` - 가격
- `rating` - 평점
- `category` - 카테고리
- `releaseDate` - 출시일
- `createdAt` - 생성일 (기본값)
- `quantity` - 재고 수량

### 3. **상태 관리**

- `success` - 정상 상품 (녹색)
- `warning` - 주의 필요 (노란색)
- `error` - 문제 발생 (빨간색)

## 📈 일괄 작업 기능

### 1. **일괄 삭제**

```typescript
POST / api / table / bulk -
  delete {
    productIds: ['uuid1', 'uuid2', 'uuid3'],
  };
```

### 2. **상태 일괄 변경**

```typescript
POST /api/table/bulk-update-status
{
  "productIds": ["uuid1", "uuid2"],
  "status": "warning"
}
```

## 🎖️ 권한 레벨별 접근

| 역할      | 목록 조회 | 상세 조회 | 생성 | 수정 | 삭제 | 일괄 작업 |
| --------- | --------- | --------- | ---- | ---- | ---- | --------- |
| **super** | ✅        | ✅        | ✅   | ✅   | ✅   | ✅        |
| **admin** | ✅        | ✅        | ✅   | ✅   | ❌   | 상태만    |
| **user**  | ✅        | ✅        | ❌   | ❌   | ❌   | ❌        |

## 🔄 Dual Mode 지원

시스템은 Mock 모드와 Supabase 모드를 모두 지원합니다:

### Mock 모드 (기본값)

```bash
USE_SUPABASE=false
```

- Faker.js로 동적 데이터 생성
- 매번 랜덤 데이터
- 개발 및 테스트용

### Supabase 모드

```bash
USE_SUPABASE=true
```

- 실제 데이터베이스
- 영구 데이터 저장
- 프로덕션 환경

## 🎉 주요 기능 특징

1. **🔍 강력한 검색**: 전문 검색 지원 (상품명, 설명, 카테고리)
2. **📊 고급 필터링**: 가격대, 평점, 카테고리, 상태별 필터
3. **📈 정렬 지원**: 모든 주요 컬럼 오름차순/내림차순 정렬
4. **📄 페이징**: 효율적인 대용량 데이터 처리
5. **🔧 일괄 작업**: 여러 상품 동시 처리
6. **🔐 권한 기반**: 역할별 차등 접근 제어
7. **📊 실시간 집계**: 카테고리별 상품 수 자동 계산
8. **🛡️ 데이터 검증**: 모든 입력 데이터 유효성 검사

## 🚨 주의사항

1. **가격 범위**: 음수 가격 입력 불가
2. **평점 범위**: 0~5 사이 값만 허용
3. **일괄 작업 제한**: 한 번에 최대 100개 항목
4. **권한 확인**: 모든 수정 작업에서 적절한 권한 검증
5. **데이터 무결성**: 필수 필드 검증 및 타입 체크

이제 완전한 테이블 데이터 관리 시스템이 Supabase와 연동되어 사용할 준비가 완료되었습니다! 🎉
