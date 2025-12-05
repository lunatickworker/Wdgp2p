import { supabase } from '../supabase/client';

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
 * 주의: Vite 환경에서는 import.meta.env를 사용해야 합니다
 */
export async function addDomainToVercel(
  request: AddDomainRequest
): Promise<AddDomainResponse> {
  try {
    const { centerId, domain } = request;
    
    // 1. 센터 존재 확인
    const { data: center, error: centerError } = await supabase
      .from('users')
      .select('user_id, center_name')
      .eq('user_id', centerId)
      .eq('role', 'center')
      .maybeSingle();
    
    if (centerError || !center) {
      return {
        success: false,
        error: '센터를 찾을 수 없습니다'
      };
    }
    
    // 2. Vercel API 호출 준비
    const vercelToken = import.meta.env.VITE_VERCEL_TOKEN;
    const projectId = import.meta.env.VITE_VERCEL_PROJECT_ID;
    
    if (!vercelToken || !projectId) {
      return {
        success: false,
        error: 'Vercel API 토큰 또는 프로젝트 ID가 설정되지 않았습니다'
      };
    }
    
    const apiUrl = `https://api.vercel.com/v9/projects/${projectId}/domains`;
    
    // 3. Vercel API 호출 (주도메인 추가)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: domain
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error?.message || 'Vercel API 호출 실패'
      };
    }
    
    // 4. admin 도메인 추가
    const adminDomain = `admin.${domain}`;
    const adminResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: adminDomain
      })
    });
    
    const adminResult = await adminResponse.json();
    
    if (!adminResponse.ok) {
      return {
        success: false,
        error: adminResult.error?.message || 'Admin 도메인 추가 실패'
      };
    }
    
    return {
      success: true
    };
    
  } catch (error: any) {
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
    const vercelToken = import.meta.env.VITE_VERCEL_TOKEN;
    const projectId = import.meta.env.VITE_VERCEL_PROJECT_ID;
    
    if (!vercelToken || !projectId) {
      return {
        success: false,
        error: 'Vercel API 토큰 또는 프로젝트 ID가 설정되지 않았습니다'
      };
    }
    
    const apiUrl = `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`;
    
    // 주도메인 삭제
    await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${vercelToken}`
      }
    });
    
    // admin 도메인 삭제
    const adminDomain = `admin.${domain}`;
    const adminApiUrl = `https://api.vercel.com/v9/projects/${projectId}/domains/${adminDomain}`;
    await fetch(adminApiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${vercelToken}`
      }
    });
    
    return {
      success: true
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '도메인 제거 실패'
    };
  }
}
