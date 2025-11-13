# 📁 파일 스토리지 시스템 Supabase 설정 가이드

## 📋 개요

Vue Vben Admin의 파일 업로드 시스템을 Supabase Storage로 마이그레이션하기 위한 설정 가이드입니다.

## 🗄️ 1단계: Supabase Storage 버킷 및 정책 생성

Supabase Dashboard의 SQL Editor에서 다음 스크립트를 실행하세요:

### Storage 버킷 및 RLS 정책 생성

```sql
-- scripts/create-storage-buckets.sql 파일의 내용 실행
```

## 🔧 2단계: 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Supabase 파일 스토리지 시스템 활성화
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
# 파일 업로드 (로그인 후)
curl -X POST -H "Authorization: Bearer your-token" \
     -F "file=@/path/to/your/file.jpg" \
     "http://localhost:5173/api/upload?bucket=user-uploads&category=images"

# 파일 목록 조회
curl -H "Authorization: Bearer your-token" \
     "http://localhost:5173/api/files/list?page=1&pageSize=10"

# 파일 통계 조회
curl -H "Authorization: Bearer your-token" \
     "http://localhost:5173/api/files/stats"

# 파일 삭제
curl -X DELETE -H "Authorization: Bearer your-token" \
     "http://localhost:5173/api/files/delete/file-id"
```

## 📊 구현된 파일 관리 API

| 엔드포인트 | 메서드 | 권한 | 설명 |
| --- | --- | --- | --- |
| `/api/upload` | POST | 모든 사용자 | 파일 업로드 (10MB 제한) |
| `/api/files/list` | GET | 모든 사용자 | 파일 목록 (페이징, 검색, 필터) |
| `/api/files/:id` | GET | 소유자/관리자 | 파일 상세 정보 |
| `/api/files/stats` | GET | 모든 사용자 | 파일 통계 |
| `/api/files/update/:id` | PUT | 소유자/관리자 | 파일 정보 수정 |
| `/api/files/delete/:id` | DELETE | 소유자/관리자 | 파일 삭제 |
| `/api/files/bulk-delete` | POST | 소유자/관리자 | 파일 일괄 삭제 (최대 50개) |

## 🗂️ Storage 버킷 구조

### 1. **user-uploads** (공개)

- **용도**: 일반 사용자 파일 업로드
- **접근**: 모든 사용자 읽기 가능, 소유자만 업로드/삭제
- **크기 제한**: 10MB
- **예시**: `user-uploads/general/1734567890-abc123.jpg`

### 2. **avatars** (공개)

- **용도**: 사용자 프로필 이미지
- **접근**: 모든 사용자 읽기 가능, 소유자만 관리
- **크기 제한**: 10MB
- **예시**: `avatars/user-123/avatar.png`

### 3. **product-images** (공개)

- **용도**: 상품 이미지
- **접근**: 모든 사용자 읽기 가능, 관리자만 업로드/삭제
- **크기 제한**: 10MB
- **예시**: `product-images/electronics/product-456.jpg`

### 4. **documents** (비공개)

- **용도**: 비공개 문서
- **접근**: 소유자만 접근 가능
- **크기 제한**: 10MB
- **예시**: `documents/confidential/report.pdf`

## 📄 지원하는 파일 형식

### 이미지 파일

- `image/jpeg` - JPEG 이미지
- `image/png` - PNG 이미지
- `image/gif` - GIF 이미지
- `image/webp` - WebP 이미지
- `image/svg+xml` - SVG 벡터 이미지

### 문서 파일

- `application/pdf` - PDF 문서
- `text/plain` - 텍스트 파일
- `text/csv` - CSV 파일
- `application/vnd.ms-excel` - Excel 파일 (구형)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` - Excel 파일 (신형)
- `application/msword` - Word 문서 (구형)
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - Word 문서 (신형)

## 🎯 파일 업로드 API 사용법

### 기본 업로드

```javascript
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/upload', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

### 옵션 포함 업로드

```javascript
const formData = new FormData();
formData.append('file', file);

const params = new URLSearchParams({
  bucket: 'product-images',
  category: 'electronics',
  public: 'true',
  alt_text: 'Product image',
  description: 'High quality product photo',
  tags: JSON.stringify(['product', 'electronics']),
});

const response = await fetch(`/api/upload?${params}`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

## 🔍 파일 검색 및 필터링

### 검색 매개변수

```typescript
{
  page: number; // 페이지 번호 (기본값: 1)
  pageSize: number; // 페이지 크기 (기본값: 10)
  bucket: string; // 버킷 필터
  search: string; // 파일명/설명 검색
  mimeType: string; // MIME 타입 필터 (예: 'image')
  isImage: boolean; // 이미지 파일만 필터
  isPublic: boolean; // 공개/비공개 필터
  sortBy: string; // 정렬 컬럼
  sortOrder: 'asc' | 'desc'; // 정렬 방향
}
```

### 예시 요청

```bash
# 이미지 파일만 조회
GET /api/files/list?isImage=true&pageSize=20

# 특정 버킷의 파일 검색
GET /api/files/list?bucket=product-images&search=phone

# 크기순 정렬
GET /api/files/list?sortBy=fileSize&sortOrder=desc
```

## 📊 파일 통계 정보

### 반환되는 통계

```typescript
{
  overview: {
    totalFiles: number; // 전체 파일 수
    totalSize: number; // 전체 파일 크기 (bytes)
    imageFiles: number; // 이미지 파일 수
    documentFiles: number; // 문서 파일 수
    publicFiles: number; // 공개 파일 수
    privateFiles: number; // 비공개 파일 수
    averageSize: number; // 평균 파일 크기
  }
  bucketStats: Array<{
    // 버킷별 통계
    bucket: string;
    fileCount: number;
    totalSize: number;
    imageCount: number;
    publicCount: number;
    privateCount: number;
  }>;
  mimeTypeStats: Array<{
    // MIME 타입별 통계
    type: string;
    count: number;
    size: number;
  }>;
  sizeDistribution: {
    // 크기별 분포
    small: number; // < 1MB
    medium: number; // 1MB - 10MB
    large: number; // > 10MB
  }
  recentFiles: Array<{
    // 최근 업로드 파일 (최대 5개)
    id: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    isImage: boolean;
  }>;
}
```

## 🛡️ 보안 및 권한

### RLS (Row Level Security) 정책

1. **소유자 권한**: 사용자는 자신이 업로드한 파일만 관리 가능
2. **관리자 권한**: super/admin 역할은 모든 파일 관리 가능
3. **버킷별 정책**: 각 버킷마다 다른 접근 권한 설정
4. **공개/비공개**: 파일별로 공개 여부 설정 가능

### 접근 제어 레벨

- **public**: 모든 사용자 접근 가능
- **private**: 소유자만 접근 가능
- **restricted**: 특별한 권한 필요

## ⚡ 일괄 작업

### 일괄 삭제

```javascript
const response = await fetch('/api/files/bulk-delete', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fileIds: ['file-id-1', 'file-id-2', 'file-id-3'],
  }),
});
```

### 제한사항

- 한 번에 최대 50개 파일 삭제 가능
- 소유자이거나 관리자 권한 필요
- 실패한 삭제는 개별적으로 보고

## 🔄 Dual Mode 지원

### Mock 모드 (기본값)

```bash
USE_SUPABASE=false
```

- 고정 URL 반환
- 실제 파일 저장 없음
- 개발 및 테스트용

### Supabase 모드

```bash
USE_SUPABASE=true
```

- 실제 Supabase Storage 사용
- 영구 파일 저장
- 프로덕션 환경

## 🎉 주요 기능 특징

1. **📁 다중 버킷 지원**: 용도별 파일 분리 저장
2. **🔍 고급 검색**: 파일명, 설명, 태그 기반 검색
3. **📊 실시간 통계**: 파일 사용량 및 분포 분석
4. **🛡️ 세밀한 권한 제어**: 버킷별, 파일별 접근 권한
5. **⚡ 일괄 작업**: 여러 파일 동시 처리
6. **📱 이미지 최적화**: 이미지 메타데이터 자동 추출
7. **🔐 보안 강화**: RLS 정책 + JWT 인증
8. **📈 성능 최적화**: 인덱스 + 페이징 + 캐싱

## 🚨 주의사항

1. **파일 크기 제한**: 10MB 이하 파일만 업로드 가능
2. **지원 형식**: 허용된 MIME 타입만 업로드 가능
3. **권한 확인**: 모든 작업에서 적절한 권한 검증
4. **Storage 할당량**: Supabase 프로젝트의 Storage 용량 확인
5. **네트워크 대역폭**: 대용량 파일 업로드 시 시간 고려

이제 완전한 파일 스토리지 관리 시스템이 Supabase Storage와 연동되어 사용할 준비가 완료되었습니다! 🎉
