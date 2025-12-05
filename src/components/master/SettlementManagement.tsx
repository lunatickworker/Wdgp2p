import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Download, Search, Filter, ArrowUpDown, History, Clock } from "lucide-react";
import { NeonCard } from "../NeonCard";
import { supabase } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { FeeRateHistoryViewer } from "./FeeRateHistoryViewer";

interface CenterSettlement {
  center_id: string;
  center_name: string;
  total_deposit: number;
  total_withdrawal: number;
  fee_rate: number;
  total_fee: number;
  net_profit: number;
  transaction_count: number;
  last_settlement_date: string;
}

interface DailySummary {
  date: string;
  total_deposit: number;
  total_fee: number;
  net_profit: number;
  center_count: number;
}

export function SettlementManagement() {
  const [settlements, setSettlements] = useState<CenterSettlement[]>([]);
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
      
      // 센터별 정산 데이터 조회 (fee_rate 포함)
      const { data: centers, error: centersError } = await supabase
        .from('users')
        .select('user_id, center_name, username, fee_rate')
        .eq('role', 'center')
        .eq('is_active', true);

      if (centersError) throw centersError;

      // 각 센터별 거래 데이터 조회 (임시 목업 데이터)
      const settlementData: CenterSettlement[] = centers?.map(center => {
        // 실제로는 transactions 테이블에서 조회해야 함
        const totalDeposit = Math.floor(Math.random() * 10000000) + 1000000;
        const totalWithdrawal = Math.floor(Math.random() * 8000000) + 500000;
        const feeRate = (center.fee_rate || 3.0) / 100; // DB에 저장된 수수료율 (%, 소수로 변환)
        const totalFee = totalDeposit * feeRate;
        const netProfit = totalDeposit - totalFee;

        return {
          center_id: center.user_id,
          center_name: center.center_name || center.username,
          total_deposit: totalDeposit,
          total_withdrawal: totalWithdrawal,
          fee_rate: feeRate,
          total_fee: totalFee,
          net_profit: netProfit,
          transaction_count: Math.floor(Math.random() * 100) + 10,
          last_settlement_date: selectedDate
        };
      }) || [];

      setSettlements(settlementData);

      // 일별 요약 데이터 (최근 7일)
      const dailyData: DailySummary[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const totalDeposit = Math.floor(Math.random() * 50000000) + 10000000;
        const totalFee = totalDeposit * 0.03;
        
        dailyData.push({
          date: dateStr,
          total_deposit: totalDeposit,
          total_fee: totalFee,
          net_profit: totalDeposit - totalFee,
          center_count: settlementData.length
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

  // 필터링 및 정렬
  const filteredAndSortedSettlements = useMemo(() => {
    let result = [...settlements];

    // 검색
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.center_name.toLowerCase().includes(term)
      );
    }

    // 정렬
    result.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === "name") {
        compareValue = a.center_name.localeCompare(b.center_name);
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

  const handleExport = () => {
    toast.success('정산 데이터 내보내기 준비 중...');
    // CSV 내보내기 로직 추가
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
            센터별 수수료 및 순수익 관리
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            내보내기
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 총 입금액 */}
        <div className="relative group">
          <div className="absolute inset-0 bg-cyan-500/10 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-1">총 입금액</p>
            <p className="text-white text-2xl mb-2">
              {formatCurrency(totalStats.total_deposit)}
            </p>
            <p className="text-slate-500 text-xs">거래 {totalStats.transaction_count}건</p>
          </div>
        </div>

        {/* 총 수수료 */}
        <div className="relative group">
          <div className="absolute inset-0 bg-amber-500/10 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-amber-500/20 rounded-xl p-6 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-1">총 수수료</p>
            <p className="text-amber-400 text-2xl mb-2">
              {formatCurrency(totalStats.total_fee)}
            </p>
            <p className="text-slate-500 text-xs">센터별 요율 적용</p>
          </div>
        </div>

        {/* 순수익 */}
        <div className="relative group">
          <div className="absolute inset-0 bg-cyan-500/10 rounded-xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border-2 border-cyan-500/50 rounded-xl p-6 hover:border-cyan-500/70 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-1">순수익</p>
            <p className="text-cyan-400 text-2xl mb-2">
              {formatCurrency(totalStats.net_profit)}
            </p>
            <p className="text-cyan-500 text-xs">수수료 제외</p>
          </div>
        </div>

        {/* 활성 센터 */}
        <div className="relative group">
          <div className="absolute inset-0 bg-purple-500/10 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-1">활성 센터</p>
            <p className="text-white text-2xl mb-2">
              {settlements.length}개
            </p>
            <p className="text-slate-500 text-xs">정산 대상</p>
          </div>
        </div>
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

      {/* 센터별 정산 목록 */}
      <NeonCard>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-300">센터별 정산 내역</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="센터명 검색..."
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
                    센터명
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
                    key={settlement.center_id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="text-slate-300">{settlement.center_name}</span>
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