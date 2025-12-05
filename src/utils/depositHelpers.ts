import { supabase } from "./supabase/client";

export interface CenterDepositStats {
  center_id: string;
  center_name: string;
  krw_today: number;
  krw_yesterday: number;
  coin_today: number;
  coin_yesterday: number;
  template_id: string;
}

/**
 * 날짜 범위 헬퍼
 */
export function getDateRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * 특정 센터의 모든 하위 사용자 ID 조회 (재귀)
 */
export async function getCenterUserIds(centerId: string): Promise<string[]> {
  const userIds = [centerId];
  
  try {
    // 1단계: 센터 직접 하위 (store, user)
    const { data: directChildren } = await supabase
      .from('users')
      .select('user_id')
      .eq('parent_user_id', centerId);
    
    if (directChildren && directChildren.length > 0) {
      const directIds = directChildren.map(u => u.user_id);
      userIds.push(...directIds);
      
      // 2단계: store 하위의 user들
      const { data: storeChildren } = await supabase
        .from('users')
        .select('user_id')
        .in('parent_user_id', directIds);
      
      if (storeChildren && storeChildren.length > 0) {
        userIds.push(...storeChildren.map(u => u.user_id));
      }
    }
  } catch (error) {
    console.error('하위 사용자 조회 실패:', error);
  }
  
  return userIds;
}

/**
 * 특정 날짜의 입금액 집계 (통화별)
 */
export async function getDepositsByDate(
  userIds: string[],
  date: Date
): Promise<{ krw: number; coin: number }> {
  const { start, end } = getDateRange(date);
  
  try {
    // confirmed 상태의 입금만 집계
    const { data: deposits } = await supabase
      .from('deposits')
      .select('amount, coin_type')
      .in('user_id', userIds)
      .eq('status', 'confirmed')
      .gte('created_at', start)
      .lt('created_at', end);
    
    if (!deposits || deposits.length === 0) {
      return { krw: 0, coin: 0 };
    }
    
    let krw = 0;
    let coin = 0;
    
    deposits.forEach(d => {
      const amount = parseFloat(d.amount.toString());
      
      // KRW, KRWQ 등을 원화로 간주
      if (d.coin_type.toUpperCase().includes('KRW')) {
        krw += amount;
      } else {
        // USDT, BTC, ETH 등은 코인으로 간주
        coin += amount;
      }
    });
    
    return { krw, coin };
  } catch (error) {
    console.error('입금액 집계 실패:', error);
    return { krw: 0, coin: 0 };
  }
}

/**
 * 센터별 입금액 통계 조회
 */
export async function getCenterDepositStats(): Promise<CenterDepositStats[]> {
  try {
    // 모든 센터 조회
    const { data: centers, error } = await supabase
      .from('users')
      .select('user_id, center_name, username, template_id')
      .eq('role', 'center')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    if (!centers || centers.length === 0) {
      return [];
    }
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 각 센터별 입금액 집계
    const stats = await Promise.all(
      centers.map(async (center) => {
        // 센터 + 모든 하위 사용자 ID
        const userIds = await getCenterUserIds(center.user_id);
        
        // 오늘/어제 입금액
        const todayDeposits = await getDepositsByDate(userIds, today);
        const yesterdayDeposits = await getDepositsByDate(userIds, yesterday);
        
        return {
          center_id: center.user_id,
          center_name: center.center_name || center.username,
          krw_today: todayDeposits.krw,
          krw_yesterday: yesterdayDeposits.krw,
          coin_today: todayDeposits.coin,
          coin_yesterday: yesterdayDeposits.coin,
          template_id: center.template_id || 'modern',
        };
      })
    );
    
    return stats;
  } catch (error) {
    console.error('센터별 입금액 통계 조회 실패:', error);
    return [];
  }
}

/**
 * 전체 입금액 통계 (모든 센터 합계)
 */
export async function getTotalDepositStats(): Promise<{
  todayDeposits: number;
  yesterdayDeposits: number;
}> {
  const centerStats = await getCenterDepositStats();
  
  const totals = centerStats.reduce(
    (acc, center) => ({
      todayDeposits: acc.todayDeposits + center.krw_today,
      yesterdayDeposits: acc.yesterdayDeposits + center.krw_yesterday,
    }),
    { todayDeposits: 0, yesterdayDeposits: 0 }
  );
  
  return totals;
}