import { useState, useEffect } from 'react';
import { History, Clock, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { NeonCard } from '../NeonCard';

interface FeeRateHistoryItem {
  store_id: string;
  store_name: string;
  old_rate: number | null;
  new_rate: number;
  changed_at: string;
  changed_by: string;
}

export function FeeRateHistoryViewer() {
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState<FeeRateHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStore, setFilterStore] = useState<string>('all');
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchFeeRateHistory();
  }, []);

  const fetchFeeRateHistory = async () => {
    try {
      setLoading(true);

      if (!user?.id) return;

      // 센터의 가맹점들 조회
      const { data: storesData, error: storesError } = await supabase
        .from('users')
        .select('user_id, username, center_name, metadata')
        .eq('role', 'store')
        .eq('parent_user_id', user.id)
        .eq('is_active', true);

      if (storesError) throw storesError;

      // 가맹점 목록 저장
      const storeList = (storesData || []).map(store => ({
        id: store.user_id,
        name: store.center_name || store.username
      }));
      setStores(storeList);

      // 각 가맹점의 수수료율 변경 이력 수집
      const allHistory: FeeRateHistoryItem[] = [];

      storesData?.forEach(store => {
        const feeRateHistory = store.metadata?.fee_rate_history || [];
        
        feeRateHistory.forEach((history: any) => {
          allHistory.push({
            store_id: store.user_id,
            store_name: store.center_name || store.username,
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
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = filterStore === 'all' 
    ? historyData 
    : historyData.filter(item => item.store_id === filterStore);

  if (loading) {
    return (
      <NeonCard>
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 mt-4">로딩 중...</p>
        </div>
      </NeonCard>
    );
  }

  if (historyData.length === 0) {
    return (
      <NeonCard>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h3 className="text-slate-300">수수료율 변경 이력</h3>
          </div>
        </div>
        <div className="p-8 text-center text-slate-400">
          수수료율 변경 이력이 없습니다
        </div>
      </NeonCard>
    );
  }

  return (
    <NeonCard>
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h3 className="text-slate-300">수수료율 변경 이력</h3>
            <span className="text-sm text-slate-500">
              ({filteredHistory.length}건)
            </span>
          </div>
          
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="all">전체 가맹점</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {filteredHistory.map((item, index) => {
          const isIncrease = item.old_rate !== null && item.new_rate > item.old_rate;
          const isDecrease = item.old_rate !== null && item.new_rate < item.old_rate;
          
          return (
            <div
              key={index}
              className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-cyan-500/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300">{item.store_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-400">
                    {new Date(item.changed_at).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {item.old_rate !== null ? (
                    <>
                      <span className="text-slate-500">{item.old_rate}%</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-cyan-400">{item.new_rate}%</span>
                      {isIncrease && (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <TrendingUp className="w-3 h-3" />
                          +{(item.new_rate - item.old_rate).toFixed(2)}%
                        </span>
                      )}
                      {isDecrease && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <TrendingDown className="w-3 h-3" />
                          {(item.new_rate - item.old_rate).toFixed(2)}%
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500">초기 설정</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-cyan-400">{item.new_rate}%</span>
                    </>
                  )}
                </div>

                <span className="text-xs text-slate-500">
                  변경자: {item.changed_by}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </NeonCard>
  );
}
