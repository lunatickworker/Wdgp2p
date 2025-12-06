import { supabase } from '../supabase/client';
import { SUPABASE_CONFIG } from '../config';

export interface AddDomainRequest {
  centerId: string;
  domain: string;
}

export interface AddDomainResponse {
  success: boolean;
  error?: string;
}

/**
 * Vercel API를 통해 도메인을 프로젝트에 자동 추가
 * Edge Function을 통해 처리 (서버 사이드에서 VERCEL_TOKEN 사용)
 */
export async function addDomainToVercel(
  request: AddDomainRequest
): Promise<AddDomainResponse> {
  try {
    const { centerId, domain } = request;
    
    console.log('🌐 Vercel 도메인 추가 요청:', { centerId, domain });
    
    // Edge Function API 호출
    const response = await fetch(`${SUPABASE_CONFIG.backendUrl}/api/vercel/add-domain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      },
      body: JSON.stringify({ centerId, domain })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Vercel API 호출 실패:', result);
      return {
        success: false,
        error: result.error || 'Vercel 도메인 추가 실패'
      };
    }
    
    console.log('✅ Vercel 도메인 추가 성공:', result);
    
    return {
      success: true
    };
    
  } catch (error: any) {
    console.error('❌ Vercel 도메인 추가 오류:', error);
    return {
      success: false,
      error: error.message || '도메인 추가 실패'
    };
  }
}

/**
 * Vercel에서 도메인 제거
 */
export async function removeDomainFromVercel(domain: string): Promise<AddDomainResponse> {
  try {
    console.log('🗑️ Vercel 도메인 제거 요청:', domain);
    
    // Edge Function API 호출
    const response = await fetch(`${SUPABASE_CONFIG.backendUrl}/api/vercel/remove-domain`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      },
      body: JSON.stringify({ domain })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Vercel API 호출 실패:', result);
      return {
        success: false,
        error: result.error || 'Vercel 도메인 제거 실패'
      };
    }
    
    console.log('✅ Vercel 도메인 제거 성공:', result);
    
    return {
      success: true
    };
    
  } catch (error: any) {
    console.error('❌ Vercel 도메인 제거 오류:', error);
    return {
      success: false,
      error: error.message || '도메인 제거 실패'
    };
  }
}