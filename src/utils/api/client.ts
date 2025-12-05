import { projectId, publicAnonKey } from '../supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b6d5667f`;

// API 요청 헬퍼 함수
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

// =====================================================
// Wallet API
// =====================================================

export const walletApi = {
  // 새 지갑 주소 생성
  async create(userId: string, coinType: string, walletType: 'hot' | 'cold' = 'hot') {
    return apiRequest('/api/wallet/create', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, coin_type: coinType, wallet_type: walletType }),
    });
  },

  // 잔액 조회
  async getBalance(userId: string, coinType?: string) {
    const params = new URLSearchParams({ user_id: userId });
    if (coinType) params.append('coin_type', coinType);
    
    return apiRequest(`/api/wallet/balance?${params.toString()}`);
  },
};

// =====================================================
// Deposit API
// =====================================================

export const depositApi = {
  // 입금 알림 (웹훅)
  async notify(depositData: {
    user_id: string;
    wallet_id: string;
    coin_type: string;
    amount: number;
    tx_hash: string;
    confirmations?: number;
    from_address?: string;
  }) {
    return apiRequest('/api/deposit/notify', {
      method: 'POST',
      body: JSON.stringify(depositData),
    });
  },
};

// =====================================================
// Withdrawal API
// =====================================================

export const withdrawalApi = {
  // 출금 요청
  async request(withdrawalData: {
    user_id: string;
    wallet_id: string;
    coin_type: string;
    amount: number;
    to_address: string;
    fee?: number;
  }) {
    return apiRequest('/api/withdrawal/request', {
      method: 'POST',
      body: JSON.stringify(withdrawalData),
    });
  },

  // 출금 상태 조회
  async getStatus(withdrawalId: string) {
    return apiRequest(`/api/withdrawal/status/${withdrawalId}`);
  },
};

// =====================================================
// Transaction API
// =====================================================

export const transactionApi = {
  // 거래 내역 조회
  async getHistory(userId: string, limit = 50, offset = 0) {
    const params = new URLSearchParams({
      user_id: userId,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    return apiRequest(`/api/transactions/history?${params.toString()}`);
  },
};

// =====================================================
// Admin API
// =====================================================

export const adminApi = {
  // 대기 중인 출금 조회
  async getPendingWithdrawals() {
    return apiRequest('/api/admin/withdrawals/pending');
  },

  // 출금 승인
  async approveWithdrawal(withdrawalId: string, approvedBy: string, txHash?: string) {
    return apiRequest('/api/admin/withdrawal/approve', {
      method: 'POST',
      body: JSON.stringify({ withdrawal_id: withdrawalId, approved_by: approvedBy, tx_hash: txHash }),
    });
  },

  // 출금 거부
  async rejectWithdrawal(withdrawalId: string, rejectionReason: string) {
    return apiRequest('/api/admin/withdrawal/reject', {
      method: 'POST',
      body: JSON.stringify({ withdrawal_id: withdrawalId, rejection_reason: rejectionReason }),
    });
  },

  // 모든 사용자 조회
  async getUsers() {
    return apiRequest('/api/admin/users');
  },

  // 보안 로그 조회
  async getSecurityLogs(severity?: string, limit = 100) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (severity) params.append('severity', severity);
    
    return apiRequest(`/api/admin/security-logs?${params.toString()}`);
  },

  // 대시보드 통계
  async getDashboardStats() {
    return apiRequest('/api/admin/dashboard/stats');
  },
};
