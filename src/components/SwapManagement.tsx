import { useState, useEffect } from "react";
import { Search, Filter, CheckCircle, XCircle, Clock, Repeat, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, UserCircle } from "lucide-react";
import { NeonCard } from "./NeonCard";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface CoinSwap {
  swap_id: string;
  user_id: string;
  username: string;
  from_coin: string;
  to_coin: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  fee: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  completed_at?: string;
  method?: string;
  tx_hash?: string;
}

type SortField = 'created_at' | 'from_amount' | 'to_amount' | 'status' | 'username';
type SortDirection = 'asc' | 'desc';

export function SwapManagement() {
  const [swaps, setSwaps] = useState<CoinSwap[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [coinFilter, setCoinFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false); // 즉시 UI 표시
  
  // 정렬
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
  });

  useEffect(() => {
    fetchSwaps();
    fetchStats();

    // 실시간 업데이트
    const channel = supabase
      .channel('swap-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coin_swaps' }, () => {
        fetchSwaps();
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSwaps = async () => {
    try {
      const { data, error } = await supabase
        .from('coin_swaps')
        .select(`
          swap_id,
          user_id,
          from_coin,
          to_coin,
          from_amount,
          to_amount,
          exchange_rate,
          fee,
          status,
          created_at,
          completed_at,
          method,
          tx_hash,
          users!inner(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSwaps = data.map(swap => ({
        swap_id: swap.swap_id,
        user_id: swap.user_id,
        username: swap.users.username,
        from_coin: swap.from_coin,
        to_coin: swap.to_coin,
        from_amount: Number(swap.from_amount),
        to_amount: Number(swap.to_amount),
        exchange_rate: Number(swap.exchange_rate),
        fee: Number(swap.fee),
        status: swap.status,
        created_at: swap.created_at,
        completed_at: swap.completed_at,
        method: swap.method,
        tx_hash: swap.tx_hash
      }));

      setSwaps(formattedSwaps);
    } catch (error) {
      console.error('Swap fetch error:', error);
      toast.error('스왑 데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const { count: total } = await supabase
      .from('coin_swaps')
      .select('*', { count: 'exact', head: true });

    const { count: completed } = await supabase
      .from('coin_swaps')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    const { count: pending } = await supabase
      .from('coin_swaps')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'processing']);

    const { count: failed } = await supabase
      .from('coin_swaps')
      .select('*', { count: 'exact', head: true })
      .in('status', ['failed', 'cancelled']);

    setStats({
      total: total || 0,
      completed: completed || 0,
      pending: pending || 0,
      failed: failed || 0,
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Repeat className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': '대기 중',
      'processing': '처리 중',
      'completed': '완료',
      'failed': '실패',
      'cancelled': '취소됨'
    };
    return statusMap[status] || status;
  };

  // 필터링 및 검색
  const filteredSwaps = swaps.filter(swap => {
    const matchesStatus = statusFilter === "all" || swap.status === statusFilter;
    const matchesCoin = coinFilter === "all" || 
      swap.from_coin === coinFilter || 
      swap.to_coin === coinFilter;
    
    return matchesStatus && matchesCoin;
  });

  // 정렬
  const sortedSwaps = [...filteredSwaps].sort((a, b) => {
    let aVal: any, bVal: any;
    
    switch (sortField) {
      case 'username':
        aVal = a.username;
        bVal = b.username;
        break;
      case 'from_amount':
        aVal = a.from_amount;
        bVal = b.from_amount;
        break;
      case 'to_amount':
        aVal = a.to_amount;
        bVal = b.to_amount;
        break;
      case 'created_at':
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      default:
        aVal = a.created_at;
        bVal = b.created_at;
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 페이지네이션
  const totalPages = Math.ceil(sortedSwaps.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSwaps = sortedSwaps.slice(startIndex, endIndex);

  // 코인 종류 목록
  const uniqueCoins = Array.from(new Set([...swaps.map(s => s.from_coin), ...swaps.map(s => s.to_coin)]));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-cyan-400 mb-1">스왑 관리</h2>
        <p className="text-slate-400 text-sm">코인 교환 내역 관리 ({sortedSwaps.length}건)</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">전체 스왑</p>
            <p className="text-cyan-400 text-2xl">{stats.total}</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">완료</p>
            <p className="text-green-400 text-2xl">{stats.completed}</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">대기/처리 중</p>
            <p className="text-amber-400 text-2xl">{stats.pending}</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">실패/취소</p>
            <p className="text-red-400 text-2xl">{stats.failed}</p>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="사용자, 코인, TX 해시로 검색..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
        
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
          >
            <option value="all">전체 상태</option>
            <option value="pending">대기 중</option>
            <option value="processing">처리 중</option>
            <option value="completed">완료</option>
            <option value="failed">실패</option>
            <option value="cancelled">취소됨</option>
          </select>

          <select
            value={coinFilter}
            onChange={(e) => {
              setCoinFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
          >
            <option value="all">전체 코인</option>
            {uniqueCoins.map(coin => (
              <option key={coin} value={coin}>{coin}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 스왑 테이블 */}
      <div className="relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl opacity-20 blur"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700/50">
                <tr>
                  <th 
                    className="px-6 py-4 text-left text-slate-300 cursor-pointer hover:text-cyan-400 transition-colors"
                    onClick={() => handleSort('username')}
                  >
                    <div className="flex items-center gap-2">
                      사용자
                      {getSortIcon('username')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-slate-300">교환</th>
                  <th 
                    className="px-6 py-4 text-left text-slate-300 cursor-pointer hover:text-cyan-400 transition-colors"
                    onClick={() => handleSort('from_amount')}
                  >
                    <div className="flex items-center gap-2">
                      보낸 금액
                      {getSortIcon('from_amount')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-slate-300 cursor-pointer hover:text-cyan-400 transition-colors"
                    onClick={() => handleSort('to_amount')}
                  >
                    <div className="flex items-center gap-2">
                      받은 금액
                      {getSortIcon('to_amount')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-slate-300">환율</th>
                  <th className="px-6 py-4 text-left text-slate-300">수수료</th>
                  <th 
                    className="px-6 py-4 text-left text-slate-300 cursor-pointer hover:text-cyan-400 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      상태
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-slate-300 cursor-pointer hover:text-cyan-400 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-2">
                      생성일
                      {getSortIcon('created_at')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {currentSwaps.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      스왑 내역이 없습니다
                    </td>
                  </tr>
                ) : (
                  currentSwaps.map((swap) => (
                    <tr key={swap.swap_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center shrink-0"
                            style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.4)' }}
                          >
                            <UserCircle className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-200 text-sm truncate">{swap.username}</p>
                            <p className="text-slate-400 text-xs truncate">{swap.user_id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded text-sm">
                            {swap.from_coin}
                          </span>
                          <Repeat className="w-4 h-4 text-slate-400" />
                          <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded text-sm">
                            {swap.to_coin}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white">{swap.from_amount}</p>
                        <p className="text-xs text-slate-400">{swap.from_coin}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white">{swap.to_amount.toFixed(8)}</p>
                        <p className="text-xs text-slate-400">{swap.to_coin}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-300 text-sm">
                          {swap.exchange_rate.toFixed(8)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-orange-400">{swap.fee.toFixed(8)}</p>
                        <p className="text-xs text-slate-400">{swap.to_coin}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border ${
                          swap.status === 'completed'
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : swap.status === 'pending' || swap.status === 'processing'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {getStatusIcon(swap.status)}
                          {getStatusText(swap.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-300 text-sm">{new Date(swap.created_at).toLocaleDateString('ko-KR')}</p>
                        <p className="text-slate-500 text-xs">{new Date(swap.created_at).toLocaleTimeString('ko-KR')}</p>
                        {swap.completed_at && (
                          <p className="text-green-400 text-xs mt-1">
                            완료: {new Date(swap.completed_at).toLocaleTimeString('ko-KR')}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50 bg-slate-800/30">
              <div className="text-slate-400 text-sm">
                {sortedSwaps.length}개 중 {startIndex + 1}-{Math.min(endIndex, sortedSwaps.length)}개 표시
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[40px] h-10 px-3 rounded-lg transition-all ${
                            currentPage === page
                              ? 'bg-cyan-500 text-white'
                              : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="text-slate-500">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}