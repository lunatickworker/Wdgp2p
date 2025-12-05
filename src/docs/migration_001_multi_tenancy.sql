-- ================================================
-- Multi-Tenancy 시스템 마이그레이션
-- ================================================
-- 작성일: 2025-11-29
-- 목적: implementation_checklist.md Phase 1의 모든 SQL을 한 번에 실행
-- 참조: implementation_checklist.md, logic_for_multiTenancy1.md
-- 특징: 에러 없이 여러 번 실행 가능 (멱등성 보장)
-- 개선: 모든 인덱스 생성 전 컬럼 존재 확인 및 자동 생성

-- ================================================
-- 1.1 Users 테이블 수정
-- ================================================

-- 센터 로고 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE users ADD COLUMN logo_url TEXT NULL;
    RAISE NOTICE '✅ users.logo_url 컬럼 생성 완료';
  ELSE
    RAISE NOTICE '⏭️ users.logo_url 컬럼 이미 존재';
  END IF;
END $$;

-- 템플릿 컬럼 추가 (CHECK 제약조건 포함)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE users ADD COLUMN template_id TEXT NULL 
    CHECK (template_id IN ('modern', 'classic', 'minimal', 'gaming', 'luxury'));
    RAISE NOTICE '✅ users.template_id 컬럼 생성 완료';
  ELSE
    RAISE NOTICE '⏭️ users.template_id 컬럼 이미 존재';
  END IF;
END $$;

-- design_theme JSONB 컬럼 추가 (레이아웃 커스터마이징)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'design_theme'
  ) THEN
    ALTER TABLE users ADD COLUMN design_theme JSONB NULL;
    RAISE NOTICE '✅ users.design_theme 컬럼 생성 완료';
  ELSE
    RAISE NOTICE '⏭️ users.design_theme 컬럼 이미 존재';
  END IF;
END $$;

-- 컬럼 설명 추가 (안전하게 처리)
DO $$
BEGIN
  EXECUTE 'COMMENT ON COLUMN users.logo_url IS ''센터 로고 URL (Storage public-assets에 저장)''';
  EXECUTE 'COMMENT ON COLUMN users.template_id IS ''선택된 템플릿 ID (modern, classic, minimal, gaming, luxury)''';
  EXECUTE 'COMMENT ON COLUMN users.design_theme IS ''커스텀 디자인 테마 (colors, fonts, layout 설정)''';
EXCEPTION WHEN OTHERS THEN
  -- 컬럼이 없으면 무시
  NULL;
END $$;

-- ================================================
-- 1.2 Domain Mappings 테이블 생성
-- ================================================

-- 도메인 매핑 테이블
CREATE TABLE IF NOT EXISTS domain_mappings (
  domain_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  center_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_type TEXT NOT NULL CHECK (domain_type IN ('main', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 테이블 설명
DO $$
BEGIN
  EXECUTE 'COMMENT ON TABLE domain_mappings IS ''센터별 도메인 매핑 테이블''';
  EXECUTE 'COMMENT ON COLUMN domain_mappings.domain IS ''실제 도메인 (예: example.com, admin.example.com)''';
  EXECUTE 'COMMENT ON COLUMN domain_mappings.center_id IS ''센터 ID (users 테이블 참조)''';
  EXECUTE 'COMMENT ON COLUMN domain_mappings.domain_type IS ''도메인 타입 (main: 회원용, admin: 관리자용)''';
  EXECUTE 'COMMENT ON COLUMN domain_mappings.is_active IS ''활성화 상태 (false면 접속 차단)''';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- domain_mappings 인덱스 생성 (컬럼은 테이블 생성 시 자동으로 존재)
CREATE INDEX IF NOT EXISTS idx_domain_mappings_domain ON domain_mappings(domain);
CREATE INDEX IF NOT EXISTS idx_domain_mappings_center_id ON domain_mappings(center_id);
CREATE INDEX IF NOT EXISTS idx_domain_mappings_is_active ON domain_mappings(is_active);

DO $$
BEGIN
  RAISE NOTICE '✅ domain_mappings 인덱스 생성 완료';
END $$;

-- ================================================
-- 1.3 필수 컬럼 확인 및 생성 (인덱스 생성 전)
-- ================================================

-- users.tenant_id 컬럼 확인 및 생성
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE users ADD COLUMN tenant_id UUID NULL;
    RAISE NOTICE '✅ users.tenant_id 컬럼 생성 완료';
  ELSE
    RAISE NOTICE '⏭️ users.tenant_id 컬럼 이미 존재';
  END IF;
END $$;

-- users.role 컬럼 확인 (이미 있어야 하지만 확인)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role TEXT NULL 
    CHECK (role IN ('master', 'agency', 'center', 'store', 'user'));
    RAISE NOTICE '✅ users.role 컬럼 생성 완료';
  ELSE
    RAISE NOTICE '⏭️ users.role 컬럼 이미 존재';
  END IF;
END $$;

-- wallets.tenant_id 컬럼 확인 및 생성
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE wallets ADD COLUMN tenant_id UUID NULL;
    RAISE NOTICE '✅ wallets.tenant_id 컬럼 생성 완료';
  ELSE
    RAISE NOTICE '⏭️ wallets.tenant_id 컬럼 이미 존재';
  END IF;
END $$;

-- transactions.tenant_id 컬럼 확인 및 생성
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN tenant_id UUID NULL;
    RAISE NOTICE '✅ transactions.tenant_id 컬럼 생성 완료';
  ELSE
    RAISE NOTICE '⏭️ transactions.tenant_id 컬럼 이미 존재';
  END IF;
END $$;

-- ================================================
-- 1.4 Tenant_id 인덱스 생성 (컬럼 확인 후)
-- ================================================

-- 이제 모든 컬럼이 존재하므로 안전하게 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wallets_tenant_id ON wallets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON transactions(tenant_id);

-- role별 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);

DO $$
BEGIN
  RAISE NOTICE '✅ Multi-Tenancy 인덱스 생성 완료';
END $$;

-- 인덱스 설명 (인덱스가 존재할 때만)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_tenant_id'
  ) THEN
    EXECUTE 'COMMENT ON INDEX idx_users_tenant_id IS ''Multi-Tenancy 데이터 격리를 위한 인덱스''';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_role'
  ) THEN
    EXECUTE 'COMMENT ON INDEX idx_users_role IS ''역할 기반 필터링 성능 향상''';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ================================================
-- 1.6 Storage Policy - Public Access (읽기)
-- ================================================

-- 기존 Policy 삭제 후 재생성 (멱등성 보장)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;
  
  CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-assets');
  
  RAISE NOTICE '✅ Storage Policy "Public Access" 생성 완료';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Storage Policy 생성 실패 - storage.objects 테이블 확인 필요';
END $$;

-- ================================================
-- 1.7 Storage Policy - Authenticated Upload (업로드)
-- ================================================

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
  
  CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'public-assets' 
    AND auth.role() = 'authenticated'
  );
  
  RAISE NOTICE '✅ Storage Policy "Authenticated users can upload" 생성 완료';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Storage Policy 생성 실패 - storage.objects 테이블 확인 필요';
END $$;

-- ================================================
-- 1.8 Storage Policy - Owner Delete (삭제)
-- ================================================

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can delete own center logos" ON storage.objects;
  
  CREATE POLICY "Users can delete own center logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'public-assets'
    AND (storage.foldername(name))[1] = 'center-logos'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );
  
  RAISE NOTICE '✅ Storage Policy "Users can delete own center logos" 생성 완료';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Storage Policy 생성 실패 - storage.objects 테이블 확인 필요';
END $$;