import { supabase } from '../supabase/client';

/**
 * 이메일 중복 확인 함수 (반환값 수정)
 * @returns { isAvailable: boolean } - 사용 가능 여부
 */
export async function checkEmailAvailability(email: string): Promise<{ isAvailable: boolean }> {
  try {
    const referralCode = email.split('@')[0];
    console.log('🔍 이메일 체크 시작:', email, '→ referral_code:', referralCode);
    
    // Supabase RPC 함수 호출 (서버 사이드)
    const { data, error } = await supabase
      .rpc('check_email_availability', { 
        email_to_check: email 
      });

    if (error) {
      console.error('❌ 이메일 체크 RPC 오류:', error);
      throw error;
    }

    console.log('✅ 이메일 체크 결과:', data ? '사용 가능' : '중복됨 (referral_code 또는 이메일)');
    return { isAvailable: data === true };
  } catch (error: any) {
    console.error('❌ 이메일 체크 실패:', error);
    throw new Error('이메일 중복 확인 중 오류가 발생했습니다');
  }
}