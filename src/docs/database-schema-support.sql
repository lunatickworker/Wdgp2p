-- ================================================
-- 고객센터 (실시간 문의) 테이블
-- ================================================

-- 고객 문의 메시지 테이블
CREATE TABLE IF NOT EXISTS support_messages (
  message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  admin_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_support_messages_user ON support_messages(user_id);
CREATE INDEX idx_support_messages_created ON support_messages(created_at DESC);
CREATE INDEX idx_support_messages_sender ON support_messages(sender_type);
CREATE INDEX idx_support_messages_unread ON support_messages(is_read) WHERE is_read = FALSE;

-- Row Level Security (RLS) 활성화
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 메시지만 조회 가능
CREATE POLICY "Users can view their own messages"
  ON support_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 메시지만 생성 가능
CREATE POLICY "Users can create their own messages"
  ON support_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND sender_type = 'user');

-- RLS 정책: 관리자는 모든 메시지 조회 가능
CREATE POLICY "Admins can view all messages"
  ON support_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS 정책: 관리자는 메시지 생성 가능
CREATE POLICY "Admins can create messages"
  ON support_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.role = 'admin'
    )
    AND sender_type = 'admin'
  );

-- RLS 정책: 관리자는 읽음 상태 업데이트 가능
CREATE POLICY "Admins can update read status"
  ON support_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS 정책: 사용자는 자신의 메시지 읽음 상태 업데이트 가능
CREATE POLICY "Users can update their message read status"
  ON support_messages
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Realtime 활성화 (실시간 구독)
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;

-- ================================================
-- 샘플 데이터 (테스트용)
-- ================================================

-- 사용자 메시지 예시
-- INSERT INTO support_messages (user_id, message, sender_type)
-- VALUES 
--   ('user-uuid-here', '출금이 되지 않습니다. 도움이 필요합니다.', 'user'),
--   ('user-uuid-here', '계좌 인증은 얼마나 걸리나요?', 'user');

-- 관리자 답변 예시
-- INSERT INTO support_messages (user_id, admin_id, message, sender_type)
-- VALUES 
--   ('user-uuid-here', 'admin-uuid-here', '출금 내역을 확인해보겠습니다. 잠시만 기다려주세요.', 'admin'),
--   ('user-uuid-here', 'admin-uuid-here', '계좌 인증은 1원 입금 후 약 1-2분 소요됩니다.', 'admin');

-- ================================================
-- 유용한 쿼리
-- ================================================

-- 1. 사용자별 최근 메시지 조회 (관리자용)
-- SELECT DISTINCT ON (user_id)
--   sm.user_id,
--   u.username,
--   u.email,
--   sm.message,
--   sm.created_at,
--   (SELECT COUNT(*) FROM support_messages WHERE user_id = sm.user_id AND sender_type = 'user' AND is_read = FALSE) as unread_count
-- FROM support_messages sm
-- JOIN users u ON sm.user_id = u.user_id
-- ORDER BY sm.user_id, sm.created_at DESC;

-- 2. 특정 사용자의 전체 대화 내역
-- SELECT 
--   sm.*,
--   u.username,
--   u.email
-- FROM support_messages sm
-- JOIN users u ON sm.user_id = u.user_id
-- WHERE sm.user_id = 'user-uuid-here'
-- ORDER BY sm.created_at ASC;

-- 3. 읽지 않은 사용자 문의 개수
-- SELECT COUNT(*)
-- FROM support_messages
-- WHERE sender_type = 'user' AND is_read = FALSE;

-- 4. 오늘 답변한 문의 개수
-- SELECT COUNT(*)
-- FROM support_messages
-- WHERE sender_type = 'admin'
-- AND created_at >= CURRENT_DATE;

-- ================================================
-- 트리거 (선택사항)
-- ================================================

-- 관리자 답변 시 사용자 메시지 자동 읽음 처리
CREATE OR REPLACE FUNCTION mark_user_messages_as_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_type = 'admin' THEN
    UPDATE support_messages
    SET is_read = TRUE
    WHERE user_id = NEW.user_id
    AND sender_type = 'user'
    AND is_read = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_admin_reply
  AFTER INSERT ON support_messages
  FOR EACH ROW
  WHEN (NEW.sender_type = 'admin')
  EXECUTE FUNCTION mark_user_messages_as_read();

-- ================================================
-- 정리 스크립트 (필요 시 사용)
-- ================================================

-- 테이블 삭제 (주의!)
-- DROP TABLE IF EXISTS support_messages CASCADE;

-- 트리거 삭제
-- DROP TRIGGER IF EXISTS after_admin_reply ON support_messages;
-- DROP FUNCTION IF EXISTS mark_user_messages_as_read();
