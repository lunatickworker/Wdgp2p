/**
 * 도메인 및 Tenant 정보 조회 유틸리티
 * 
 * Multi-Tenancy 시스템에서 도메인을 기반으로 센터 정보를 조회하고
 * 역할 기반 라우팅을 지원합니다.
 */

import { supabase } from './supabase/client';

export interface DomainMapping {
  domain_id: string;
  domain: string;
  center_id: string;
  domain_type: 'main' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface TenantInfo {
  centerId: string;
  centerName: string;
  domain: string;
  domainType: 'main' | 'admin';
  logoUrl: string | null;
  templateId: string;
  designTheme: any;
}

/**
 * 현재 호스트명으로 도메인 매핑 조회
 */
export async function getDomainMapping(hostname?: string): Promise<DomainMapping | null> {
  try {
    // hostname이 없으면 현재 window.location.hostname 사용
    const domain = hostname || (typeof window !== 'undefined' ? window.location.hostname : '');
    
    if (!domain) {
      console.warn('[Domain] hostname을 확인할 수 없습니다');
      return null;
    }

    // localhost 처리 (개발 환경) - fetch 전에 먼저 체크!
    if (domain === 'localhost' || domain.startsWith('127.0.0.1') || domain.includes('.figma.com') || domain.includes('figma.site')) {
      console.log('[Domain] 개발 환경 감지 - 도메인 매핑 건너뜀');
      return null;
    }

    const { data, error } = await supabase
      .from('domain_mappings')
      .select('*')
      .eq('domain', domain)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[Domain] 도메인 매핑 조회 실패:', error);
      return null;
    }

    if (!data) {
      console.log('[Domain] 매핑된 도메인이 없습니다:', domain);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Domain] 도메인 매핑 조회 중 오류:', error);
    return null;
  }
}

/**
 * 도메인으로 Tenant 정보 조회
 */
export async function getTenantInfo(hostname?: string): Promise<TenantInfo | null> {
  try {
    // 1. Domain Mapping 조회
    const mapping = await getDomainMapping(hostname);
    
    if (!mapping) {
      return null;
    }

    // 2. 센터 정보 조회
    const { data: center, error: centerError } = await supabase
      .from('users')
      .select('user_id, center_name, domain, logo_url, template_id, design_theme')
      .eq('user_id', mapping.center_id)
      .eq('role', 'center')
      .maybeSingle();

    if (centerError) {
      console.error('[Domain] 센터 정보 조회 실패:', centerError);
      return null;
    }

    if (!center) {
      console.warn('[Domain] 센터를 찾을 수 없습니다:', mapping.center_id);
      return null;
    }

    return {
      centerId: center.user_id,
      centerName: center.center_name || 'Unnamed Center',
      domain: center.domain || '',
      domainType: mapping.domain_type,
      logoUrl: center.logo_url,
      templateId: center.template_id || 'modern',
      designTheme: center.design_theme
    };
  } catch (error) {
    console.error('[Domain] Tenant 정보 조회 중 오류:', error);
    return null;
  }
}

/**
 * 도메인으로 센터 ID만 조회 (간단한 버전)
 */
export async function getCenterIdByDomain(hostname?: string): Promise<string | null> {
  try {
    const mapping = await getDomainMapping(hostname);
    return mapping ? mapping.center_id : null;
  } catch (error) {
    console.error('[Domain] 센터 ID 조회 중 오류:', error);
    return null;
  }
}

/**
 * 현재 도메인 타입 확인
 * @returns 'main' (회원용) | 'admin' (관리자용) | null
 */
export async function getDomainType(hostname?: string): Promise<'main' | 'admin' | null> {
  try {
    const mapping = await getDomainMapping(hostname);
    return mapping ? mapping.domain_type : null;
  } catch (error) {
    console.error('[Domain] 도메인 타입 확인 중 오류:', error);
    return null;
  }
}

/**
 * 도메인이 유효한지 확인
 */
export async function isDomainValid(hostname?: string): Promise<boolean> {
  const mapping = await getDomainMapping(hostname);
  return mapping !== null && mapping.is_active;
}

/**
 * 역할과 도메인 타입이 매치되는지 확인
 * - main 도메인: user 역할만 허용
 * - admin 도메인: center, store 역할만 허용
 */
export function isRoleAllowedForDomain(
  role: string,
  domainType: 'main' | 'admin'
): boolean {
  if (domainType === 'main') {
    // 회원용 도메인: user 역할만 허용
    return role === 'user';
  } else if (domainType === 'admin') {
    // 관리자용 도메인: center, store 역할 허용
    return role === 'center' || role === 'store';
  }
  return false;
}

/**
 * 사용자를 올바른 도메인으로 리다이렉트
 */
export function redirectToCorrectDomain(
  role: string,
  currentDomainType: 'main' | 'admin' | null,
  centerDomain: string
): void {
  // 개발 환경에서는 리다이렉트하지 않음
  if (typeof window === 'undefined') return;
  
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname.includes('.figma.com') || hostname.includes('figma.site')) {
    return;
  }

  // 회원(user)이 admin 도메인에 접속한 경우
  if (role === 'user' && currentDomainType === 'admin') {
    window.location.href = `https://${centerDomain}`;
    return;
  }

  // 관리자(center/store)가 main 도메인에 접속한 경우
  if ((role === 'center' || role === 'store') && currentDomainType === 'main') {
    window.location.href = `https://admin.${centerDomain}`;
    return;
  }
}
