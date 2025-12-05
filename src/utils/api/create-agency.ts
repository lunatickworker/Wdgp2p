import { supabase } from '../supabase/client';
import { recordFeeRateChange } from './fee-rate-history';

export interface CreateAgencyRequest {
  agencyName: string;
  email: string;
  password: string;
  feeRate: number; // 수수료율 (%) - 필수
}

export interface CreateAgencyResponse {
  success: boolean;
  agencyId?: string;
  error?: string;
}

/**
 * 에이전시 생성 API
 * 마스터 > 에이전시 > 센터 계층 구조에서 에이전시를 생성합니다
 */
export async function createAgency(
  request: CreateAgencyRequest
): Promise<CreateAgencyResponse> {
  try {
    const { agencyName, email, password, feeRate } = request;
    
    console.log('🔧 createAgency API 호출:', {
      agencyName,
      email,
      feeRate
    });

    // 1. 유효성 검사
    if (!agencyName || !email || !password || feeRate === undefined) {
      console.error('❌ 필수 필드 누락');
      return {
        success: false,
        error: '필수 필드를 모두 입력해주세요'
      };
    }
    
    // 수수료율 범위 검증 (0~100%)
    if (feeRate < 0 || feeRate > 100) {
      console.error('❌ 수수료율 범위 오류');
      return {
        success: false,
        error: '수수료율은 0~100% 사이여야 합니다'
      };
    }
    
    // email 중복 확인
    console.log('🔍 이메일 중복 체크:', email);
    const { data: existingEmail } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();
    
    if (existingEmail) {
      console.error('❌ 이메일 중복');
      return {
        success: false,
        error: '이미 사용 중인 이메일입니다'
      };
    }
    
    // referral_code 중복 확인 (이메일 @ 앞부분)
    const referralCode = email.split('@')[0].toLowerCase();
    console.log('🔍 추천인 코드 중복 체크:', referralCode);
    const { data: existingReferralCode } = await supabase
      .from('users')
      .select('user_id')
      .eq('referral_code', referralCode)
      .maybeSingle();
    
    if (existingReferralCode) {
      console.error('❌ 추천인 코드 중복');
      return {
        success: false,
        error: '이미 사용 중인 추천인 코드입니다 (이메일 @ 앞부분)'
      };
    }
    
    // 2. Supabase Auth에 에이전시 계정 생성
    console.log('🔐 Auth 계정 생성 시작...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: undefined, // 이메일 확인 비활성화
        data: {
          role: 'agency',
          agency_name: agencyName,
        }
      }
    });

    if (authError) {
      console.error('❌ Auth 오류:', authError);
      return {
        success: false,
        error: authError.message
      };
    }

    if (!authData.user) {
      console.error('❌ Auth 사용자 생성 실패');
      return {
        success: false,
        error: '사용자 생성에 실패했습니다'
      };
    }

    const agencyId = authData.user.id;
    console.log('✅ Auth 계정 생성 성공:', agencyId);
    
    // 3. Users 테이블에 에이전시 정보 저장
    console.log('💾 Users 테이블 삽입 시작...');
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        user_id: agencyId, // Auth에서 생성된 ID 사용
        username: agencyName, // username 필수 필드
        role: 'agency',
        tenant_id: agencyId, // 에이전시는 자기 자신이 tenant_id
        parent_user_id: null, // 마스터 직속 (parent 없음)
        email,
        password_hash: password, // 비밀번호 저장
        referral_code: referralCode, // 이메일 @ 앞부분을 추천인 코드로
        agency_name: agencyName,
        fee_rate: feeRate, // 수수료율
        is_active: true,
        kyc_status: 'pending',
        balance: {},
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('❌ Users 테이블 삽입 오류:', insertError);
      return {
        success: false,
        error: insertError.message
      };
    }
    
    console.log('✅ Users 테이블 삽입 성공');
    
    // 4. 수수료율 초기 이력 기록
    console.log('📊 수수료율 이력 기록 시작...');
    await recordFeeRateChange({
      centerId: agencyId, // agency도 fee_rate_history에 기록
      oldRate: null,
      newRate: feeRate,
      changedBy: 'system'
    });
    
    console.log('✅ 에이전시 생성 완료!');
    
    // 5. 성공
    return {
      success: true,
      agencyId
    };
    
  } catch (error: any) {
    console.error('❌ 에이전시 생성 오류:', error);
    return {
      success: false,
      error: error.message || '에이전시 생성 실패'
    };
  }
}
