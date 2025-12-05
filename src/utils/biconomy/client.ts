// Biconomy Supertransaction API Client
import { ethers } from 'ethers';
import { SUPERTRANSACTION_CONFIG, debugLog, errorLog } from '../config';

const BICONOMY_API_URL = SUPERTRANSACTION_CONFIG.apiUrl;
const API_KEY = SUPERTRANSACTION_CONFIG.apiKey;

export interface SupertransactionStep {
  type: 'transfer' | 'swap' | 'bridge' | 'supply' | 'borrow';
  token?: string;
  tokenIn?: string;
  tokenOut?: string;
  to?: string;
  amount?: string;
  amountIn?: string;
  amountOut?: string;
  fromChainId?: number;
  toChainId?: number;
  protocol?: string;
}

export interface SupertransactionPayload {
  chainId: number;
  from: string;
  steps: SupertransactionStep[];
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
  payload: any;
  quote: {
    gasCost?: string;
    estimatedTime?: string;
    breakdown?: {
      execution?: string;
      protocol?: string;
      biconomy?: string;
    };
  };
}

export interface ExecuteResponse {
  txHash: string;
  status: string;
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
}

export class BiconomyClient {
  private headers: HeadersInit;

  constructor(apiKey?: string) {
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey || API_KEY
    };
  }

  /**
   * Compose: 트랜잭션 구성 및 가스 견적
   */
  async compose(payload: SupertransactionPayload): Promise<ComposeResponse> {
    try {
      const response = await fetch(`${BICONOMY_API_URL}/compose`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Compose failed');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Biconomy Compose Error:', error);
      throw new Error(`Compose 실패: ${error.message}`);
    }
  }

  /**
   * Execute: 서명된 트랜잭션 실행
   */
  async execute(payload: any, signature: string): Promise<ExecuteResponse> {
    try {
      const response = await fetch(`${BICONOMY_API_URL}/execute`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          payload,
          signature
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Execute failed');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Biconomy Execute Error:', error);
      throw new Error(`Execute 실패: ${error.message}`);
    }
  }

  /**
   * Status: 트랜잭션 상태 확인
   */
  async getStatus(txHash: string): Promise<StatusResponse> {
    try {
      const response = await fetch(`${BICONOMY_API_URL}/status/${txHash}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error('Status check failed');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Biconomy Status Error:', error);
      throw new Error(`상태 확인 실패: ${error.message}`);
    }
  }

  /**
   * Simple Transfer: 단순 전송
   */
  async simpleTransfer(params: {
    from: string;
    to: string;
    token: string;
    amount: string;
    chainId?: number;
    gasToken?: string;
    sponsor?: boolean;
  }): Promise<ComposeResponse> {
    const payload: SupertransactionPayload = {
      chainId: params.chainId || 8453, // Base Mainnet
      from: params.from,
      steps: [
        {
          type: 'transfer',
          token: params.token,
          to: params.to,
          amount: params.amount
        }
      ],
      gasPayment: {
        token: params.gasToken,
        sponsor: params.sponsor || false
      }
    };

    return await this.compose(payload);
  }

  /**
   * Swap: 토큰 스왑
   */
  async swap(params: {
    from: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    chainId?: number;
    gasToken?: string;
  }): Promise<ComposeResponse> {
    const payload: SupertransactionPayload = {
      chainId: params.chainId || 8453,
      from: params.from,
      steps: [
        {
          type: 'swap',
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn
        }
      ],
      gasPayment: {
        token: params.gasToken,
        sponsor: false
      }
    };

    return await this.compose(payload);
  }

  /**
   * Swap and Transfer: 스왑 후 전송 (배치)
   */
  async swapAndTransfer(params: {
    from: string;
    to: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    chainId?: number;
    gasToken?: string;
  }): Promise<ComposeResponse> {
    const payload: SupertransactionPayload = {
      chainId: params.chainId || 8453,
      from: params.from,
      steps: [
        {
          type: 'swap',
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn
        },
        {
          type: 'transfer',
          token: params.tokenOut,
          to: params.to,
          amount: 'MAX' // 스왑 결과 전체 전송
        }
      ],
      gasPayment: {
        token: params.gasToken,
        sponsor: false
      }
    };

    return await this.compose(payload);
  }

  /**
   * Execute with Signer: 서명 및 실행을 한 번에
   */
  async executeWithSigner(
    payload: SupertransactionPayload,
    signer: ethers.Signer
  ): Promise<ExecuteResponse> {
    // 1. Compose
    const { payload: txPayload, quote } = await this.compose(payload);
    
    console.log('가스비 견적:', quote);

    // 2. Sign
    const message = JSON.stringify(txPayload);
    const signature = await signer.signMessage(message);

    // 3. Execute
    return await this.execute(txPayload, signature);
  }
}

// Singleton instance
export const biconomyClient = new BiconomyClient();

// Helper functions
export const formatGasCost = (quote: ComposeResponse['quote']): string => {
  if (!quote.gasCost) return '알 수 없음';
  return quote.gasCost;
};

export const formatEstimatedTime = (quote: ComposeResponse['quote']): string => {
  if (!quote.estimatedTime) return '알 수 없음';
  return quote.estimatedTime;
};