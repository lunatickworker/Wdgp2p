import { useState, useEffect } from "react";
import { Shield, AlertTriangle, Activity, TrendingUp, RefreshCw, Eye, Ban, CheckCircle } from "lucide-react";
import { NeonCard } from "../NeonCard";
import { supabase } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface Transaction {
  tx_id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  coin_type: string;
  status: string;
  tx_hash?: string;
  created_at: string;
  risk_score?: number;
  is_suspicious?: boolean;
}

interface Alert {
  alert_id: string;
  user_id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  created_at: string;
  resolved: boolean;
}

export function SecurityMonitor() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTransactions24h: 0,
    suspiciousTransactions: 0,
    activeAlerts: 0,
    blockedUsers: 0
  });

  useEffect(() => {
    loadData();
    // 실시간 업데이트
    const interval = setInterval(loadData, 30000); // 30초마다
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTransactions(),
        loadAlerts(),
        loadStats()
      ]);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      // 최근 24시간 트랜잭션
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: deposits } = await supabase
        .from('deposits')
        .select('*, users!deposits_user_id_fkey(username, email)')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('*, users!withdrawals_user_id_fkey(username, email)')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(50);

      const allTxs = [
        ...(deposits || []).map(d => ({
          tx_id: d.deposit_id,
          user_id: d.user_id,
          type: 'deposit' as const,
          amount: parseFloat(d.amount),
          coin_type: d.coin_type,
          status: d.status,
          tx_hash: d.tx_hash,
          created_at: d.created_at,
          risk_score: calculateRiskScore(d),
          is_suspicious: false
        })),
        ...(withdrawals || []).map(w => ({
          tx_id: w.withdrawal_id,
          user_id: w.user_id,
          type: 'withdrawal' as const,
          amount: parseFloat(w.amount),
          coin_type: w.coin_type,
          status: w.status,
          tx_hash: w.tx_hash,
          created_at: w.created_at,
          risk_score: calculateRiskScore(w),
          is_suspicious: false
        }))
      ];

      // 위험도 순 정렬
      allTxs.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

      setTransactions(allTxs);
    } catch (error) {
      console.error('트랜잭션 로드 실패:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const { data } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(20);

      setAlerts(data || []);
    } catch (error) {
      console.error('알림 로드 실패:', error);
      // 테이블이 없으면 빈 배열
      setAlerts([]);
    }
  };

  const loadStats = async () => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [depositsCount, withdrawalsCount, suspendedUsers] = await Promise.all([
        supabase.from('deposits').select('deposit_id', { count: 'exact' }).gte('created_at', oneDayAgo),
        supabase.from('withdrawals').select('withdrawal_id', { count: 'exact' }).gte('created_at', oneDayAgo),
        supabase.from('users').select('user_id', { count: 'exact' }).eq('status', 'suspended')
      ]);

      setStats({
        totalTransactions24h: (depositsCount.count || 0) + (withdrawalsCount.count || 0),
        suspiciousTransactions: transactions.filter(t => (t.risk_score || 0) > 70).length,
        activeAlerts: alerts.filter(a => !a.resolved).length,
        blockedUsers: suspendedUsers.count || 0
      });
    } catch (error) {
      console.error('통계 로드 실패:', error);
    }
  };

  const calculateRiskScore = (tx: any): number => {
    let score = 0;

    // 금액 기반
    const amount = parseFloat(tx.amount);
    if (amount > 1000000) score += 30;
    else if (amount > 500000) score += 20;
    else if (amount > 100000) score += 10;

    // 상태 기반
    if (tx.status === 'failed') score += 20;

    // 시간 기반 (새벽 시간대)
    const hour = new Date(tx.created_at).getHours();
    if (hour >= 0 && hour <= 5) score += 15;

    return Math.min(score, 100);
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('alert_id', alertId);

      if (error) throw error;

      toast.success('알림이 해결되었습니다');
      loadAlerts();
    } catch (error: any) {
      console.error('알림 해결 실패:', error);
      toast.error(error.message || '알림 해결에 실패했습니다');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 50) return 'text-orange-400';
    if (score >= 30) return 'text-yellow-400';
    return 'text-green-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-cyan-400 mb-2">보안 모니터</h2>
          <p className="text-slate-400 text-sm">실시간 트랜잭션 모니터링 및 이상 거래 탐지</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <NeonCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">24시간 거래</p>
              <p className="text-white text-2xl">{stats.totalTransactions24h}</p>
            </div>
          </div>
        </NeonCard>

        <NeonCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">의심 거래</p>
              <p className="text-white text-2xl">{stats.suspiciousTransactions}</p>
            </div>
          </div>
        </NeonCard>

        <NeonCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">활성 알림</p>
              <p className="text-white text-2xl">{stats.activeAlerts}</p>
            </div>
          </div>
        </NeonCard>

        <NeonCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Ban className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">차단된 사용자</p>
              <p className="text-white text-2xl">{stats.blockedUsers}</p>
            </div>
          </div>
        </NeonCard>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <NeonCard>
          <div className="space-y-4">
            <h3 className="text-cyan-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              활성 보안 알림
            </h3>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.alert_id}
                  className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full border">
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(alert.created_at).toLocaleString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-sm mb-1">{alert.type}</p>
                      <p className="text-xs opacity-80">{alert.message}</p>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alert.alert_id)}
                      className="ml-4 p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                      title="해결됨으로 표시"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </NeonCard>
      )}

      {/* Recent Transactions */}
      <NeonCard>
        <div className="space-y-4">
          <h3 className="text-cyan-400 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            최근 트랜잭션 (위험도 순)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 text-sm">시간</th>
                  <th className="text-left py-3 px-4 text-slate-400 text-sm">유형</th>
                  <th className="text-left py-3 px-4 text-slate-400 text-sm">사용자</th>
                  <th className="text-right py-3 px-4 text-slate-400 text-sm">금액</th>
                  <th className="text-center py-3 px-4 text-slate-400 text-sm">위험도</th>
                  <th className="text-center py-3 px-4 text-slate-400 text-sm">상태</th>
                  <th className="text-center py-3 px-4 text-slate-400 text-sm">작업</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 20).map((tx) => (
                  <tr key={tx.tx_id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <span className="text-slate-400 text-sm">
                        {new Date(tx.created_at).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm px-2 py-1 rounded ${
                        tx.type === 'deposit' 
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.type === 'deposit' ? '입금' : '출금'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-400 text-sm font-mono">
                        {tx.user_id.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-white">
                        {tx.amount.toLocaleString()} {tx.coin_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`${getRiskColor(tx.risk_score || 0)}`}>
                        {tx.risk_score || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        tx.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : tx.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        className="p-1 text-cyan-400 hover:text-cyan-300"
                        title="상세보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </NeonCard>
    </div>
  );
}
