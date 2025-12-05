import { TrendingUp, TrendingDown, Users, AlertTriangle, Wallet, Activity } from "lucide-react";
import { NeonCard } from "./NeonCard";
import { StatCard } from "./StatCard";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase/client";
import { useAuth } from "../contexts/AuthContext";

interface Transaction {
  id: string;
  user: {
    username: string;
  };
  type: string;
  coin_type: string;
  amount: number;
  status: string;
  created_at: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    todayDeposits: 0,
    todayWithdrawals: 0,
    netProfit: 0,  // 순이익 (입금-출금)
    depositChange: 0,
    withdrawalChange: 0,
    userChange: 0
  });

  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [walletStatus, setWalletStatus] = useState({
    hotWallet: 0,
    coldWallet: 0,
    total: 0
  });
  const [loading, setLoading] = useState(false); // 즉시 UI 표시
  const [filteredUserIds, setFilteredUserIds] = useState<string[]>([]); // 필터링된 사용자 ID 목록
  const [coinIcons, setCoinIcons] = useState<Map<string, string>>(new Map());

  // 코인 아이콘 로드
  useEffect(() => {
    const fetchCoinIcons = async () => {
      try {
        const { data: coins } = await supabase
          .from('supported_tokens')
          .select('symbol, icon_url');
        
        if (coins) {
          const iconMap = new Map<string, string>();
          coins.forEach((coin: any) => {
            if (coin.icon_url) {
              iconMap.set(coin.symbol, coin.icon_url);
            }
          });
          setCoinIcons(iconMap);
        }
      } catch (error) {
        console.error('Error fetching coin icons:', error);
      }
    };

    fetchCoinIcons();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    fetchDashboardData();

    // 실시간 업데이트 설정
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // 1. 먼저 필터링된 사용자 목록 가져오기
      const userIds = await fetchFilteredUsers();
      
      // 2. 통계 데이터 가져오기 (userIds 전달)
      await Promise.all([
        fetchUserStats(userIds),
        fetchTransactionStats(userIds),
        fetchRecentTransactions(userIds),
        fetchWalletStatus(userIds)
      ]);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredUsers = async (): Promise<string[]> => {
    try {
      console.log('🔍 Fetching filtered users for dashboard...');
      
      // Backend API로 필터링된 사용자 목록 가져오기
      const backendUrl = 'https://mzoeeqmtvlnyonicycvg.supabase.co/functions/v1/make-server-b6d5667f';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b2VlcW10dmxueW9uaWN5Y3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjIyNzcsImV4cCI6MjA3ODQ5ODI3N30.oo7FsWjthtBtM-Xa1VFJieMGQ4mG__V8w7r9qGBPzaI';
      
      const response = await fetch(`${backendUrl}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          'X-User-Email': user?.email || '',
          'X-User-Role': user?.role || '',
          'X-User-Id': user?.id || ''
        }
      });
      
      // 응답 상태 확인
      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, response.statusText);
        const text = await response.text();
        console.error('Response body:', text);
        setFilteredUserIds([]);
        return [];
      }

      // Content-Type 확인
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Invalid content-type:', contentType);
        const text = await response.text();
        console.error('Response body:', text);
        setFilteredUserIds([]);
        return [];
      }

      const result = await response.json();
      
      if (result.success && result.users) {
        const userIds = result.users.map((u: any) => u.user_id);
        console.log('✅ Filtered user IDs for dashboard:', userIds.length);
        setFilteredUserIds(userIds);
        return userIds;
      } else {
        console.error('❌ Failed to fetch filtered users:', result);
        setFilteredUserIds([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching filtered users:', error);
      setFilteredUserIds([]);
      return [];
    }
  };

  const fetchUserStats = async (userIds: string[]) => {
    if (userIds.length === 0) {
      setStats(prev => ({ ...prev, totalUsers: 0, userChange: 0 }));
      return;
    }

    // 필터링된 사용자 중 role='user'인 일반 사용자만 카운트 (관리자 제외)
    const { data: regularUsers } = await supabase
      .from('users')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .eq('role', 'user');
    
    const totalUsers = regularUsers?.length || 0;

    // 이전 달 일반 사용자 수
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const { count: lastMonthUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('user_id', userIds)
      .eq('role', 'user')
      .lte('created_at', lastMonth.toISOString());

    const userChange = totalUsers && lastMonthUsers 
      ? ((totalUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(1)
      : 0;

    setStats(prev => ({ ...prev, totalUsers: totalUsers || 0, userChange: Number(userChange) }));
  };

  const fetchTransactionStats = async (userIds: string[]) => {
    if (userIds.length === 0) {
      setStats(prev => ({
        ...prev,
        todayDeposits: 0,
        todayWithdrawals: 0,
        netProfit: 0,  // 순이익 (입금-출금)
        depositChange: 0,
        withdrawalChange: 0
      }));
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 오늘 입금 (필터링된 사용자만)
    const { data: todayDepositsData } = await supabase
      .from('deposits')
      .select('amount')
      .in('user_id', userIds)
      .eq('status', 'confirmed')
      .gte('created_at', today.toISOString());

    const todayDepositsTotal = todayDepositsData?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

    // 어제 입금 (필터링된 사용자만)
    const { data: yesterdayDepositsData } = await supabase
      .from('deposits')
      .select('amount')
      .in('user_id', userIds)
      .eq('status', 'confirmed')
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString());

    const yesterdayDepositsTotal = yesterdayDepositsData?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

    const depositChange = yesterdayDepositsTotal > 0
      ? ((todayDepositsTotal - yesterdayDepositsTotal) / yesterdayDepositsTotal * 100).toFixed(1)
      : 0;

    // 오늘 출금 (필터링된 사용자만)
    const { data: todayWithdrawalsData } = await supabase
      .from('withdrawals')
      .select('amount')
      .in('user_id', userIds)
      .in('status', ['completed', 'processing'])
      .gte('created_at', today.toISOString());

    const todayWithdrawalsTotal = todayWithdrawalsData?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

    // 어제 출금 (필터링된 사용자만)
    const { data: yesterdayWithdrawalsData } = await supabase
      .from('withdrawals')
      .select('amount')
      .in('user_id', userIds)
      .in('status', ['completed', 'processing'])
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString());

    const yesterdayWithdrawalsTotal = yesterdayWithdrawalsData?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

    const withdrawalChange = yesterdayWithdrawalsTotal > 0
      ? ((todayWithdrawalsTotal - yesterdayWithdrawalsTotal) / yesterdayWithdrawalsTotal * 100).toFixed(1)
      : 0;

    // 순이익 계산 (입금 - 출금)
    const netProfit = todayDepositsTotal - todayWithdrawalsTotal;

    setStats(prev => ({
      ...prev,
      todayDeposits: todayDepositsTotal,
      todayWithdrawals: todayWithdrawalsTotal,
      netProfit: netProfit,
      depositChange: Number(depositChange),
      withdrawalChange: Number(withdrawalChange)
    }));
  };

  const fetchRecentTransactions = async (userIds: string[]) => {
    if (userIds.length === 0) {
      setRecentTransactions([]);
      return;
    }

    // 입금과 출금을 합쳐서 최근 5개 가져오기 (필터링된 사용자만)
    const { data: deposits } = await supabase
      .from('deposits')
      .select(`
        deposit_id,
        coin_type,
        amount,
        status,
        created_at,
        users!inner(username)
      `)
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .limit(3);

    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select(`
        withdrawal_id,
        coin_type,
        amount,
        status,
        created_at,
        users!inner(username)
      `)
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .limit(3);

    // 합치고 정렬
    const allTransactions = [
      ...(deposits?.map(d => ({
        id: d.deposit_id,
        user: { username: d.users.username },
        type: 'deposit',
        coin_type: d.coin_type,
        amount: Number(d.amount),
        status: d.status,
        created_at: d.created_at
      })) || []),
      ...(withdrawals?.map(w => ({
        id: w.withdrawal_id,
        user: { username: w.users.username },
        type: 'withdrawal',
        coin_type: w.coin_type,
        amount: Number(w.amount),
        status: w.status,
        created_at: w.created_at
      })) || [])
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

    setRecentTransactions(allTransactions);
  };

  const fetchWalletStatus = async (userIds: string[]) => {
    if (userIds.length === 0) {
      setWalletStatus({
        hotWallet: 0,
        coldWallet: 0,
        total: 0
      });
      return;
    }

    console.log('💰 Fetching wallet status for filtered users:', userIds.length);

    // Hot Wallet 잔액 (필터링된 사용자만)
    const { data: hotWallets } = await supabase
      .from('wallets')
      .select('balance, user_id')
      .in('user_id', userIds)
      .eq('wallet_type', 'hot');

    const hotWalletTotal = hotWallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0;
    console.log('🔥 Hot Wallet Total:', hotWalletTotal, 'from', hotWallets?.length, 'wallets');

    // Cold Wallet 잔액 (필터링된 사용자만)
    const { data: coldWallets } = await supabase
      .from('wallets')
      .select('balance, user_id')
      .in('user_id', userIds)
      .eq('wallet_type', 'cold');

    const coldWalletTotal = coldWallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0;
    console.log('❄️ Cold Wallet Total:', coldWalletTotal, 'from', coldWallets?.length, 'wallets');

    const total = hotWalletTotal + coldWalletTotal;
    console.log('📊 Total Wallet Balance:', total);

    setWalletStatus({
      hotWallet: hotWalletTotal,
      coldWallet: coldWalletTotal,
      total
    });
  };

  const formatCurrency = (amount: number) => {
    // DB의 balance는 이미 원화 금액이므로 그대로 표시
    return `₩${amount.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(2);
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date().getTime();
    const time = new Date(dateString).getTime();
    const diff = Math.floor((now - time) / 1000 / 60); // minutes

    if (diff < 1) return '방금 전';
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    return `${Math.floor(diff / 1440)}일 전`;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'confirmed': '완료',
      'completed': '완료',
      'pending': '대기',
      'processing': '처리중',
      'failed': '실패',
      'rejected': '거부됨'
    };
    return statusMap[status] || status;
  };

  const statsCards = [
    {
      title: "총 사용자",
      value: stats.totalUsers.toLocaleString(),
      change: `${stats.userChange >= 0 ? '+' : ''}${stats.userChange}%`,
      trend: stats.userChange >= 0 ? "up" : "down",
      icon: Users,
      color: "cyan"
    },
    {
      title: "오늘 입금",
      value: formatCurrency(stats.todayDeposits),
      change: `${stats.depositChange >= 0 ? '+' : ''}${stats.depositChange}%`,
      trend: stats.depositChange >= 0 ? "up" : "down",
      icon: TrendingUp,
      color: "green"
    },
    {
      title: "오늘 출금",
      value: formatCurrency(stats.todayWithdrawals),
      change: `${stats.withdrawalChange >= 0 ? '+' : ''}${stats.withdrawalChange}%`,
      trend: stats.withdrawalChange >= 0 ? "up" : "down",
      icon: TrendingDown,
      color: "purple"
    },
    {
      title: "순이익",
      value: formatCurrency(stats.netProfit),
      change: "계산 필요",
      trend: "warning",
      icon: AlertTriangle,
      color: "amber"
    }
  ];

  const hotWalletPercentage = walletStatus.total > 0 
    ? Math.round((walletStatus.hotWallet / walletStatus.total) * 100) 
    : 0;
  const coldWalletPercentage = walletStatus.total > 0 
    ? Math.round((walletStatus.coldWallet / walletStatus.total) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-cyan-400 mb-1">시스템 대시보드</h2>
        <p className="text-slate-400 text-sm">실시간 운영 현황 모니터링</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <NeonCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h3 className="text-slate-200">최근 거래</h3>
            </div>
            <button className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
              전체보기
            </button>
          </div>

          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tx.type === "deposit" 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-purple-500/20 text-purple-400"
                  }`}>
                    {tx.coin_type}
                  </div>
                  <div>
                    <p className="text-slate-300 text-sm">{tx.user.username}</p>
                    <p className="text-slate-500 text-xs">{tx.id}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-sm ${
                    tx.type === "deposit" ? "text-green-400" : "text-purple-400"
                  }`}>
                    {tx.type === "deposit" ? "+" : "-"}{formatAmount(tx.amount)} {tx.coin_type}
                  </p>
                  <p className="text-slate-500 text-xs">{getTimeAgo(tx.created_at)}</p>
                </div>

                <div>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    tx.status === "confirmed" || tx.status === "completed"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : tx.status === "pending"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  }`}>
                    {getStatusLabel(tx.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </NeonCard>

        {/* Wallet Status */}
        <NeonCard>
          <div className="flex items-center gap-2 mb-6">
            <Wallet className="w-5 h-5 text-cyan-400" />
            <h3 className="text-slate-200">지갑 현황</h3>
          </div>

          <div className="space-y-6">
            {[
              { type: "Hot Wallet", balance: walletStatus.hotWallet, percentage: hotWalletPercentage },
              { type: "Cold Wallet", balance: walletStatus.coldWallet, percentage: coldWalletPercentage }
            ].map((wallet, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">{wallet.type}</span>
                  <span className="text-slate-200">{formatCurrency(wallet.balance)}</span>
                </div>
                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${wallet.type === "Hot Wallet" ? "from-orange-500 to-red-500" : "from-cyan-500 to-blue-500"} rounded-full shadow-lg`}
                    style={{ width: `${wallet.percentage}%` }}
                  ></div>
                </div>
                <p className="text-slate-500 text-xs mt-1">{wallet.percentage}% of total</p>
              </div>
            ))}

            <div className="pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">총 보유액</span>
                <span className="text-cyan-400">{formatCurrency(walletStatus.total)}</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-slate-300 text-sm">시스템 상태</span>
              </div>
              <p className="text-slate-400 text-xs">모든 노드 정상 작동 중</p>
            </div>
          </div>
        </NeonCard>
      </div>
    </div>
  );
}