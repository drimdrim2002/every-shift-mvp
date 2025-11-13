-- Supabase Storage 버킷 생성 및 설정 스크립트

-- 1. 사용자 업로드 버킷 생성 (일반 파일)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-uploads', 'user-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 아바타 이미지 버킷 생성 (프로필 사진)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. 상품 이미지 버킷 생성 (상품 사진)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. 문서 파일 버킷 생성 (비공개 문서)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS 정책 설정

-- user-uploads 버킷 정책
-- 1. 모든 인증된 사용자가 자신의 파일을 업로드할 수 있음
CREATE POLICY "사용자 파일 업로드 허용" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-uploads' AND
    auth.role() = 'authenticated' AND
    owner = auth.uid()
  );

-- 2. 모든 사용자가 공개 파일을 읽을 수 있음
CREATE POLICY "공개 파일 읽기 허용" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-uploads');

-- 3. 사용자가 자신의 파일을 삭제할 수 있음
CREATE POLICY "사용자 파일 삭제 허용" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-uploads' AND
    auth.uid() = owner
  );

-- 4. 사용자가 자신의 파일을 업데이트할 수 있음
CREATE POLICY "사용자 파일 업데이트 허용" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-uploads' AND
    auth.uid() = owner
  );

-- avatars 버킷 정책
-- 1. 모든 인증된 사용자가 자신의 아바타를 업로드할 수 있음
CREATE POLICY "아바타 업로드 허용" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    owner = auth.uid()
  );

-- 2. 모든 사용자가 아바타를 읽을 수 있음
CREATE POLICY "아바타 읽기 허용" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 3. 사용자가 자신의 아바타를 삭제할 수 있음
CREATE POLICY "아바타 삭제 허용" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid() = owner
  );

-- product-images 버킷 정책
-- 1. 관리자만 상품 이미지를 업로드할 수 있음
CREATE POLICY "상품 이미지 업로드 허용" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super', 'admin')
    )
  );

-- 2. 모든 사용자가 상품 이미지를 읽을 수 있음
CREATE POLICY "상품 이미지 읽기 허용" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

-- 3. 관리자만 상품 이미지를 삭제할 수 있음
CREATE POLICY "상품 이미지 삭제 허용" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super', 'admin')
    )
  );

-- documents 버킷 정책 (비공개)
-- 1. 모든 인증된 사용자가 자신의 문서를 업로드할 수 있음
CREATE POLICY "문서 업로드 허용" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    owner = auth.uid()
  );

-- 2. 사용자가 자신의 문서만 읽을 수 있음
CREATE POLICY "문서 읽기 허용" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.uid() = owner
  );

-- 3. 사용자가 자신의 문서를 삭제할 수 있음
CREATE POLICY "문서 삭제 허용" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.uid() = owner
  );

-- 파일 업로드 기록 테이블 생성
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 파일 정보
  original_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,

  -- 버킷 정보
  bucket_name VARCHAR(100) NOT NULL,

  -- 메타데이터
  alt_text VARCHAR(255),
  description TEXT,
  tags JSONB DEFAULT '[]',

  -- 이미지 정보 (이미지인 경우)
  width INTEGER,
  height INTEGER,
  is_image BOOLEAN DEFAULT false,

  -- 업로드 정보
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 접근 제어
  is_public BOOLEAN DEFAULT true,
  access_level VARCHAR(20) DEFAULT 'public' CHECK (access_level IN ('public', 'private', 'restricted')),

  -- 시스템 필드
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_uploads_bucket_name ON file_uploads(bucket_name);
CREATE INDEX IF NOT EXISTS idx_file_uploads_mime_type ON file_uploads(mime_type);
CREATE INDEX IF NOT EXISTS idx_file_uploads_is_image ON file_uploads(is_image);
CREATE INDEX IF NOT EXISTS idx_file_uploads_access_level ON file_uploads(access_level);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at);

-- 파일 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_file_uploads_search ON file_uploads
USING gin(to_tsvector('english', original_name || ' ' || COALESCE(description, '') || ' ' || COALESCE(alt_text, '')));

-- RLS 정책 활성화
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- 사용자가 자신의 파일 기록을 조회할 수 있음
CREATE POLICY "사용자 파일 기록 조회" ON file_uploads
  FOR SELECT USING (uploaded_by = auth.uid());

-- 사용자가 파일 기록을 생성할 수 있음
CREATE POLICY "파일 기록 생성" ON file_uploads
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- 사용자가 자신의 파일 기록을 업데이트할 수 있음
CREATE POLICY "파일 기록 업데이트" ON file_uploads
  FOR UPDATE USING (uploaded_by = auth.uid());

-- 사용자가 자신의 파일 기록을 삭제할 수 있음
CREATE POLICY "파일 기록 삭제" ON file_uploads
  FOR DELETE USING (uploaded_by = auth.uid());

-- 관리자는 모든 파일을 관리할 수 있음
CREATE POLICY "관리자 파일 관리" ON file_uploads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super', 'admin')
    )
  );

-- 파일 통계 뷰 생성
CREATE OR REPLACE VIEW file_upload_stats AS
SELECT
  bucket_name,
  COUNT(*) as file_count,
  SUM(file_size) as total_size,
  AVG(file_size) as avg_size,
  COUNT(CASE WHEN is_image THEN 1 END) as image_count,
  COUNT(CASE WHEN is_public THEN 1 END) as public_count,
  COUNT(CASE WHEN access_level = 'private' THEN 1 END) as private_count
FROM file_uploads
GROUP BY bucket_name;
