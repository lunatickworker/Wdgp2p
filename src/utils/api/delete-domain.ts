import { supabase } from '../supabase/client';

// 센터 완전 삭제 (센터 계정 + 도메인 전부)
export async function deleteCenterDomain(centerId: string) {
  try {
    // 1. 연결된 가맹점/회원 확인
    const { count: storeCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', centerId)
      .eq('role', 'store');
    
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', centerId)
      .eq('role', 'user');
    
    if ((storeCount || 0) > 0 || (userCount || 0) > 0) {
      return {
        success: false,
        error: '연결된 가맹점 또는 회원이 있어 삭제할 수 없습니다'
      };
    }
    
    // 2. domain_mappings 삭제 (CASCADE로 자동 삭제됨)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', centerId);
    
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '도메인 삭제 실패'
    };
  }
}

// 특정 도메인만 삭제
export async function deleteDomainMapping(domainId: string) {
  try {
    if (!domainId) {
      return {
        success: false,
        error: '도메인 ID가 필요합니다'
      };
    }

    const { error } = await supabase
      .from('domain_mappings')
      .delete()
      .eq('domain_id', domainId);
    
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '도메인 삭제 실패'
    };
  }
}