import { supabase } from '../supabase/client';

export interface UpdateDomainRequest {
  centerId: string;
  newDomain: string;
}

export interface UpdateDomainResponse {
  success: boolean;
  error?: string;
}

export async function updateCenterDomain(
  request: UpdateDomainRequest
): Promise<UpdateDomainResponse> {
  try {
    const { centerId, newDomain } = request;
    
    // 1. 새 도메인 중복 확인
    const { data: existingDomain } = await supabase
      .from('domain_mappings')
      .select('domain_id')
      .eq('domain', newDomain)
      .maybeSingle();
    
    if (existingDomain) {
      return {
        success: false,
        error: '이미 사용 중인 도메인입니다'
      };
    }
    
    // 2. 기존 도메인 조회
    const { data: oldMappings } = await supabase
      .from('domain_mappings')
      .select('*')
      .eq('center_id', centerId);
    
    if (!oldMappings || oldMappings.length === 0) {
      return {
        success: false,
        error: '센터를 찾을 수 없습니다'
      };
    }
    
    // 3. 기존 domain_mappings 삭제
    await supabase
      .from('domain_mappings')
      .delete()
      .eq('center_id', centerId);
    
    // 4. 새 domain_mappings 생성
    const newMappings = [
      {
        domain: newDomain,
        center_id: centerId,
        domain_type: 'main',
        is_active: true
      },
      {
        domain: `admin.${newDomain}`,
        center_id: centerId,
        domain_type: 'admin',
        is_active: true
      }
    ];
    
    const { error: insertError } = await supabase
      .from('domain_mappings')
      .insert(newMappings);
    
    if (insertError) {
      return {
        success: false,
        error: insertError.message
      };
    }
    
    // 5. users 테이블의 domain 업데이트
    await supabase
      .from('users')
      .update({ domain: newDomain })
      .eq('user_id', centerId);
    
    return {
      success: true
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '도메인 변경 실패'
    };
  }
}
