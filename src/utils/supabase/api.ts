import { supabase } from './client';
import type { User, Wallet, Deposit, Withdrawal, Transaction, WithdrawalLimit, SecurityLog, IpWhitelist } from './types';

// =====================================================
// Users API
// =====================================================

export const usersApi = {
  // 모든 사용자 조회
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as User[];
  },

  // 사용자 ID로 조회
  async getById(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data as User;
  },

  // KYC 상태로 필터링
  async getByKycStatus(status: 'pending' | 'verified' | 'rejected') {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('kyc_status', status);
    
    if (error) throw error;
    return data as User[];
  },

  // 사용자 생성
  async create(user: Omit<User, 'user_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single();
    
    if (error) throw error;
    return data as User;
  },

  // 사용자 업데이트
  async update(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data as User;
  }
};

// =====================================================
// Wallets API
// =====================================================

export const walletsApi = {
  // 사용자별 지갑 조회
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data as Wallet[];
  },

  // 코인 타입별 모든 지갑 조회
  async getByCoinType(coinType: string) {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('coin_type', coinType);
    
    if (error) throw error;
    return data as Wallet[];
  },

  // Hot/Cold 지갑 통계
  async getWalletStats() {
    const { data, error } = await supabase
      .from('wallets')
      .select('wallet_type, coin_type, balance');
    
    if (error) throw error;
    return data;
  },

  // 지갑 상태 업데이트 (동결/활성화)
  async updateStatus(walletId: string, status: 'active' | 'frozen' | 'suspended') {
    const { data, error } = await supabase
      .from('wallets')
      .update({ status })
      .eq('wallet_id', walletId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Wallet;
  },

  // 지갑 잔액 업데이트
  async updateBalance(walletId: string, balance: number) {
    const { data, error } = await supabase
      .from('wallets')
      .update({ balance })
      .eq('wallet_id', walletId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Wallet;
  }
};

// =====================================================
// Deposits API
// =====================================================

export const depositsApi = {
  // 모든 입금 조회
  async getAll(limit = 50) {
    const { data, error } = await supabase
      .from('deposits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as Deposit[];
  },

  // 상태별 입금 조회
  async getByStatus(status: 'pending' | 'confirmed' | 'failed') {
    const { data, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Deposit[];
  },

  // 사용자별 입금 조회
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Deposit[];
  },

  // 입금 상태 업데이트
  async updateStatus(depositId: string, status: 'pending' | 'confirmed' | 'failed', confirmations?: number) {
    const updates: any = { status };
    if (confirmations !== undefined) {
      updates.confirmations = confirmations;
    }
    if (status === 'confirmed') {
      updates.confirmed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('deposits')
      .update(updates)
      .eq('deposit_id', depositId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Deposit;
  }
};

// =====================================================
// Withdrawals API
// =====================================================

export const withdrawalsApi = {
  // 모든 출금 조회
  async getAll(limit = 50) {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as Withdrawal[];
  },

  // 상태별 출금 조회 (pending만 필터링)
  async getPending() {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Withdrawal[];
  },

  // 출금 승인
  async approve(withdrawalId: string, approvedBy: string, txHash?: string) {
    const { data, error } = await supabase
      .from('withdrawals')
      .update({
        status: 'processing',
        approved_by: approvedBy,
        tx_hash: txHash,
        processed_at: new Date().toISOString()
      })
      .eq('withdrawal_id', withdrawalId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Withdrawal;
  },

  // 출금 거부
  async reject(withdrawalId: string, reason: string) {
    const { data, error } = await supabase
      .from('withdrawals')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        processed_at: new Date().toISOString()
      })
      .eq('withdrawal_id', withdrawalId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Withdrawal;
  },

  // 출금 완료
  async complete(withdrawalId: string, txHash: string) {
    const { data, error } = await supabase
      .from('withdrawals')
      .update({
        status: 'completed',
        tx_hash: txHash,
        completed_at: new Date().toISOString()
      })
      .eq('withdrawal_id', withdrawalId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Withdrawal;
  }
};

// =====================================================
// Transactions API
// =====================================================

export const transactionsApi = {
  // 최근 거래 조회
  async getRecent(limit = 100) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as Transaction[];
  },

  // 사용자별 거래 조회
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Transaction[];
  },

  // 거래 생성
  async create(transaction: Omit<Transaction, 'transaction_id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();
    
    if (error) throw error;
    return data as Transaction;
  }
};

// =====================================================
// Security Logs API
// =====================================================

export const securityLogsApi = {
  // 모든 보안 로그 조회
  async getAll(limit = 100) {
    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as SecurityLog[];
  },

  // 심각도별 조회
  async getBySeverity(severity: 'low' | 'medium' | 'high' | 'critical') {
    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .eq('severity', severity)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as SecurityLog[];
  },

  // 보안 로그 생성
  async create(log: Omit<SecurityLog, 'log_id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('security_logs')
      .insert(log)
      .select()
      .single();
    
    if (error) throw error;
    return data as SecurityLog;
  },

  // 상태 업데이트
  async updateStatus(logId: string, status: 'pending' | 'resolved' | 'monitoring' | 'blocked') {
    const { data, error } = await supabase
      .from('security_logs')
      .update({ status })
      .eq('log_id', logId)
      .select()
      .single();
    
    if (error) throw error;
    return data as SecurityLog;
  }
};

// =====================================================
// IP Whitelist API
// =====================================================

export const ipWhitelistApi = {
  // 모든 IP 조회
  async getAll() {
    const { data, error } = await supabase
      .from('ip_whitelist')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as IpWhitelist[];
  },

  // 활성 IP만 조회
  async getActive() {
    const { data, error } = await supabase
      .from('ip_whitelist')
      .select('*')
      .eq('status', 'active');
    
    if (error) throw error;
    return data as IpWhitelist[];
  },

  // IP 추가
  async add(ipData: Omit<IpWhitelist, 'whitelist_id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('ip_whitelist')
      .insert(ipData)
      .select()
      .single();
    
    if (error) throw error;
    return data as IpWhitelist;
  },

  // IP 상태 업데이트
  async updateStatus(whitelistId: string, status: 'active' | 'inactive') {
    const { data, error } = await supabase
      .from('ip_whitelist')
      .update({ status })
      .eq('whitelist_id', whitelistId)
      .select()
      .single();
    
    if (error) throw error;
    return data as IpWhitelist;
  }
};

// =====================================================
// Dashboard Statistics
// =====================================================

export const dashboardApi = {
  // 전체 통계
  async getStats() {
    // 총 사용자 수
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 대기 중인 출금
    const { count: pendingWithdrawals } = await supabase
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // 오늘 입금
    const today = new Date().toISOString().split('T')[0];
    const { data: todayDeposits } = await supabase
      .from('deposits')
      .select('amount, coin_type')
      .gte('created_at', today)
      .eq('status', 'confirmed');

    // 오늘 출금
    const { data: todayWithdrawals } = await supabase
      .from('withdrawals')
      .select('amount, coin_type')
      .gte('created_at', today)
      .in('status', ['completed', 'processing']);

    return {
      totalUsers: totalUsers || 0,
      pendingWithdrawals: pendingWithdrawals || 0,
      todayDeposits: todayDeposits || [],
      todayWithdrawals: todayWithdrawals || []
    };
  }
};
