# 🧪 Supabase 연동 테스트 및 검증 가이드

## 📋 테스트 결과 요약

### ✅ 성공한 항목

- **Supabase 연결**: 정상 작동 ✅
- **기존 테이블 존재**: `profiles`, `permissions`, `user_roles`, `role_permissions` ✅
- **Authentication 시스템**: 기본 구조 준비 완료 ✅

### ❌ 필요한 작업

- **메뉴 시스템 테이블**: `menus` 테이블 및 관련 구조 생성 필요
- **상품 데이터 테이블**: `products` 테이블 및 검색 함수 생성 필요
- **파일 스토리지**: Storage 버킷 및 `file_uploads` 테이블 생성 필요
- **Backend Mock 오류**: Nitro 초기화 오류 해결 필요

## 🛠️ 단계별 해결 방법

### 1단계: Supabase Dashboard에서 SQL 실행

다음 SQL 스크립트들을 순서대로 실행하세요:

#### A. 메뉴 시스템 생성

```bash
# Supabase Dashboard > SQL Editor에서 실행
cat scripts/create-menu-tables.sql
cat scripts/insert-menu-data.sql
```

#### B. 상품 데이터 시스템 생성

```bash
# Supabase Dashboard > SQL Editor에서 실행
cat scripts/create-table-data-schema.sql
cat scripts/insert-table-data.sql
```

#### C. 파일 스토리지 시스템 생성

```bash
# Supabase Dashboard > SQL Editor에서 실행
cat scripts/create-storage-buckets.sql
```

### 2단계: Backend Mock 문제 해결

현재 Nitro에서 초기화 오류가 발생하고 있습니다. 다음 방법으로 해결하세요:

#### 옵션 A: API 파일명 변경

```bash
# 문제가 있는 파일들의 export 방식 변경
cd apps/backend-mock/api
```

#### 옵션 B: 프로덕션 빌드 테스트

```bash
cd apps/backend-mock
pnpm build
pnpm preview
```

### 3단계: 환경 변수 설정 확인

#### 개발 환경 (.env.local)

```bash
# Mock 모드로 시작
VITE_USE_SUPABASE=false
VITE_SUPABASE_URL=https://kkxchntkzopfrpnvzzth.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Backend Mock
USE_SUPABASE=false
VITE_USE_SUPABASE=false
```

#### Supabase 모드 테스트

```bash
# Supabase 모드로 전환
VITE_USE_SUPABASE=true
USE_SUPABASE=true
```

### 4단계: 기능별 테스트 체크리스트

#### 🔐 인증 시스템 테스트

- [ ] Mock 모드에서 로그인/로그아웃
- [ ] Supabase 모드에서 로그인/로그아웃
- [ ] 사용자 권한 확인
- [ ] 토큰 새로고침

#### 📂 메뉴 시스템 테스트

- [ ] Mock 모드에서 메뉴 목록 조회
- [ ] Supabase 모드에서 메뉴 목록 조회
- [ ] 권한별 메뉴 필터링
- [ ] 메뉴 CRUD 기능

#### 📊 테이블 데이터 테스트

- [ ] Mock 모드에서 상품 목록 조회
- [ ] Supabase 모드에서 상품 목록 조회
- [ ] 검색 및 필터링
- [ ] 페이징 기능
- [ ] CRUD 기능

#### 📁 파일 업로드 테스트

- [ ] Mock 모드에서 파일 업로드
- [ ] Supabase 모드에서 파일 업로드
- [ ] 다중 버킷 업로드
- [ ] 파일 관리 (목록, 수정, 삭제)
- [ ] 파일 통계

#### 🎨 프론트엔드 연동 테스트

- [ ] Composables 정상 작동
- [ ] Vue 컴포넌트 렌더링
- [ ] 실시간 상태 업데이트
- [ ] 오류 처리

## 🚀 테스트 실행 명령어

### Backend Mock 서버 실행

```bash
cd apps/backend-mock
pnpm dev
```

### 프론트엔드 서버 실행

```bash
cd apps/web-antd
pnpm dev
```

### API 엔드포인트 테스트

```bash
# 상태 확인
curl http://localhost:5173/api/status

# 로그인 테스트 (Mock 모드)
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 메뉴 조회 테스트
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5173/api/menu/all

# 파일 업로드 테스트
curl -X POST http://localhost:5173/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.txt"
```

### Supabase 직접 테스트

```bash
# 테이블 존재 확인
curl -H "Authorization: Bearer ANON_KEY" \
  -H "apikey: ANON_KEY" \
  "https://your-project.supabase.co/rest/v1/menus?select=*&limit=1"

# Storage 버킷 확인
curl -H "Authorization: Bearer ANON_KEY" \
  "https://your-project.supabase.co/storage/v1/bucket"
```

## 📊 성능 벤치마크

### 응답 시간 목표

- **API 응답**: < 500ms
- **파일 업로드**: < 2초 (10MB 이하)
- **페이지 로딩**: < 1초
- **데이터 조회**: < 300ms

### 동시 접속 테스트

```bash
# Apache Bench로 부하 테스트
ab -n 100 -c 10 http://localhost:5173/api/menu/all
```

## 🐛 일반적인 문제 해결

### 1. "Cannot access before initialization" 오류

```bash
# Nitro 캐시 정리
cd apps/backend-mock
rm -rf .nitro
pnpm dev
```

### 2. Supabase 연결 실패

```bash
# 환경 변수 확인
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# 네트워크 연결 확인
curl -I https://kkxchntkzopfrpnvzzth.supabase.co
```

### 3. 권한 오류

```bash
# RLS 정책 확인
# Supabase Dashboard > Authentication > RLS
```

### 4. 파일 업로드 실패

```bash
# Storage 버킷 정책 확인
# Supabase Dashboard > Storage > Policies
```

## ✅ 테스트 완료 체크리스트

### 기본 기능

- [ ] Backend Mock 서버 정상 실행
- [ ] 프론트엔드 앱 정상 실행
- [ ] Supabase 연결 성공
- [ ] 모든 테이블 생성 완료
- [ ] Storage 버킷 생성 완료

### Mock 모드 테스트

- [ ] 인증 시스템 정상 작동
- [ ] 메뉴 시스템 정상 작동
- [ ] 테이블 데이터 정상 작동
- [ ] 파일 업로드 정상 작동

### Supabase 모드 테스트

- [ ] 인증 시스템 정상 작동
- [ ] 메뉴 시스템 정상 작동
- [ ] 테이블 데이터 정상 작동
- [ ] 파일 업로드 정상 작동

### 통합 테스트

- [ ] Mock ↔ Supabase 모드 전환 테스트
- [ ] 프론트엔드 Composables 테스트
- [ ] Vue 컴포넌트 테스트
- [ ] 오류 처리 테스트
- [ ] 성능 테스트

### 사용자 경험 테스트

- [ ] 데모 페이지 정상 작동
- [ ] UI/UX 반응성 확인
- [ ] 오류 메시지 적절성
- [ ] 로딩 상태 표시

## 🎯 다음 단계

테스트가 완료되면:

1. **코드 정리**: 불필요한 파일 및 의존성 제거
2. **문서화**: 사용자 가이드 및 API 문서 작성
3. **배포 준비**: 프로덕션 환경 설정
4. **모니터링**: 로그 및 성능 모니터링 설정

---

**🚨 중요**: 모든 SQL 스크립트를 Supabase Dashboard에서 실행한 후 테스트를 진행하세요!
