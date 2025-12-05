import { SUPERTRANSACTION_CONFIG, BICONOMY_CONFIG, debugLog, errorLog, SUPABASE_CONFIG } from '../config';

const API_URL = SUPERTRANSACTION_CONFIG.apiUrl;
const API_KEY = SUPERTRANSACTION_CONFIG.apiKey;
const BACKEND_URL = SUPABASE_CONFIG.backendUrl;

export interface SmartAccountRequest {
  userId: string;
  username: string;
  chainId?: number;
}

export interface SmartAccountResponse {
  address: string;
  chainId: number;
  owner: string;
  status: 'active' | 'pending';
  createdAt: string;
}

export interface GasSponsorConfig {
  mode: 'user' | 'operator' | 'partial';
  token?: string;
  maxUserPayment?: string;
}

export async function createSmartAccount(
  request: SmartAccountRequest
): Promise<SmartAccountResponse> {
  try {
    debugLog('Creating Smart Account for user:', request.userId);

    const chainId = request.chainId || SUPERTRANSACTION_CONFIG.defaultChainId;

    // Backend API 호출로 변경 (프론트엔드에서 ethers 사용 X)
    const response = await fetch(`${BACKEND_URL}/api/biconomy/create-smart-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: request.userId,
        username: request.username,
        chain_id: chainId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Smart Account 생성 실패');
    }

    const result = await response.json();
    debugLog('Smart Account created:', result);

    return {
      address: result.address,
      chainId: result.chainId,
      owner: result.owner,
      status: 'active',
      createdAt: result.createdAt || new Date().toISOString(),
    };

  } catch (error: any) {
    errorLog('Smart Account creation failed:', error);
    throw new Error(`Smart Account 생성 실패: ${error.message}`);
  }
}

export async function getSmartAccountBalance(
  address: string,
  chainId?: number
): Promise<{ balance: string; balanceInEth: string }> {
  try {
    // Backend API 호출로 변경
    const response = await fetch(`${BACKEND_URL}/api/biconomy/balance/${address}?chainId=${chainId || SUPERTRANSACTION_CONFIG.defaultChainId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '잔액 조회 실패');
    }

    const result = await response.json();
    return {
      balance: result.balance,
      balanceInEth: result.balanceInEth,
    };
  } catch (error: any) {
    errorLog('Balance fetch failed:', error);
    throw new Error(`잔액 조회 실패: ${error.message}`);
  }
}

export function getGasSponsorConfig(mode: GasSponsorConfig['mode']): any {
  switch (mode) {
    case 'operator':
      return {
        sponsor: true
      };
    
    case 'partial':
      return {
        token: SUPERTRANSACTION_CONFIG.defaultGasToken,
        sponsor: true,
        maxUserPayment: '1'
      };
    
    case 'user':
    default:
      return {
        token: SUPERTRANSACTION_CONFIG.defaultGasToken,
        sponsor: false
      };
  }
}

export async function composeTransaction(payload: {
  chainId: number;
  from: string;
  steps: any[];
  gasPayment?: any;
}) {
  try {
    // Backend API 호출 (CORS 회피)
    const response = await fetch(`${BACKEND_URL}/api/biconomy/compose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Compose failed');
    }

    const result = await response.json();
    debugLog('Compose successful:', result);
    return result;

  } catch (error: any) {
    errorLog('Compose error:', error);
    throw error;
  }
}

export async function executeTransaction(walletId: string, payload: any) {
  try {
    // Backend에서 서명 및 실행 처리 (Private Key는 Backend에만 존재)
    const response = await fetch(`${BACKEND_URL}/api/biconomy/sign-and-execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet_id: walletId,
        payload,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Execute failed');
    }

    const result = await response.json();
    debugLog('Execute successful:', result);
    return result;

  } catch (error: any) {
    errorLog('Execute error:', error);
    throw error;
  }
}

export async function getTransactionStatus(txHash: string) {
  try {
    // Backend API 호출
    const response = await fetch(`${BACKEND_URL}/api/biconomy/status/${txHash}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Status check failed');
    }

    const result = await response.json();
    debugLog('Status:', result);
    return result;

  } catch (error: any) {
    errorLog('Status check error:', error);
    throw error;
  }
}

export async function batchTransfer(params: {
  from: string;
  recipients: Array<{ address: string; amount: string }>;
  token: string;
  chainId?: number;
  sponsor?: boolean;
}) {
  const steps = params.recipients.map(recipient => ({
    type: 'transfer',
    token: params.token,
    to: recipient.address,
    amount: recipient.amount,
  }));

  const payload = {
    chainId: params.chainId || SUPERTRANSACTION_CONFIG.defaultChainId,
    from: params.from,
    steps,
    gasPayment: {
      sponsor: params.sponsor || false,
    },
  };

  return await composeTransaction(payload);
}

export async function crossChainTransfer(params: {
  from: string;
  fromChainId: number;
  toChainId: number;
  token: string;
  amount: string;
  to: string;
}) {
  const payload = {
    chainId: params.fromChainId,
    from: params.from,
    steps: [
      {
        type: 'bridge',
        fromChainId: params.fromChainId,
        toChainId: params.toChainId,
        token: params.token,
        amount: params.amount,
      },
      {
        type: 'transfer',
        token: params.token,
        to: params.to,
        amount: params.amount,
      },
    ],
  };

  return await composeTransaction(payload);
}

export async function defiWorkflow(params: {
  from: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  protocol: string;
  chainId?: number;
}) {
  const payload = {
    chainId: params.chainId || SUPERTRANSACTION_CONFIG.defaultChainId,
    from: params.from,
    steps: [
      {
        type: 'swap',
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
      },
      {
        type: 'supply',
        protocol: params.protocol,
        token: params.tokenOut,
        amount: 'MAX',
      },
    ],
  };

  return await composeTransaction(payload);
}