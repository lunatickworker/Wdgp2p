import { supabase } from '../supabase/client';

export async function checkEmailAvailability(email: string): Promise<boolean> {
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
    return data === true;
  } catch (error: any) {
    console.error('❌ 이메일 체크 실패:', error);
    throw new Error('이메일 중복 확인 중 오류가 발생했습니다');
  }
}

// 디버그용 함수 (개발 중 상세 정보 확인용)
export async function checkEmailAvailabilityDebug(email: string): Promise<{
  available: boolean;
  referralCode: string;
  authEmailCount: number;
  publicEmailCount: number;
  publicReferralCount: number;
  reason: string;
}> {
  try {
    console.log('🔍 [디버그] 이메일 중복 체크:', email);
    
    const { data, error } = await supabase
      .rpc('check_email_availability_debug', { 
        email_to_check: email 
      });

    if (error) {
      console.error('❌ [디버그] RPC 오류:', error);
      throw error;
    }

    console.log('✅ [디버그] 체크 결과:', {
      '사용 가능': data.available,
      'referral_code': data.referral_code,
      'auth.users 이메일 카운트': data.auth_email_count,
      'public.users 이메일 카운트': data.public_email_count,
      'public.users referral_code 카운트': data.public_referral_count,
      '이유': data.reason
    });

    return {
      available: data.available,
      referralCode: data.referral_code,
      authEmailCount: data.auth_email_count,
      publicEmailCount: data.public_email_count,
      publicReferralCount: data.public_referral_count,
      reason: data.reason
    };
  } catch (error: any) {
    console.error('❌ [디버그] 체크 실패:', error);
    throw error;
  }
}