/**
 * 가스비 정책 헬퍼 함수
 * 
 * 사용자 레벨에 따른 가스비 스폰서십 정책을 자동으로 가져옵니다.
 * RLS 정책 때문에 Backend API를 통해 조회합니다.
 */

import { SUPABASE_CONFIG } from '../config';

export interface GasPaymentConfig {
  sponsor: boolean;
  token?: string;
  maxUserPayment?: string;
}

/**
 * 사용자 레벨에 따른 가스비 정책 가져오기
 * Backend API를 통해 조회 (RLS 우회)
 */
export async function getGasPolicyForUser(userId: string): Promise<GasPaymentConfig> {
  try {
    const backendUrl = 'https://mzoeeqmtvlnyonicycvg.supabase.co/functions/v1/make-server-b6d5667f';
    const response = await fetch(`${backendUrl}/api/gas-policy/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
      }
    });

    if (!response.ok) {
      return {
        sponsor: false,
        token: 'USDC'
      };
    }

    const data = await response.json();

    if (!data.success || !data.policy) {
      return {
        sponsor: false,
        token: 'USDC'
      };
    }

    return data.policy;
  } catch (error) {
    return {
      sponsor: false,
      token: 'USDC'
    };
  }
}

/**
 * 가스비 정책을 사용자 친화적인 텍스트로 변환
 */
export function getGasPolicyDescription(config: GasPaymentConfig): string {
  if (config.sponsor && !config.maxUserPayment) {
    return '가스비 100% 무료 🎉';
  }
  
  if (config.sponsor && config.maxUserPayment) {
    return `최대 ${config.maxUserPayment} ${config.token}까지만 부담 ✨`;
  }
  
  return `출금 가스비는 본인 부담`;
}

/**
 * 사용자 레벨 배지 색상 가져오기
 */
export function getLevelBadgeColor(level: string): string {
  switch (level) {
    case 'VIP':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'Premium':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'Standard':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'Basic':
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}