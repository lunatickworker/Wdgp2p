import { supabase } from '../supabase/client';

export interface TenantInfo {
  id: string;
  centerName: string;
  domain: string;
  logoUrl: string | null;
  templateId: string;
  designTheme: any;
}

export async function getTenantInfo(domain: string): Promise<TenantInfo | null> {
  try {
    // 1. Domain Mapping 조회
    const { data: mapping, error: mappingError } = await supabase
      .from('domain_mappings')
      .select('center_id')
      .eq('domain', domain)
      .eq('is_active', true)
      .maybeSingle();
    
    if (mappingError || !mapping) {
      return null;
    }
    
    // 2. 센터 정보 조회
    const { data: center, error: centerError } = await supabase
      .from('users')
      .select('user_id, center_name, domain, logo_url, template_id, design_theme')
      .eq('user_id', mapping.center_id)
      .eq('role', 'center')
      .maybeSingle();
    
    if (centerError || !center) {
      return null;
    }
    
    return {
      id: center.user_id,
      centerName: center.center_name,
      domain: center.domain,
      logoUrl: center.logo_url,
      templateId: center.template_id || 'modern',
      designTheme: center.design_theme
    };
    
  } catch (error) {
    console.error('Tenant 정보 조회 실패:', error);
    return null;
  }
}

// 도메인으로 센터 ID 조회 (간단한 버전)
export async function getCenterIdByDomain(domain: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('domain_mappings')
      .select('center_id')
      .eq('domain', domain)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error || !data) {
      return null;
    }
    
    return data.center_id;
  } catch (error) {
    return null;
  }
}
