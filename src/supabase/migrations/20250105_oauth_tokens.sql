-- OAuth 토큰 저장 테이블
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE, -- 'account_verification' 등
  access_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_oauth_tokens_service ON oauth_tokens(service_name);
CREATE INDEX idx_oauth_tokens_expires ON oauth_tokens(expires_at);

-- RLS 비활성화 (서버 전용)
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Service role만 접근 가능
CREATE POLICY "Service role can manage oauth tokens"
  ON oauth_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_tokens_updated_at();
