/**
 * Vercel API 유틸리티
 * 
 * 센터 생성 시 Vercel 프로젝트에 도메인을 자동으로 추가합니다.
 * 
 * 환경 변수 필요:
 * - VITE_VERCEL_TOKEN: Vercel API Token
 * - VITE_VERCEL_PROJECT_ID: Vercel Project ID
 */

const VERCEL_API_URL = 'https://api.vercel.com';

/**
 * Vercel API 설정 확인
 */
function getVercelConfig() {
  const token = import.meta.env?.VITE_VERCEL_TOKEN;
  const projectId = import.meta.env?.VITE_VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    console.warn('[Vercel] API 토큰 또는 프로젝트 ID가 설정되지 않았습니다');
    return null;
  }

  return { token, projectId };
}

/**
 * Vercel 프로젝트에 도메인 추가
 */
export async function addVercelDomain(domain: string): Promise<boolean> {
  try {
    const config = getVercelConfig();
    if (!config) {
      console.warn('[Vercel] 설정이 없어 도메인 추가를 건너뜁니다:', domain);
      return false;
    }

    const { token, projectId } = config;

    const response = await fetch(
      `${VERCEL_API_URL}/v9/projects/${projectId}/domains`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: domain
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[Vercel] 도메인 추가 실패:', error);
      return false;
    }

    const data = await response.json();
    console.log('[Vercel] 도메인 추가 성공:', domain, data);
    return true;
  } catch (error) {
    console.error('[Vercel] 도메인 추가 중 오류:', error);
    return false;
  }
}

/**
 * 센터 도메인 2개를 Vercel에 추가
 * - example.com (주도메인)
 * - admin.example.com (관리자용 서브도메인)
 */
export async function addCenterDomains(mainDomain: string): Promise<{
  main: boolean;
  admin: boolean;
}> {
  const adminDomain = `admin.${mainDomain}`;

  const [mainResult, adminResult] = await Promise.all([
    addVercelDomain(mainDomain),
    addVercelDomain(adminDomain)
  ]);

  return {
    main: mainResult,
    admin: adminResult
  };
}

/**
 * Vercel 프로젝트에서 도메인 제거
 */
export async function removeVercelDomain(domain: string): Promise<boolean> {
  try {
    const config = getVercelConfig();
    if (!config) {
      console.warn('[Vercel] 설정이 없어 도메인 제거를 건너뜁니다:', domain);
      return false;
    }

    const { token, projectId } = config;

    const response = await fetch(
      `${VERCEL_API_URL}/v9/projects/${projectId}/domains/${domain}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[Vercel] 도메인 제거 실패:', error);
      return false;
    }

    console.log('[Vercel] 도메인 제거 성공:', domain);
    return true;
  } catch (error) {
    console.error('[Vercel] 도메인 제거 중 오류:', error);
    return false;
  }
}

/**
 * Vercel 프로젝트의 모든 도메인 조회
 */
export async function getVercelDomains(): Promise<string[]> {
  try {
    const config = getVercelConfig();
    if (!config) {
      return [];
    }

    const { token, projectId } = config;

    const response = await fetch(
      `${VERCEL_API_URL}/v9/projects/${projectId}/domains`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[Vercel] 도메인 목록 조회 실패:', error);
      return [];
    }

    const data = await response.json();
    return data.domains?.map((d: any) => d.name) || [];
  } catch (error) {
    console.error('[Vercel] 도메인 목록 조회 중 오류:', error);
    return [];
  }
}

/**
 * 도메인이 Vercel 프로젝트에 이미 추가되었는지 확인
 */
export async function isDomainAdded(domain: string): Promise<boolean> {
  const domains = await getVercelDomains();
  return domains.includes(domain);
}

/**
 * DNS 설정 안내 메시지 생성
 */
export function getDnsInstructions(domain: string): string {
  return `
DNS 설정 안내:

1. DNS 제공자(Cloudflare, Route53 등) 관리 페이지로 이동
2. 다음 CNAME 레코드를 추가하세요:

   호스트명: ${domain}
   타입: CNAME
   값: cname.vercel-dns.com
   TTL: Auto (또는 3600)

   호스트명: admin.${domain}
   타입: CNAME
   값: cname.vercel-dns.com
   TTL: Auto (또는 3600)

3. DNS 전파까지 최대 48시간 소요될 수 있습니다
4. https://${domain} 접속하여 확인

참고: Vercel Dashboard → Domains에서도 설정 가능
`.trim();
}
