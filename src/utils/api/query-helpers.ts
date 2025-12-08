import { supabase } from '../supabase/client';

/**
 * Tenant별 데이터 격리를 위한 쿼리 헬퍼
 */

/**
 * 현재 사용자의 모든 하위 사용자 ID 조회 (계층 구조)
 * master > agency > center > store > user
 */
export async function getHierarchyUserIds(userId: string, role: string): Promise<string[]> {
  if (role === 'master') {
    // Master는 모든 사용자
    const { data, error } = await supabase
      .from('users')
      .select('user_id');
    
    if (error) {
      console.error('Failed to fetch all users for master:', error);
      return [userId];
    }
    
    return data?.map(u => u.user_id) || [userId];
  }
  
  if (role === 'agency') {
    // Agency: 자신 + 자신이 생성한 center + 그 하위 store + 그 하위 user
    const centerIds: string[] = [];
    const storeIds: string[] = [];
    const userIds: string[] = [userId];
    
    // 1. 자신이 생성한 center들
    const { data: centers } = await supabase
      .from('users')
      .select('user_id')
      .eq('parent_user_id', userId)
      .eq('role', 'center');
    
    if (centers) {
      centerIds.push(...centers.map(c => c.user_id));
      userIds.push(...centerIds);
    }
    
    // 2. center들이 생성한 store들
    if (centerIds.length > 0) {
      const { data: stores } = await supabase
        .from('users')
        .select('user_id')
        .in('parent_user_id', centerIds)
        .eq('role', 'store');
      
      if (stores) {
        storeIds.push(...stores.map(s => s.user_id));
        userIds.push(...storeIds);
      }
    }
    
    // 3. store들이 생성한 user들
    if (storeIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id')
        .in('parent_user_id', storeIds)
        .eq('role', 'user');
      
      if (users) {
        userIds.push(...users.map(u => u.user_id));
      }
    }
    
    return userIds;
  }
  
  if (role === 'center') {
    // Center: 자신 + 자신이 생성한 store + 그 하위 user + 자신이 직접 생성한 user
    const storeIds: string[] = [];
    const userIds: string[] = [userId];
    
    // 1. 자신이 생성한 store들
    const { data: stores } = await supabase
      .from('users')
      .select('user_id')
      .eq('parent_user_id', userId)
      .eq('role', 'store');
    
    if (stores) {
      storeIds.push(...stores.map(s => s.user_id));
      userIds.push(...storeIds);
    }
    
    // 2. store들이 생성한 user들
    if (storeIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id')
        .in('parent_user_id', storeIds)
        .eq('role', 'user');
      
      if (users) {
        userIds.push(...users.map(u => u.user_id));
      }
    }
    
    // 3. 자신이 직접 생성한 user들 (추가!)
    const { data: directUsers } = await supabase
      .from('users')
      .select('user_id')
      .eq('parent_user_id', userId)
      .eq('role', 'user');
    
    if (directUsers) {
      userIds.push(...directUsers.map(u => u.user_id));
    }
    
    return userIds;
  }
  
  if (role === 'store') {
    // Store: 자신 + 자신이 생성한 user
    const userIds: string[] = [userId];
    
    const { data: users } = await supabase
      .from('users')
      .select('user_id')
      .eq('parent_user_id', userId)
      .eq('role', 'user');
    
    if (users) {
      userIds.push(...users.map(u => u.user_id));
    }
    
    return userIds;
  }
  
  // user 또는 기타: 자신만
  return [userId];
}

// 특정 tenant의 모든 회원 조회
export async function getUsersByTenant(tenantId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('role', 'user');
  
  return { data, error };
}

// 특정 tenant의 모든 가맹점 조회
export async function getStoresByTenant(tenantId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('role', 'store');
  
  return { data, error };
}

// 특정 tenant의 모든 트랜잭션 조회
export async function getTransactionsByTenant(tenantId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  
  return { data, error };
}

// 특정 tenant의 모든 지갑 조회
export async function getWalletsByTenant(tenantId: string) {
  const { data, error } = await supabase
    .from('wallets')
    .select(`
      *,
      user:users!user_id(*)
    `)
    .eq('tenant_id', tenantId);
  
  return { data, error };
}

// 특정 회원의 트랜잭션 조회 (tenant_id로 격리)
export async function getUserTransactions(userId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId) // 추가 보안
    .order('created_at', { ascending: false });
  
  return { data, error };
}

// Tenant 통계 조회
export async function getTenantStats(tenantId: string) {
  try {
    // 회원 수
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'user');
    
    // 가맹점 수
    const { count: storeCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'store');
    
    // 총 거래액
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed');
    
    const totalAmount = transactions?.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) || 0;
    
    return {
      userCount: userCount || 0,
      storeCount: storeCount || 0,
      totalAmount
    };
  } catch (error) {
    return {
      userCount: 0,
      storeCount: 0,
      totalAmount: 0
    };
  }
}

// 특정 tenant의 지갑 잔액 합계
export async function getTenantTotalBalance(tenantId: string) {
  try {
    const { data: wallets } = await supabase
      .from('wallets')
      .select('balance, coin_type')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');
    
    // 코인 타입별로 그룹화
    const balancesByCoin: Record<string, number> = {};
    wallets?.forEach((wallet) => {
      const coinType = wallet.coin_type;
      const balance = Number(wallet.balance) || 0;
      balancesByCoin[coinType] = (balancesByCoin[coinType] || 0) + balance;
    });
    
    return {
      success: true,
      balances: balancesByCoin
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      balances: {}
    };
  }
}

// 특정 tenant의 최근 활동 조회
export async function getTenantRecentActivity(tenantId: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      user:users!user_id(username, email)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return { data, error };
}