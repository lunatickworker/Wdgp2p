import { useState, useEffect, useMemo } from "react";
import { TrendingUp, DollarSign, Calendar, Search, ArrowUpDown, Store } from "lucide-react";
import { NeonCard } from "../NeonCard";
import { StatCard } from "../StatCard";
import { supabase } from "../../utils/supabase/client";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner@2.0.3";
import { FeeRateHistoryViewer } from "./FeeRateHistoryViewer";

interface StoreSettlement {
  store_id: string;
  store_name: string;
  total_deposit: number;
  total_withdrawal: number;
  fee_rate: number;
  total_fee: number;
  net_profit: number;
  transaction_count: number;
}

interface DailySummary {
  date: string;
  total_deposit: number;
  total_fee: number;
  net_profit: number;
}

export function SettlementManagement() {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState<StoreSettlement[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "deposit" | "profit" | "fee">("deposit");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchSettlementData();
  }, [selectedDate]);

  const fetchSettlementData = async () => {
    try {
      setLoading(true);
      
      // 현재 센터의 가맹점들만 조회
      if (!user) {
        toast.error('인증되지 않은 사용자입니다');
        return;
      }

      const { data: stores, error: storesError } = await supabase
        .from('users')
        .select('user_id, center_name, username, fee_rate')
        .eq('role', 'store')
        .eq('parent_user_id', user.id)
        .eq('is_active', true);

      if (storesError) throw storesError;

      // 각 가맹점별 거래 데이터 조회 (임시 목업 데이터)
      const settlementData: StoreSettlement[] = stores?.map(store => {
        const totalDeposit = Math.floor(Math.random() * 5000000) + 500000;
        const totalWithdrawal = Math.floor(Math.random() * 4000000) + 300000;
        const feeRate = (store.fee_rate || 2.5) / 100; // 가맹점 기본 수수료 2.5%
        const totalFee = totalDeposit * feeRate;
        const netProfit = totalDeposit - totalFee;

        return {
          store_id: store.user_id,
          store_name: store.center_name || store.username,
          total_deposit: totalDeposit,
          total_withdrawal: totalWithdrawal,
          fee_rate: feeRate,
          total_fee: totalFee,
          net_profit: netProfit,
          transaction_count: Math.floor(Math.random() * 50) + 5
        };
      }) || [];

      setSettlements(settlementData);

      // 일별 요약 데이터 (최근 7일)
      const dailyData: DailySummary[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const totalDeposit = Math.floor(Math.random() * 30000000) + 5000000;
        const totalFee = totalDeposit * 0.025;
        
        dailyData.push({
          date: dateStr,
          total_deposit: totalDeposit,
          total_fee: totalFee,
          net_profit: totalDeposit - totalFee
        });
      }
      
      setDailySummaries(dailyData);
    } catch (error) {
      console.error('정산 데이터 조회 실패:', error);
      toast.error('정산 데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedSettlements = useMemo(() => {
    let result = [...settlements];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.store_name.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === "name") {
        compareValue = a.store_name.localeCompare(b.store_name);
      } else if (sortBy === "deposit") {
        compareValue = a.total_deposit - b.total_deposit;
      } else if (sortBy === "profit") {
        compareValue = a.net_profit - b.net_profit;
      } else if (sortBy === "fee") {
        compareValue = a.total_fee - b.total_fee;
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return result;
  }, [settlements, searchTerm, sortBy, sortOrder]);

  const handleSort = (column: "name" | "deposit" | "profit" | "fee") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const totalStats = useMemo(() => {
    return settlements.reduce(
      (acc, curr) => ({
        total_deposit: acc.total_deposit + curr.total_deposit,
        total_fee: acc.total_fee + curr.total_fee,
        net_profit: acc.net_profit + curr.net_profit,
        transaction_count: acc.transaction_count + curr.transaction_count
      }),
      { total_deposit: 0, total_fee: 0, net_profit: 0, transaction_count: 0 }
    );
  }, [settlements]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
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
          <h2 className="text-cyan-400 mb-2">정산 관리</h2>
          <p className="text-slate-400 text-sm">
            가맹점별 수수료 및 순수익 관리
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="총 입금액"
          value={formatCurrency(totalStats.total_deposit)}
          change={`${totalStats.transaction_count}건`}
          trend="up"
          icon={DollarSign}
          color="cyan"
        />
        
        <StatCard
          title="총 수수료"
          value={formatCurrency(totalStats.total_fee)}
          change="가맹점별 요율"
          trend="up"
          icon={DollarSign}
          color="amber"
        />
        
        <StatCard
          title="순수익"
          value={formatCurrency(totalStats.net_profit)}
          change="수수료 제외"
          trend="up"
          icon={TrendingUp}
          color="green"
        />
        
        <StatCard
          title="활성 가맹점"
          value={`${settlements.length}개`}
          change="정산 대상"
          trend="warning"
          icon={Store}
          color="purple"
        />
      </div>

      {/* 일별 추이 */}
      <NeonCard>
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-slate-300">최근 7일 정산 추이</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {dailySummaries.map((day) => (
              <div
                key={day.date}
                className="p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="text-xs text-slate-400 mb-2">
                  {new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-sm text-white mb-1">
                  {formatCurrency(day.total_deposit)}
                </div>
                <div className="text-xs text-cyan-400">
                  순수익: {formatCurrency(day.net_profit)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </NeonCard>

      {/* 가맹점별 정산 목록 */}
      <NeonCard>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-300">가맹점별 정산 내역</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="가맹점명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 text-sm">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                  >
                    가맹점명
                    {sortBy === "name" && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-slate-400 text-sm">
                  <button
                    onClick={() => handleSort("deposit")}
                    className="flex items-center gap-1 ml-auto hover:text-cyan-400 transition-colors"
                  >
                    총 입금액
                    {sortBy === "deposit" && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-slate-400 text-sm">수수료율</th>
                <th className="text-right py-3 px-4 text-slate-400 text-sm">
                  <button
                    onClick={() => handleSort("fee")}
                    className="flex items-center gap-1 ml-auto hover:text-cyan-400 transition-colors"
                  >
                    수수료
                    {sortBy === "fee" && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-slate-400 text-sm">
                  <button
                    onClick={() => handleSort("profit")}
                    className="flex items-center gap-1 ml-auto hover:text-cyan-400 transition-colors"
                  >
                    순수익
                    {sortBy === "profit" && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-slate-400 text-sm">거래건수</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedSettlements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    {searchTerm ? "검색 결과가 없습니다" : "정산 데이터가 없습니다"}
                  </td>
                </tr>
              ) : (
                filteredAndSortedSettlements.map((settlement) => (
                  <tr
                    key={settlement.store_id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-cyan-400" />
                        <span className="text-slate-300">{settlement.store_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-white">{formatCurrency(settlement.total_deposit)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-amber-400">{formatPercentage(settlement.fee_rate)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-amber-400">{formatCurrency(settlement.total_fee)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-cyan-400">{formatCurrency(settlement.net_profit)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-slate-400">{settlement.transaction_count.toLocaleString()}건</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredAndSortedSettlements.length > 0 && (
              <tfoot className="border-t-2 border-slate-600">
                <tr className="bg-slate-800/30">
                  <td className="py-3 px-4 text-cyan-400">합계</td>
                  <td className="py-3 px-4 text-right text-white">
                    {formatCurrency(totalStats.total_deposit)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">-</td>
                  <td className="py-3 px-4 text-right text-amber-400">
                    {formatCurrency(totalStats.total_fee)}
                  </td>
                  <td className="py-3 px-4 text-right text-cyan-400">
                    {formatCurrency(totalStats.net_profit)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">
                    {totalStats.transaction_count.toLocaleString()}건
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </NeonCard>

      {/* 수수료율 변경 이력 */}
      <FeeRateHistoryViewer />
    </div>
  );
}