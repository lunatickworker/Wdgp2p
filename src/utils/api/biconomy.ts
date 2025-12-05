/**
 * Biconomy API 백엔드 유틸리티
 * DB에서 암호화된 설정을 가져와서 Biconomy Supertransaction API 호출
 */

import { getBiconomySettings } from '../systemSettings';

export interface ComposeRequest {
  chainId: number;
  from: string;
  steps: Array<{
    type: 'transfer' | 'swap' | 'bridge' | 'supply' | 'approve';
    token?: string;
    tokenIn?: string;
    tokenOut?: string;
    to?: string;
    amount?: string;
    amountIn?: string;
    fromChainId?: number;
    toChainId?: number;
    protocol?: string;
  }>;
  gasPayment?: {
    token?: string;
    sponsor?: boolean;
    maxUserPayment?: string;
  };
  webhook?: {
    url: string;
    events: string[];
  };
}

export interface ComposeResponse {
  payload: {
    hash: string;
    steps: any[];
    nonce: number;
    expiry: number;
  };
  quote: {
    gasCost: string;
    estimatedTime: string;
    breakdown?: {
      execution: string;
      protocol: string;
      biconomy: string;
    };
  };
}

export interface ExecuteRequest {
  payload: ComposeResponse['payload'];
  signature: string;
}

export interface ExecuteResponse {
  txHash: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedCompletion?: string;
}

export interface StatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  details: {
    steps: Array<{
      step: string;
      status: string;
      txHash?: string;
    }>;
    estimatedCompletion?: string;
  };
  txHash?: string;
  errorMessage?: string;
}

/**
 * Biconomy Compose API 호출
 */
export async function composeBiconomyTransaction(
  request: ComposeRequest
): Promise<ComposeResponse> {
  try {
    // DB에서 설정 가져오기
    const settings = await getBiconomySettings();
    
    if (!settings || !settings.enabled) {
      throw new Error('Biconomy가 활성화되지 않았습니다. 관리자 설정을 확인해주세요.');
    }

    if (!settings.apiKey) {
      throw new Error('Biconomy API Key가 설정되지 않았습니다.');
    }

    // Compose API 호출
    const response = await fetch(`${settings.apiUrl}/compose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Compose failed: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Biconomy Compose Error:', error);
    throw new Error(error.message || 'Compose 요청에 실패했습니다');
  }
}

/**
 * Biconomy Execute API 호출
 */
export async function executeBiconomyTransaction(
  request: ExecuteRequest
): Promise<ExecuteResponse> {
  try {
    // DB에서 설정 가져오기
    const settings = await getBiconomySettings();
    
    if (!settings || !settings.enabled) {
      throw new Error('Biconomy가 활성화되지 않았습니다.');
    }

    if (!settings.apiKey) {
      throw new Error('Biconomy API Key가 설정되지 않았습니다.');
    }

    // Execute API 호출
    const response = await fetch(`${settings.apiUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Execute failed: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Biconomy Execute Error:', error);
    throw new Error(error.message || 'Execute 요청에 실패했습니다');
  }
}

/**
 * Biconomy Transaction Status 조회
 */
export async function getBiconomyTransactionStatus(
  txHash: string
): Promise<StatusResponse> {
  try {
    // DB에서 설정 가져오기
    const settings = await getBiconomySettings();
    
    if (!settings || !settings.enabled) {
      throw new Error('Biconomy가 활성화되지 않았습니다.');
    }

    if (!settings.apiKey) {
      throw new Error('Biconomy API Key가 설정되지 않았습니다.');
    }

    // Status API 호출
    const response = await fetch(`${settings.apiUrl}/status/${txHash}`, {
      method: 'GET',
      headers: {
        'x-api-key': settings.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Status query failed: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Biconomy Status Error:', error);
    throw new Error(error.message || '상태 조회에 실패했습니다');
  }
}

/**
 * 에러 처리 헬퍼
 */
export function handleBiconomyError(error: any): string {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    return `잔액 부족: ${error.details?.required || ''} 필요`;
  }
  
  if (error.code === 'SLIPPAGE_EXCEEDED') {
    return '슬리피지 초과: 가격 변동이 큽니다. 다시 시도해주세요.';
  }
  
  if (error.code === 'NETWORK_ERROR') {
    return '네트워크 오류가 발생했습니다.';
  }

  if (error.code === 'USER_REJECTED') {
    return '사용자가 서명을 거부했습니다.';
  }

  if (error.code === 'INVALID_API_KEY') {
    return 'API Key가 유효하지 않습니다. 관리자에게 문의하세요.';
  }

  return error.message || '알 수 없는 오류가 발생했습니다.';
}

/**
 * Biconomy 설정 상태 확인
 */
export async function checkBiconomyAvailability(): Promise<{
  available: boolean;
  message: string;
}> {
  try {
    const settings = await getBiconomySettings();
    
    if (!settings) {
      return {
        available: false,
        message: 'Biconomy 설정이 없습니다. 관리자가 설정을 완료해주세요.',
      };
    }

    if (!settings.enabled) {
      return {
        available: false,
        message: 'Biconomy가 비활성화되어 있습니다.',
      };
    }

    if (!settings.apiKey) {
      return {
        available: false,
        message: 'API Key가 설정되지 않았습니다.',
      };
    }

    return {
      available: true,
      message: 'Biconomy를 사용할 수 있습니다.',
    };
  } catch (error) {
    return {
      available: false,
      message: '설정을 확인하는 중 오류가 발생했습니다.',
    };
  }
}
