-- 1원 인증 프로세스 개선: 코드 검증 필드 추가
-- 2025-01-XX

-- account_verifications 테이블에 컬럼 추가
ALTER TABLE account_verifications
ADD COLUMN IF NOT EXISTS verification_code_sent TEXT,
ADD COLUMN IF NOT EXISTS user_input_code TEXT,
ADD COLUMN IF NOT EXISTS code_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS code_sent_at TIMESTAMP WITH TIME ZONE;

-- status enum 타입 확장이 필요한 경우
-- 기존: 'pending', 'verified', 'rejected'
-- 추가: 'code_sent', 'code_submitted'

-- PostgreSQL enum 타입 확장 (기존 enum이 있는 경우)
-- ALTER TYPE account_verification_status ADD VALUE IF NOT EXISTS 'code_sent';
-- ALTER TYPE account_verification_status ADD VALUE IF NOT EXISTS 'code_submitted';

-- status 컬럼이 TEXT 타입인 경우 위 명령 불필요
-- CHECK 제약 조건 업데이트 (필요한 경우)

COMMENT ON COLUMN account_verifications.verification_code_sent IS '관리자가 사용자 계좌로 전송한 인증 코드 (영문+숫자 조합)';
COMMENT ON COLUMN account_verifications.user_input_code IS '사용자가 입력한 인증 코드';
COMMENT ON COLUMN account_verifications.code_verified IS '코드 일치 여부 (true: 일치, false: 불일치)';
COMMENT ON COLUMN account_verifications.code_sent_at IS '인증 코드 전송 시간';
