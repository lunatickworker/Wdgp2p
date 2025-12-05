import { supabase } from "./supabase/client";

export interface CenterDepositStats {
  center_id: string;
  center_name: string;
  krw_today: number;            // KRW 스테이블코인 입금액 (원화)
  krw_yesterday: number;
  coin_today: number;           // 기타 코인 입금액 (원화 환산)
  coin_yesterday: number;
  template_id: string;
  krw_change_percent?: number;
  fee_rate: number;
}

/**
 * 센터별 입금액 통계 조회 (최적화 버전)
 * 데이터베이스 뷰 사용: center_deposit_comparison
 */
export async function getCenterDepositStatsOptimized(): Promise<CenterDepositStats[]> {
  try {
    const { data, error } = await supabase
      .from('center_deposit_comparison')
      .select('*')
      .order('krw_today', { ascending: false });

    if (error) {
      console.error('뷰 조회 실패, 기본 방식으로 fallback:', error);
      // 뷰가 없으면 기본 방식 사용
      return fallbackGetCenterDepositStats();
    }

    return (data || []).map(row => ({
      center_id: row.center_id,
      center_name: row.center_name,
      krw_today: parseFloat(row.krw_today || 0),
      krw_yesterday: parseFloat(row.krw_yesterday || 0),
      coin_today: parseFloat(row.coin_today || 0),
      coin_yesterday: parseFloat(row.coin_yesterday || 0),
      template_id: row.template_id || 'modern',
      krw_change_percent: parseFloat(row.krw_change_percent || 0),
      fee_rate: parseFloat(row.fee_rate || 0),
    }));
  } catch (error) {
    console.error('센터별 입금액 조회 실패:', error);
    return [];
  }
}

/**
 * 전체 입금액 통계 (최적화 버전)
 */
export async function getTotalDepositStatsOptimized(): Promise<{
  todayDeposits: number;
  yesterdayDeposits: number;
}> {
  try {
    const { data, error } = await supabase
      .from('center_deposit_comparison')
      .select('krw_today, krw_yesterday');

    if (error) throw error;

    const totals = (data || []).reduce(
      (acc, row) => ({
        todayDeposits: acc.todayDeposits + parseFloat(row.krw_today || 0),
        yesterdayDeposits: acc.yesterdayDeposits + parseFloat(row.krw_yesterday || 0),
      }),
      { todayDeposits: 0, yesterdayDeposits: 0 }
    );

    return totals;
  } catch (error) {
    console.error('전체 입금액 조회 실패:', error);
    return { todayDeposits: 0, yesterdayDeposits: 0 };
  }
}

/**
 * Fallback: 뷰가 없을 때 기본 방식
 */
async function fallbackGetCenterDepositStats(): Promise<CenterDepositStats[]> {
  // 기존 depositHelpers의 getCenterDepositStats 로직
  try {
    const { data: centers } = await supabase
      .from('users')
      .select('user_id, center_name, username, template_id, fee_rate')
      .eq('role', 'center');

    if (!centers) return [];

    // 간단한 버전: 센터 자신의 입금만 집계
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const stats = await Promise.all(
      centers.map(async (center) => {
        // 오늘 입금 (krw_value 포함)
        const { data: todayDeposits } = await supabase
          .from('deposits')
          .select('krw_value, coin_type')
          .eq('user_id', center.user_id)
          .eq('status', 'confirmed')
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString());

        // 어제 입금 (krw_value 포함)
        const { data: yesterdayDeposits } = await supabase
          .from('deposits')
          .select('krw_value, coin_type')
          .eq('user_id', center.user_id)
          .eq('status', 'confirmed')
          .gte('created_at', yesterday.toISOString())
          .lt('created_at', today.toISOString());

        // 원화 환산 금액으로 집계
        const aggregateDeposits = (deposits: any[]) => {
          let krw = 0;  // KRW 스테이블코인 입금액 (원화)
          let coin = 0; // 기타 코인 입금액 (원화 환산)
          (deposits || []).forEach(d => {
            const krwValue = parseFloat(d.krw_value || 0);
            if (d.coin_type.toUpperCase().includes('KRW')) {
              krw += krwValue;
            } else {
              coin += krwValue;
            }
          });
          return { krw, coin };
        };

        const today_agg = aggregateDeposits(todayDeposits || []);
        const yesterday_agg = aggregateDeposits(yesterdayDeposits || []);

        return {
          center_id: center.user_id,
          center_name: center.center_name || center.username,
          krw_today: today_agg.krw,
          krw_yesterday: yesterday_agg.krw,
          coin_today: today_agg.coin,
          coin_yesterday: yesterday_agg.coin,
          template_id: center.template_id || 'modern',
          fee_rate: parseFloat(center.fee_rate || 0),
        };
      })
    );

    return stats;
  } catch (error) {
    console.error('Fallback 조회 실패:', error);
    return [];
  }
}

/**
 * 특정 기간의 센터별 입금액 추이
 */
export async function getCenterDepositTrend(
  centerId: string,
  days: number = 7
): Promise<Array<{
  date: string;
  krw_amount: number;
  coin_amount: number;
  total_deposits: number;
}>> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('center_daily_summary')
      .select('deposit_date, krw_amount, coin_amount, total_deposits')
      .eq('center_id', centerId)
      .gte('deposit_date', startDate.toISOString().split('T')[0])
      .order('deposit_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      date: row.deposit_date,
      krw_amount: parseFloat(row.krw_amount || 0),
      coin_amount: parseFloat(row.coin_amount || 0),
      total_deposits: parseInt(row.total_deposits || 0),
    }));
  } catch (error) {
    console.error('입금액 추이 조회 실패:', error);
    return [];
  }
}

/**
 * TOP 센터 조회 (입금액 기준)
 */
export async function getTopCentersByDeposits(limit: number = 10): Promise<CenterDepositStats[]> {
  try {
    const { data, error } = await supabase
      .from('center_deposit_comparison')
      .select('*')
      .order('krw_today', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(row => ({
      center_id: row.center_id,
      center_name: row.center_name,
      krw_today: parseFloat(row.krw_today || 0),
      krw_yesterday: parseFloat(row.krw_yesterday || 0),
      coin_today: parseFloat(row.coin_today || 0),
      coin_yesterday: parseFloat(row.coin_yesterday || 0),
      template_id: row.template_id || 'modern',
      krw_change_percent: parseFloat(row.krw_change_percent || 0),
      fee_rate: parseFloat(row.fee_rate || 0),
    }));
  } catch (error) {
    console.error('TOP 센터 조회 실패:', error);
    return [];
  }
}

/**
 * 센터별 입금 통계 (상세)
 */
export async function getCenterDepositDetails(centerId: string): Promise<{
  today: {
    krw: number;
    coin: number;
    count: number;
    unique_users: number;
  };
  yesterday: {
    krw: number;
    coin: number;
    count: number;
    unique_users: number;
  };
  change_percent: number;
}> {
  try {
    const { data, error } = await supabase
      .from('center_deposit_comparison')
      .select('*')
      .eq('center_id', centerId)
      .single();

    if (error) throw error;

    return {
      today: {
        krw: parseFloat(data.krw_today || 0),
        coin: parseFloat(data.coin_today || 0),
        count: parseInt(data.deposits_today || 0),
        unique_users: 0, // TODO: 뷰에서 가져오기
      },
      yesterday: {
        krw: parseFloat(data.krw_yesterday || 0),
        coin: parseFloat(data.coin_yesterday || 0),
        count: parseInt(data.deposits_yesterday || 0),
        unique_users: 0,
      },
      change_percent: parseFloat(data.krw_change_percent || 0),
    };
  } catch (error) {
    console.error('센터 상세 조회 실패:', error);
    return {
      today: { krw: 0, coin: 0, count: 0, unique_users: 0 },
      yesterday: { krw: 0, coin: 0, count: 0, unique_users: 0 },
      change_percent: 0,
    };
  }
}