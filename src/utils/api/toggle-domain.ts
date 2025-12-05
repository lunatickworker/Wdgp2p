import { supabase } from '../supabase/client';

export async function toggleDomainStatus(centerId: string, isActive: boolean) {
  try {
    const { error } = await supabase
      .from('domain_mappings')
      .update({ is_active: isActive })
      .eq('center_id', centerId);
    
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
      error: error.message || '도메인 상태 변경 실패'
    };
  }
}
