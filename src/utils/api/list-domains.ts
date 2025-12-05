import { supabase } from '../supabase/client';

export async function listAllDomains() {
  try {
    const { data, error } = await supabase
      .from('domain_mappings')
      .select(`
        *,
        center:users!center_id(
          user_id,
          center_name,
          template_id,
          logo_url,
          created_at
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
    
    // 플랫한 배열로 반환 (그룹화하지 않음)
    return {
      success: true,
      data: data || []
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '도메인 목록 조회 실패',
      data: []
    };
  }
}

// 특정 센터의 도메인 조회
export async function getDomainsByCenter(centerId: string) {
  try {
    const { data, error } = await supabase
      .from('domain_mappings')
      .select('*')
      .eq('center_id', centerId)
      .order('domain_type');
    
    if (error) {
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
    
    return {
      success: true,
      data: data || []
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '도메인 조회 실패',
      data: []
    };
  }
}