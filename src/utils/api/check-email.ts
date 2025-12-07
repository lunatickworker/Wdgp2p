import { supabase } from '../supabase/client';

export async function checkEmailAvailability(email: string): Promise<boolean> {
  try {
    // users 테이블에서 직접 이메일 확인
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();  // single() 대신 maybeSingle() 사용 (없어도 에러 안남)

    // 에러 발생 시
    if (error) {
      console.error('❌ DB 조회 오류:', error);
      throw error;
    }

    // data가 null이면 사용 가능, 있으면 중복
    const isAvailable = data === null;
    
    console.log('🔍 이메일 체크:', email, '→ 사용가능:', isAvailable, '→ DB결과:', data);
    
    return isAvailable;
  } catch (error: any) {
    console.error('❌ 이메일 체크 실패:', error);
    throw new Error('이메일 중복 확인 중 오류가 발생했습니다');
  }
}