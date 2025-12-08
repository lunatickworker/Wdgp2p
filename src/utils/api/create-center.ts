import { supabase } from '../supabase/client';
import { uploadCenterLogo } from './upload-logo';
import { recordFeeRateChange } from './fee-rate-history';

// UUID v4 생성 함수 (crypto API 사용)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
 * 주의: 관리자 계정은 Supabase Auth를 사용하지 않고 DB에 직접 저장합니다.
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
    
    // 2. UUID 생성 (Auth 사용 안함)
    const centerId = generateUUID();
    console.log('🆔 센터 UUID 생성:', centerId);
    
    // 3. 로고 업로드 (있을 경우)
    let logoUrl = null;
    if (logoFile) {
      const { success, logoUrl: uploadedUrl, error: uploadError } = await uploadCenterLogo({
        centerId: centerId,
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
    
    // 4. Edge Function 호출하여 센터 생성
    console.log('💾 Edge Function 호출하여 센터 생성...');
    const { data: createData, error: createError } = await supabase.functions.invoke('create-center', {
      body: {
        email,
        password,
        centerName,
        domain: domain || null,
        templateId: templateId || 'modern',
        logoUrl,
        parentAgencyId: parentAgencyId || null,
        feeRate: feeRate || 3.0
      }
    });
    
    if (createError || !createData?.success) {
      console.error('❌ 센터 생성 실패:', createError || createData);
      return {
        success: false,
        error: createData?.error || '센터 생성에 실패했습니다'
      };
    }
    
    // Edge Function에서 생성된 centerId 사용
    const finalCenterId = createData.centerId;
    console.log('✅ 센터 생성 성공:', finalCenterId);
    
    // 5. Domain Mappings 자동 생성 (도메인이 있을 경우에만)
    if (domain) {
      console.log('🌐 Domain Mappings 생성 시작...');
      const domainMappings = [
        {
          domain: domain, // example.com
          center_id: finalCenterId,
          domain_type: 'main', // 회원용
          is_active: true
        },
        {
          domain: `admin.${domain}`, // admin.example.com
          center_id: finalCenterId,
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
        await supabase.from('users').delete().eq('user_id', finalCenterId);
        
        return {
          success: false,
          error: mappingError.message
        };
      }
      
      console.log('✅ Domain Mappings 생성 성공');
    } else {
      console.log('⏭️ 도메인 없음 - Domain Mappings 생성 생략');
    }
    
    // 6. 수수료율 초기 이력 기록
    console.log('📊 수수료율 이력 기록 시작...');
    await recordFeeRateChange({
      centerId: finalCenterId,
      oldRate: null,
      newRate: feeRate,
      changedBy: 'system'
    });
    
    console.log('✅ 센터 생성 완료!');
    
    // 7. 성공
    return {
      success: true,
      centerId: finalCenterId
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '센터 생성 실패'
    };
  }
}