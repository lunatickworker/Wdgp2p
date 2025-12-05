// Supabase Database Types
// Database.md 기반으로 생성된 타입 정의

export interface User {
  user_id: string;
  username: string;
  email: string;
  kyc_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

export interface Wallet {
  wallet_id: string;
  user_id: string;
  coin_type: 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'BNB';
  address: string;
  balance: number;
  status: 'active' | 'frozen' | 'suspended';
  wallet_type: 'hot' | 'cold';
  created_at: string;
  updated_at?: string;
}

export interface Deposit {
  deposit_id: string;
  user_id: string;
  wallet_id: string;
  coin_type: string;
  amount: number;
  tx_hash: string;
  confirmations: number;
  required_confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
  from_address?: string;
  created_at: string;
  confirmed_at?: string;
}

export interface Withdrawal {
  withdrawal_id: string;
  user_id: string;
  wallet_id: string;
  coin_type: string;
  amount: number;
  fee: number;
  to_address: string;
  tx_hash?: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';
  rejection_reason?: string;
  approved_by?: string;
  created_at: string;
  processed_at?: string;
  completed_at?: string;
}

export interface Transaction {
  transaction_id: string;
  user_id: string;
  wallet_id?: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'fee';
  coin_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_id?: string;
  description?: string;
  created_at: string;
}

export interface WithdrawalLimit {
  limit_id: string;
  user_id: string;
  coin_type: string;
  daily_limit: number;
  monthly_limit: number;
  daily_used: number;
  monthly_used: number;
  last_reset_daily: string;
  last_reset_monthly: string;
  created_at: string;
  updated_at?: string;
}

export interface SecurityLog {
  log_id: string;
  user_id?: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip_address?: string;
  user_agent?: string;
  description?: string;
  metadata?: any;
  status: 'pending' | 'resolved' | 'monitoring' | 'blocked';
  created_at: string;
}

export interface IpWhitelist {
  whitelist_id: string;
  ip_address: string;
  label?: string;
  status: 'active' | 'inactive';
  last_access?: string;
  created_at: string;
  created_by?: string;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: 'signup' | 'account_verification' | 'verification_request' | 'verification_approved' | 'verification_rejected' | 
        'purchase_request' | 'purchase_approved' | 'purchase_rejected' | 'purchase_completed' |
        'deposit' | 'withdrawal';
  title: string;
  message: string;
  read: boolean;
  data?: any;
  created_at: string;
}