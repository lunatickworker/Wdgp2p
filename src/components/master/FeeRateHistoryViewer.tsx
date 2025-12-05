import { useState, useEffect, useMemo } from 'react';
import { History, Clock, Search, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { NeonCard } from '../NeonCard';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface FeeRateHistoryItem {
  center_id: string;
  center_name: string;
  old_rate: number | null;
  new_rate: number;
  changed_at: string;
  changed_by: string;
}

export function FeeRateHistoryViewer() {
  const [historyData, setHistoryData] = useState<FeeRateHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | '90days'>('30days');

  useEffect(() => {
    fetchFeeRateHistory();
  }, []);

  const fetchFeeRateHistory = async () => {
    try {
      setLoading(true);

      // 모든 센터 조회
      const { data: centers, error } = await supabase
        .from('users')
        .select('user_id, center_name, username, metadata')
        .eq('role', 'center')
        .eq('is_active', true);

      if (error) throw error;

      // 각 센터의 수수료율 변경 이력 수집
      const allHistory: FeeRateHistoryItem[] = [];

      centers?.forEach(center => {
        const feeRateHistory = center.metadata?.fee_rate_history || [];
        
        feeRateHistory.forEach((history: any) => {
          allHistory.push({
            center_id: center.user_id,
            center_name: center.center_name || center.username,
            old_rate: history.old_rate,
            new_rate: history.new_rate,
            changed_at: history.changed_at,
            changed_by: history.changed_by
          });
        });
      });

      // 시간순 정렬 (최신순)
      allHistory.sort((a, b) => 
        new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
      );

      setHistoryData(allHistory);
    } catch (error) {
      console.error('수수료율 변경 이력 조회 실패:', error);
      toast.error('수수료율 변경 이력을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 필터링
  const filteredHistory = useMemo(() => {
    let result = [...historyData];

    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.center_name.toLowerCase().includes(term)
      );
    }

    // 날짜 필터
    if (dateFilter !== 'all') {
      const now = new Date();
      const daysMap = { '7days': 7, '30days': 30, '90days': 90 };
      const days = daysMap[dateFilter];
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      result = result.filter(item =>
        new Date(item.changed_at) >= cutoffDate
      );
    }

    return result;
  }, [historyData, searchTerm, dateFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRateChangeColor = (oldRate: number | null, newRate: number) => {
    if (oldRate === null) return 'text-slate-400';
    if (newRate > oldRate) return 'text-red-400';
    if (newRate < oldRate) return 'text-green-400';
    return 'text-slate-400';
  };

  const getRateChangeIcon = (oldRate: number | null, newRate: number) => {
    if (oldRate === null) return null;
    if (newRate > oldRate) return <TrendingUp className="w-3 h-3 text-red-400" />;
    if (newRate < oldRate) return <TrendingDown className="w-3 h-3 text-green-400" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <NeonCard>
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <History className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-amber-400">수수료율 변경 이력</h3>
              <p className="text-slate-500 text-xs">전체 센터의 수수료율 변경 이력을 조회합니다</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="센터명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-cyan-500/50 w-64"
              />
            </div>

            {/* 날짜 필터 */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="pl-10 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
              >
                <option value="all">전체 기간</option>
                <option value="7days">최근 7일</option>
                <option value="30days">최근 30일</option>
                <option value="90days">최근 90일</option>
              </select>
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-slate-800/30 rounded-lg">
            <p className="text-slate-500 text-xs mb-1">전체 변경 횟수</p>
            <p className="text-white text-xl">{historyData.length}건</p>
          </div>
          <div className="p-3 bg-slate-800/30 rounded-lg">
            <p className="text-slate-500 text-xs mb-1">필터 적용 결과</p>
            <p className="text-cyan-400 text-xl">{filteredHistory.length}건</p>
          </div>
          <div className="p-3 bg-slate-800/30 rounded-lg">
            <p className="text-slate-500 text-xs mb-1">센터 수</p>
            <p className="text-amber-400 text-xl">
              {new Set(historyData.map(h => h.center_id)).size}개
            </p>
          </div>
        </div>
      </div>

      {/* 이력 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-slate-400 text-sm">변경 일시</th>
              <th className="text-left py-3 px-4 text-slate-400 text-sm">센터명</th>
              <th className="text-right py-3 px-4 text-slate-400 text-sm">변경 전</th>
              <th className="text-center py-3 px-4 text-slate-400 text-sm">→</th>
              <th className="text-right py-3 px-4 text-slate-400 text-sm">변경 후</th>
              <th className="text-right py-3 px-4 text-slate-400 text-sm">변경폭</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500">
                  {searchTerm || dateFilter !== 'all' 
                    ? '검색 결과가 없습니다' 
                    : '수수료율 변경 이력이 없습니다'}
                </td>
              </tr>
            ) : (
              filteredHistory.map((item, index) => {
                const rateChange = item.old_rate !== null 
                  ? (item.new_rate - item.old_rate).toFixed(2)
                  : null;

                return (
                  <tr
                    key={index}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-300 text-sm">
                          {formatDate(item.changed_at)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-white">{item.center_name}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-slate-400">
                        {item.old_rate !== null ? `${item.old_rate}%` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center">
                        {getRateChangeIcon(item.old_rate, item.new_rate)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={getRateChangeColor(item.old_rate, item.new_rate)}>
                        {item.new_rate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {rateChange !== null ? (
                        <span className={
                          parseFloat(rateChange) > 0 
                            ? 'text-red-400' 
                            : parseFloat(rateChange) < 0 
                            ? 'text-green-400' 
                            : 'text-slate-400'
                        }>
                          {parseFloat(rateChange) > 0 ? '+' : ''}
                          {rateChange}%p
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm">최초 설정</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </NeonCard>
  );
}
