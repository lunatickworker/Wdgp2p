// Biconomy Supertransaction API 유틸리티
import { ethers } from 'ethers';

const BICONOMY_API_URL = 'https://supertransaction.biconomy.io/api/v1';
const BICONOMY_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BICONOMY_API_KEY) || 'mee_VPQhU1Xe7Xq3w9M59EvFab';

export interface TransactionStep {
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
}

export interface GasPayment {
  token?: string;
  sponsor?: boolean;
  maxUserPayment?: string;
}

export interface ComposeRequest {
  chainId: number;
  from: string;
  steps: TransactionStep[];
  gasPayment?: GasPayment;
  webhook?: {
    url: string;
    events: string[];
  };
}

export interface ComposeResponse {
  payload: {
    hash: string;
    steps: TransactionStep[];
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
 * Step 1: Compose - 트랜잭션 구성
 */
export async function composeTransaction(
  request: ComposeRequest
): Promise<ComposeResponse> {
  try {
    const response = await fetch(`${BICONOMY_API_URL}/compose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BICONOMY_API_KEY,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Compose 실패');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Compose Error:', error);
    throw new Error(error.message || 'Compose 요청 실패');
  }
}

/**
 * Step 2: Sign - 사용자 서명
 */
export async function signPayload(
  payload: ComposeResponse['payload'],
  signer: ethers.Signer
): Promise<string> {
  try {
    // Payload를 문자열로 변환하여 서명
    const message = JSON.stringify(payload);
    const signature = await signer.signMessage(message);
    return signature;
  } catch (error: any) {
    console.error('Sign Error:', error);
    throw new Error('서명 실패: ' + error.message);
  }
}

/**
 * Step 3: Execute - 트랜잭션 실행
 */
export async function executeTransaction(
  request: ExecuteRequest
): Promise<ExecuteResponse> {
  try {
    const response = await fetch(`${BICONOMY_API_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BICONOMY_API_KEY,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Execute 실패');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Execute Error:', error);
    throw new Error(error.message || 'Execute 요청 실패');
  }
}

/**
 * 트랜잭션 상태 확인
 */
export async function getTransactionStatus(
  txHash: string
): Promise<StatusResponse> {
  try {
    const response = await fetch(`${BICONOMY_API_URL}/status/${txHash}`, {
      headers: {
        'x-api-key': BICONOMY_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error('상태 조회 실패');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Status Error:', error);
    throw new Error(error.message || '상태 조회 실패');
  }
}

/**
 * 전체 프로세스 실행 (Compose → Sign → Execute)
 */
export async function executeSupertransaction(
  request: ComposeRequest,
  signer: ethers.Signer
): Promise<ExecuteResponse> {
  try {
    // Step 1: Compose
    const composeResult = await composeTransaction(request);
    console.log('✅ Compose 완료:', composeResult.quote);

    // Step 2: Sign
    const signature = await signPayload(composeResult.payload, signer);
    console.log('✅ 서명 완료');

    // Step 3: Execute
    const executeResult = await executeTransaction({
      payload: composeResult.payload,
      signature,
    });
    console.log('✅ Execute 완료:', executeResult.txHash);

    return executeResult;
  } catch (error: any) {
    console.error('Supertransaction Error:', error);
    throw error;
  }
}

/**
 * 에러 처리 헬퍼
 */
export function handleSupertransactionError(error: any): string {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    return `잔액 부족: ${error.details?.required || '필요한 금액'} 필요, ${error.details?.available || '현재 잔액'} 보유`;
  }
  
  if (error.code === 'SLIPPAGE_EXCEEDED') {
    return '슬리피지 초과: 가격 변동이 큽니다. 다시 시도해주세요.';
  }
  
  if (error.code === 'NETWORK_ERROR') {
    return '네트워크 오류: 자동으로 재시도 중입니다...';
  }

  if (error.code === 'USER_REJECTED') {
    return '사용자가 서명을 거부했습니다.';
  }

  return error.message || '알 수 없는 오류가 발생했습니다.';
}

/**
 * 지원되는 토큰 목록
 */
export const SUPPORTED_TOKENS = {
  BASE: ['KRWQ', 'USDT', 'USDC', 'ETH', 'WETH'],
  POLYGON: ['KRWQ', 'USDT', 'USDC', 'MATIC', 'WMATIC'],
  ETHEREUM: ['ETH', 'USDT', 'USDC', 'DAI', 'WETH'],
  ARBITRUM: ['ETH', 'USDT', 'USDC', 'ARB'],
  OPTIMISM: ['ETH', 'USDT', 'USDC', 'OP'],
};

/**
 * 지원되는 체인 ID
 */
export const CHAIN_IDS = {
  ETHEREUM: 1,
  POLYGON: 137,
  BASE: 8453,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BSC: 56,
};

/**
 * 가스비 토큰 추천
 */
export function recommendGasToken(chainId: number): string {
  switch (chainId) {
    case CHAIN_IDS.BASE:
    case CHAIN_IDS.POLYGON:
    case CHAIN_IDS.ETHEREUM:
      return 'USDT'; // 안정성
    default:
      return 'USDT';
  }
}