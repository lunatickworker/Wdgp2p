import { Building2, Globe, Users, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Search, Filter } from "lucide-react";
import { NeonCard } from "../NeonCard";
import { StatCard } from "../StatCard";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../utils/supabase/client";
import { getCenterDepositStatsOptimized, getTotalDepositStatsOptimized, CenterDepositStats } from "../../utils/depositHelpersOptimized";

interface MasterDashboardProps {
  onNavigate: (tab: string) => void;
}

interface CenterDeposit {
  center_id: string;
  center_name: string;
  krw_today: number;
  krw_yesterday: number;
  coin_today: number;
  coin_yesterday: number;
  template_id: string;
  fee_rate: number;
}

export function MasterDashboard({ onNavigate }: MasterDashboardProps) {
  const [stats, setStats] = useState({
    totalCenters: 0,
    totalDomains: 0,
    totalUsers: 0,
    todayDeposits: 0,
    yesterdayDeposits: 0,
  });
  const [centerDeposits, setCenterDeposits] = useState<CenterDeposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "krw" | "coin">("krw");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchStats();
    fetchCenterDeposits();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // 센터 수
      const { count: centersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'center');

      // 도메인 수
      const { count: domainsCount } = await supabase
        .from('domain_mappings')
        .select('*', { count: 'exact', head: true });

      // 전체 회원 수
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user');

      // 입금액 데이터
      const totalDepositStats = await getTotalDepositStatsOptimized();
      const todayDeposits = totalDepositStats.todayDeposits;
      const yesterdayDeposits = totalDepositStats.yesterdayDeposits;

      setStats({
        totalCenters: centersCount || 0,
        totalDomains: domainsCount || 0,
        totalUsers: usersCount || 0,
        todayDeposits,
        yesterdayDeposits,
      });
    } catch (error) {
      console.error('통계 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCenterDeposits = async () => {
    try {
      // 센터별 집계
      const centerDepositStats = await getCenterDepositStatsOptimized();
      setCenterDeposits(centerDepositStats);
    } catch (error) {
      console.error('센터별 입금액 조회 실패:', error);
    }
  };

  // 필터링 및 정렬
  const filteredAndSortedCenters = useMemo(() => {
    let result = [...centerDeposits];

    // 검색
    if (searchTerm) {
      result = result.filter(center =>
        center.center_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 정렬
    result.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === "name") {
        compareValue = a.center_name.localeCompare(b.center_name);
      } else if (sortBy === "krw") {
        compareValue = a.krw_today - b.krw_today;
      } else if (sortBy === "coin") {
        compareValue = a.coin_today - b.coin_today;
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return result;
  }, [centerDeposits, searchTerm, sortBy, sortOrder]);

  const handleSort = (column: "name" | "krw" | "coin") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const depositChange = stats.todayDeposits - stats.yesterdayDeposits;
  const depositChangePercent = stats.yesterdayDeposits > 0 
    ? ((depositChange / stats.yesterdayDeposits) * 100).toFixed(1)
    : "0.0";

  // 각 센터의 수수료율을 적용하여 총 수수료와 순수익 계산
  const calculateTotalFeeAndProfit = useMemo(() => {
    let totalFee = 0;
    
    centerDeposits.forEach(center => {
      const feeRate = (center.fee_rate || 0) / 100; // DB에 %로 저장되어 있으므로 소수로 변환
      totalFee += center.krw_today * feeRate;
    });
    
    const netProfit = stats.todayDeposits - totalFee;
    
    return {
      totalFee: Math.floor(totalFee),
      netProfit: Math.floor(netProfit)
    };
  }, [centerDeposits, stats.todayDeposits]);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 총 센터 카드 */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-6 hover:border-cyan-500/50 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">총 센터</p>
              <p className="text-cyan-400 text-2xl font-mono mb-2">{stats.totalCenters}</p>
              <p className="text-slate-500 text-xs">운영 중</p>
            </div>
          </div>
        </div>

        {/* 등록된 도메인 카드 */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/50 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Globe className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">등록된 도메인</p>
              <p className="text-purple-400 text-2xl font-mono">{stats.totalDomains}</p>
            </div>
          </div>
        </div>

        {/* 전체 회원 카드 */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-green-500/30 rounded-xl p-6 hover:border-green-500/50 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">전체 회원</p>
              <p className="text-green-400 text-2xl font-mono">{stats.totalUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* 일 총 입금액 카드 */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-orange-500/30 rounded-xl p-6 hover:border-orange-500/50 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                depositChange >= 0 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {depositChange >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{depositChangePercent}%</span>
              </div>
            </div>
            
            <div>
              <p className="text-slate-400 text-sm mb-1">일 총 입금액</p>
              <p className="text-orange-400 text-2xl font-mono mb-2">
                ₩{stats.todayDeposits.toLocaleString()}
              </p>
              <p className="text-slate-500 text-xs">
                전일: ₩{stats.yesterdayDeposits.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 순수익 요약 */}
      <NeonCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-cyan-400 mb-2">순수익 (수수료 제외)</h3>
            <p className="text-slate-500 text-sm">정산 관리에서 상세 내역을 확인할 수 있습니다</p>
          </div>
          <button
            onClick={() => onNavigate('settlement')}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors text-sm"
          >
            정산 관리 →
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 총 입금액 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/5 rounded-lg blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">총 입금액</p>
              <p className="text-white text-2xl font-mono mb-1">
                ₩{stats.todayDeposits.toLocaleString()}
              </p>
              <p className="text-slate-500 text-xs">오늘</p>
            </div>
          </div>
          
          {/* 총 수수료 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-500/10 rounded-lg blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative p-4 bg-slate-800/50 rounded-lg border border-amber-500/30">
              <p className="text-slate-400 text-sm mb-2">총 수수료</p>
              <p className="text-amber-400 text-2xl font-mono mb-1">
                ₩{calculateTotalFeeAndProfit.totalFee.toLocaleString()}
              </p>
              <p className="text-slate-500 text-xs">센터별 요율 적용</p>
            </div>
          </div>
          
          {/* 순수익 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 rounded-lg blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative p-4 bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 rounded-lg border-2 border-cyan-500/50">
              <p className="text-slate-400 text-sm mb-2">순수익</p>
              <p className="text-cyan-400 text-2xl font-mono mb-1">
                ₩{calculateTotalFeeAndProfit.netProfit.toLocaleString()}
              </p>
              <p className="text-cyan-500 text-xs">수수료 제외</p>
            </div>
          </div>
        </div>
      </NeonCard>



      {/* Quick Actions */}
      <NeonCard>
        <h3 className="text-cyan-400 mb-4">빠른 작업</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 센터 생성 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-cyan-500/10 rounded-lg blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <button
              onClick={() => onNavigate('centers')}
              className="relative w-full p-4 bg-slate-800/50 rounded-lg border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-slate-800 transition-all"
            >
              <Building2 className="w-8 h-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-slate-300">센터 생성</p>
              <p className="text-slate-500 text-sm">새로운 센터 추가</p>
            </button>
          </div>

          {/* 도메인 관리 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-500/10 rounded-lg blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <button
              onClick={() => onNavigate('domains')}
              className="relative w-full p-4 bg-slate-800/50 rounded-lg border border-purple-500/20 hover:border-purple-500/50 hover:bg-slate-800 transition-all"
            >
              <Globe className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-slate-300">도메인 관리</p>
              <p className="text-slate-500 text-sm">도메인 설정 및 관리</p>
            </button>
          </div>

          {/* 에이전시 관리 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-500/10 rounded-lg blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <button
              onClick={() => onNavigate('agencies')}
              className="relative w-full p-4 bg-slate-800/50 rounded-lg border border-green-500/20 hover:border-green-500/50 hover:bg-slate-800 transition-all"
            >
              <Users className="w-8 h-8 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-slate-300">에이전시 관리</p>
              <p className="text-slate-500 text-sm">에이전시 추가 및 관리</p>
            </button>
          </div>
        </div>
      </NeonCard>
    </div>
  );
}