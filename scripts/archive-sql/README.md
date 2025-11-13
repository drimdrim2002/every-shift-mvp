# Scripts SQL Archive

이 디렉토리는 개발 초기에 생성된 SQL 파일들을 보관합니다.

## 파일 설명

### 메뉴 시스템

- `create-menu-tables.sql` - 메뉴 테이블 생성
- `insert-menu-data.sql` - 메뉴 데이터 삽입

### Storage 시스템

- `create-storage-buckets.sql` - Storage 버킷 생성

### 사용자 관리

- `create-supabase-users.sql` - 사용자 생성 (복잡 버전)
- `create-supabase-users-simple.sql` - 사용자 생성 (간단 버전)

### 테이블 데이터

- `create-table-data-schema.sql` - 테이블 데이터 스키마
- `insert-table-data.sql` - 테이블 데이터 삽입

## 주의사항

이 파일들의 기능은 현재 `supabase/migrations/` 디렉토리의 통합 마이그레이션 파일들에 포함되어 있습니다. 새로운 개발에는 마이그레이션 파일들을 사용하세요.
