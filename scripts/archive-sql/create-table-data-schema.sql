-- 테이블 데이터용 스키마 생성 스크립트

-- 상품 테이블 생성
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),

  -- 가격 및 수량
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  quantity INTEGER DEFAULT 0,

  -- 상태 정보
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'error', 'warning')),
  available BOOLEAN DEFAULT true,
  in_production BOOLEAN DEFAULT true,
  open BOOLEAN DEFAULT true,

  -- 미디어
  image_url VARCHAR(500),
  image_url2 VARCHAR(500),

  -- 속성
  weight DECIMAL(8,2),
  color VARCHAR(50),
  rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
  tags JSONB DEFAULT '[]',
  release_date DATE,

  -- 시스템 필드
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
CREATE INDEX IF NOT EXISTS idx_products_release_date ON products(release_date);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- 전문 검색 인덱스 (제품명, 설명, 카테고리)
CREATE INDEX IF NOT EXISTS idx_products_search ON products
USING gin(to_tsvector('english', product_name || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, '')));

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 제품을 조회할 수 있음
CREATE POLICY "모든 사용자 제품 조회 가능" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

-- 관리자만 제품을 생성/수정/삭제할 수 있음
CREATE POLICY "관리자만 제품 관리 가능" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super', 'admin')
    )
  );

-- 업데이트 트리거 생성 (updated_at 자동 갱신)
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 제품 검색 함수
CREATE OR REPLACE FUNCTION search_products(
  search_term TEXT DEFAULT '',
  category_filter TEXT DEFAULT '',
  status_filter TEXT DEFAULT '',
  available_filter BOOLEAN DEFAULT NULL,
  min_price DECIMAL DEFAULT NULL,
  max_price DECIMAL DEFAULT NULL,
  min_rating DECIMAL DEFAULT NULL,
  sort_column TEXT DEFAULT 'created_at',
  sort_direction TEXT DEFAULT 'desc',
  page_size INTEGER DEFAULT 10,
  page_number INTEGER DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  product_name VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  price DECIMAL(10,2),
  currency VARCHAR(3),
  quantity INTEGER,
  status VARCHAR(20),
  available BOOLEAN,
  in_production BOOLEAN,
  open BOOLEAN,
  image_url VARCHAR(500),
  image_url2 VARCHAR(500),
  weight DECIMAL(8,2),
  color VARCHAR(50),
  rating DECIMAL(3,2),
  tags JSONB,
  release_date DATE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  offset_val INTEGER;
  where_clause TEXT := 'WHERE 1=1';
  order_clause TEXT;
  query_text TEXT;
BEGIN
  -- 페이징 계산
  offset_val := (page_number - 1) * page_size;

  -- 검색 조건 구성
  IF search_term != '' THEN
    where_clause := where_clause || ' AND (
      product_name ILIKE ''%' || search_term || '%'' OR
      description ILIKE ''%' || search_term || '%'' OR
      category ILIKE ''%' || search_term || '%''
    )';
  END IF;

  IF category_filter != '' THEN
    where_clause := where_clause || ' AND category = ''' || category_filter || '''';
  END IF;

  IF status_filter != '' THEN
    where_clause := where_clause || ' AND status = ''' || status_filter || '''';
  END IF;

  IF available_filter IS NOT NULL THEN
    where_clause := where_clause || ' AND available = ' || available_filter;
  END IF;

  IF min_price IS NOT NULL THEN
    where_clause := where_clause || ' AND price >= ' || min_price;
  END IF;

  IF max_price IS NOT NULL THEN
    where_clause := where_clause || ' AND price <= ' || max_price;
  END IF;

  IF min_rating IS NOT NULL THEN
    where_clause := where_clause || ' AND rating >= ' || min_rating;
  END IF;

  -- 정렬 조건
  order_clause := 'ORDER BY ' || sort_column || ' ' || UPPER(sort_direction);

  -- 쿼리 실행
  query_text := '
    SELECT p.*, COUNT(*) OVER() as total_count
    FROM products p ' ||
    where_clause || ' ' ||
    order_clause || '
    LIMIT ' || page_size || ' OFFSET ' || offset_val;

  RETURN QUERY EXECUTE query_text;
END;
$$;
