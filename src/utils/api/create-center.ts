import { supabase } from '../supabase/client';
import { uploadCenterLogo } from './upload-logo';
import { recordFeeRateChange } from './fee-rate-history';
import bcrypt from 'bcryptjs';

export interface CreateCenterRequest {
  centerName: string;
  domain?: string; // 선택사항
  email: string;
  password: string;
  parentAgencyId?: string; // 선택사항: 에이전시 ID (없으면 마스터 직속)
  templateId?: 'modern' | 'classic' | 'minimal' | 'gaming' | 'luxury';
  logoFile?: File;
  feeRate: number; // 수수료율 (%) - 필수
}

export interface CreateCenterResponse {
  success: boolean;
  centerId?: string;
  error?: string;
}

/**
 * 센터 생성 API
 * 주의: 실제 환경에서는 비밀번호 해싱을 Edge Function에서 처리해야 합니다.
 * 클라이언트에서 bcrypt를 사용할 수 없으므로, 임시로 평문 저장하거나
 * Edge Function으로 요청을 보내야 합니다.
 */
export async function createCenter(
  request: CreateCenterRequest
): Promise<CreateCenterResponse> {
  try {
    const { centerName, domain, email, password, parentAgencyId, templateId, logoFile, feeRate } = request;
    
    console.log('🔧 createCenter API 호출:', {
      centerName,
      domain: domain || '(없음)',
      email,
      parentAgencyId: parentAgencyId || '(마스터 직속)',
      templateId,
      feeRate,
      hasLogo: !!logoFile
    });

    // 1. 유효성 검사 (도메인은 선택사항)
    if (!centerName || !email || !password) {
      console.error('❌ 필수 필드 누락');
      return {
        success: false,
        error: '필수 필드를 모두 입력해주세요'
      };
    }
    
    // 도메인이 있을 경우에만 중복 확인
    if (domain) {
      console.log('🔍 도메인 중복 체크:', domain);
      const { data: existingDomain } = await supabase
        .from('domain_mappings')
        .select('domain_id')
        .eq('domain', domain)
        .maybeSingle();
      
      if (existingDomain) {
        console.error('❌ 도메인 중복');
        return {
          success: false,
          error: '이미 사용 중인 도메인입니다'
        };
      }
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
    
    // 2. Supabase Auth에 센터 계정 생성
    console.log('🔐 Auth 계정 생성 시작...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: undefined, // 이메일 확인 비활성화
        data: {
          role: 'center',
          center_name: centerName,
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

    const centerId = authData.user.id;
    console.log('✅ Auth 계정 생성 성공:', centerId);
    
    // 3. 비밀번호 해시 생성
    const passwordHash = await bcrypt.hash(password, 10);
    
    // 4. 로고 업로드 (있을 경우)
    let logoUrl = null;
    if (logoFile) {
      const { success, logoUrl: uploadedUrl, error: uploadError } = await uploadCenterLogo({
        centerId,
        file: logoFile
      });
      
      if (!success) {
        return {
          success: false,
          error: uploadError || '로고 업로드 실패'
        };
      }
      
      logoUrl = uploadedUrl;
    }
    
    // 5. Users 테이블에 센터 정보 저장
    
    console.log('💾 Users 테이블 삽입 시작...');
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        user_id: centerId, // Auth에서 생성된 ID 사용
        username: centerName, // username 필수 필드 추가
        role: 'center',
        tenant_id: centerId, // 센터는 자기 자신이 tenant_id
        parent_user_id: parentAgencyId || null, // 에이전시 ID 또는 null (마스터 직속)
        email,
        password_hash: passwordHash, // 해시된 비밀번호 저장
        referral_code: referralCode, // 이메일 @ 앞부분을 추천인 코드로
        center_name: centerName,
        domain: domain || null, // 도메인 없으면 null
        template_id: templateId || 'modern',
        logo_url: logoUrl,
        fee_rate: feeRate || 3.0, // 수수료율 (기본값 3%)
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
    
    // 6. Domain Mappings 자동 생성 (도메인이 있을 경우에만)
    if (domain) {
      console.log('🌐 Domain Mappings 생성 시작...');
      const domainMappings = [
        {
          domain: domain, // example.com
          center_id: centerId,
          domain_type: 'main', // 회원용
          is_active: true
        },
        {
          domain: `admin.${domain}`, // admin.example.com
          center_id: centerId,
          domain_type: 'admin', // 센터/가맹점 관리자용
          is_active: true
        }
      ];
      
      const { error: mappingError } = await supabase
        .from('domain_mappings')
        .insert(domainMappings);
      
      if (mappingError) {
        console.error('❌ Domain Mappings 생성 오류:', mappingError);
        // 롤백: 생성된 센터 삭제
        await supabase.from('users').delete().eq('user_id', centerId);
        
        return {
          success: false,
          error: mappingError.message
        };
      }
      
      console.log('✅ Domain Mappings 생성 성공');
    } else {
      console.log('⏭️ 도메인 없음 - Domain Mappings 생성 생략');
    }
    
    // 7. 수수료율 초기 이력 기록
    console.log('📊 수수료율 이력 기록 시작...');
    await recordFeeRateChange({
      centerId,
      oldRate: null,
      newRate: feeRate,
      changedBy: 'system'
    });
    
    console.log('✅ 센터 생성 완료!');
    
    // 8. 성공
    return {
      success: true,
      centerId
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '센터 생성 실패'
    };
  }
}