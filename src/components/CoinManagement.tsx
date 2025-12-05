import { Plus, Edit, Trash2, CheckCircle, XCircle, Coins, TrendingUp, X, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { NeonCard } from "./NeonCard";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface CoinData {
  symbol: string; // PRIMARY KEY
  name: string;
  network: string;
  contract_address: string | null;
  decimals: number | null;
  chain_id: number | null;
  rpc_url: string | null;
  explorer_url: string | null;
  min_deposit: number | null;
  min_withdrawal: number | null;
  withdrawal_fee: number | null;
  is_active: boolean;
  icon_url?: string | null;
  created_at: string;
}

export function CoinManagement() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [isLoading, setIsLoading] = useState(false); // 즉시 UI 표시
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCoin, setEditingCoin] = useState<CoinData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    network: '',
    contract_address: '',
    decimals: '18',
    chain_id: '1',
    rpc_url: '',
    explorer_url: '',
    min_deposit: '0',
    min_withdrawal: '0',
    withdrawal_fee: '0',
    is_active: true,
    icon_url: ''
  });

  useEffect(() => {
    fetchCoins();

    // 실시간 업데이트
    const channel = supabase
      .channel('coin-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supported_tokens'
        },
        () => {
          fetchCoins();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCoins = async () => {
    const { data, error } = await supabase
      .from('supported_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCoins(data);
    }
    setIsLoading(false);
  };

  const handleAddCoin = async () => {
    if (!formData.symbol || !formData.name || !formData.network) {
      toast.error('필수 필드를 입력해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('supported_tokens')
        .insert({
          symbol: formData.symbol.toUpperCase(),
          name: formData.name,
          network: formData.network,
          contract_address: formData.contract_address || null,
          decimals: parseInt(formData.decimals),
          chain_id: parseInt(formData.chain_id),
          rpc_url: formData.rpc_url || null,
          explorer_url: formData.explorer_url || null,
          min_deposit: parseFloat(formData.min_deposit),
          min_withdrawal: parseFloat(formData.min_withdrawal),
          withdrawal_fee: parseFloat(formData.withdrawal_fee),
          is_active: formData.is_active,
          icon_url: formData.icon_url || null,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(`${formData.symbol} 코인이 추가되었습니다`);
      resetForm();
      setShowAddModal(false);
      fetchCoins();
    } catch (error: any) {
      console.error('Add coin error:', error);
      toast.error(error.message || '코인 추가 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCoin = async () => {
    if (!editingCoin) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('supported_tokens')
        .update({
          name: formData.name,
          network: formData.network,
          contract_address: formData.contract_address || null,
          decimals: parseInt(formData.decimals),
          chain_id: parseInt(formData.chain_id),
          rpc_url: formData.rpc_url || null,
          explorer_url: formData.explorer_url || null,
          min_deposit: parseFloat(formData.min_deposit),
          min_withdrawal: parseFloat(formData.min_withdrawal),
          withdrawal_fee: parseFloat(formData.withdrawal_fee),
          is_active: formData.is_active,
          icon_url: formData.icon_url || null
        })
        .eq('symbol', editingCoin.symbol);

      if (error) throw error;

      toast.success(`${editingCoin.symbol} 코인이 수정되었습니다`);
      resetForm();
      setEditingCoin(null);
      fetchCoins();
    } catch (error: any) {
      console.error('Update coin error:', error);
      toast.error(error.message || '코인 수정 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (coin: CoinData) => {
    const { error } = await supabase
      .from('supported_tokens')
      .update({ is_active: !coin.is_active })
      .eq('symbol', coin.symbol);

    if (!error) {
      toast.success(`${coin.symbol} ${!coin.is_active ? '활성화' : '비활성화'}되었습니다`);
      fetchCoins();
    } else {
      toast.error('상태 변경 실패');
    }
  };

  const handleDeleteCoin = async (coin: CoinData) => {
    if (!confirm(`정말 ${coin.symbol} 코인을 삭제하시겠습니까?\n\n⚠️ 경고: 이 코인으로 발행된 모든 사용자 지갑도 함께 삭제됩니다!`)) return;

    try {
      // 1. 먼저 해당 코인 타입의 지갑 개수 확인
      const { count: walletCount } = await supabase
        .from('wallets')
        .select('*', { count: 'exact', head: true })
        .eq('coin_type', coin.symbol);

      // 2. 해당 코인 타입의 모든 지갑 삭제
      const { error: walletError } = await supabase
        .from('wallets')
        .delete()
        .eq('coin_type', coin.symbol);

      if (walletError) throw walletError;

      // 3. 코인 삭제
      const { error: coinError } = await supabase
        .from('supported_tokens')
        .delete()
        .eq('symbol', coin.symbol);

      if (coinError) throw coinError;

      toast.success(`${coin.symbol} 코인과 관련 지갑 ${walletCount || 0}개가 삭제되었습니다`);
      fetchCoins();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('삭제 실패: ' + (error.message || '알 수 없는 오류'));
    }
  };

  const handleEdit = (coin: CoinData) => {
    setEditingCoin(coin);
    setFormData({
      symbol: coin.symbol || '',
      name: coin.name || '',
      network: coin.network || '',
      contract_address: coin.contract_address ?? '',
      decimals: (coin.decimals ?? 18).toString(),
      chain_id: (coin.chain_id ?? 1).toString(),
      rpc_url: coin.rpc_url ?? '',
      explorer_url: coin.explorer_url ?? '',
      min_deposit: (coin.min_deposit ?? 0).toString(),
      min_withdrawal: (coin.min_withdrawal ?? 0).toString(),
      withdrawal_fee: (coin.withdrawal_fee ?? 0).toString(),
      is_active: coin.is_active ?? true,
      icon_url: coin.icon_url ?? ''
    });
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      network: '',
      contract_address: '',
      decimals: '18',
      chain_id: '1',
      rpc_url: '',
      explorer_url: '',
      min_deposit: '0',
      min_withdrawal: '0',
      withdrawal_fee: '0',
      is_active: true,
      icon_url: ''
    });
  };

  // 기본 코인 추가
  const handleAddDefaultCoins = async () => {
    const defaultCoins = [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        network: 'Bitcoin',
        decimals: 8,
        chain_id: 0,
        min_deposit: 0.0001,
        min_withdrawal: 0.001,
        withdrawal_fee: 0.0005,
        is_active: true
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        network: 'Ethereum',
        decimals: 18,
        chain_id: 1,
        min_deposit: 0.01,
        min_withdrawal: 0.01,
        withdrawal_fee: 0.005,
        is_active: true
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        network: 'Ethereum (ERC-20)',
        contract_address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        decimals: 6,
        chain_id: 1,
        min_deposit: 10,
        min_withdrawal: 10,
        withdrawal_fee: 1,
        is_active: true
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        network: 'Ethereum (ERC-20)',
        contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        decimals: 6,
        chain_id: 1,
        min_deposit: 10,
        min_withdrawal: 10,
        withdrawal_fee: 1,
        is_active: true
      },
      {
        symbol: 'BNB',
        name: 'BNB',
        network: 'BNB Smart Chain',
        decimals: 18,
        chain_id: 56,
        min_deposit: 0.01,
        min_withdrawal: 0.01,
        withdrawal_fee: 0.005,
        is_active: true
      },
      {
        symbol: 'KRWQ',
        name: 'Korean Won Quantum',
        network: 'KRWQ Network',
        decimals: 18,
        chain_id: 12345,
        min_deposit: 1000,
        min_withdrawal: 1000,
        withdrawal_fee: 0,
        is_active: true
      }
    ];

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('supported_tokens')
        .insert(defaultCoins.map(coin => ({
          ...coin,
          created_at: new Date().toISOString()
        })));

      if (error) throw error;

      toast.success('기본 코인이 추가되었습니다');
      fetchCoins();
    } catch (error: any) {
      console.error('Add default coins error:', error);
      toast.error(error.message || '기본 코인 추가 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-cyan-400 mb-1">코인 관리</h2>
          <p className="text-slate-400 text-sm">지원 코인 추가 및 설정 관리</p>
        </div>
        <div className="flex gap-2">
          {coins.length === 0 && (
            <button
              onClick={handleAddDefaultCoins}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 hover:border-green-500/70 transition-all disabled:opacity-50"
            >
              <Coins className="w-4 h-4" />
              기본 코인 추가
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-500/70 transition-all"
          >
            <Plus className="w-4 h-4" />
            추가
          </button>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">총 코인</p>
            <p className="text-cyan-400 text-2xl">{coins.length}</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">활성화</p>
            <p className="text-green-400 text-2xl">{coins.filter(c => c.is_active).length}</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">비활성화</p>
            <p className="text-red-400 text-2xl">{coins.filter(c => !c.is_active).length}</p>
          </div>
        </div>
      </div>

      {/* 코인 목록 */}
      <div className="space-y-4">
        {coins.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <Coins className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">등록된 코인이 없습니다</p>
            <button
              onClick={handleAddDefaultCoins}
              disabled={isSubmitting}
              className="px-6 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-500/70 transition-all disabled:opacity-50"
            >
              기본 코인 추가하기
            </button>
          </div>
        ) : (
          coins.map((coin) => (
            <NeonCard key={coin.symbol}>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center overflow-hidden"
                      style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.6)' }}
                    >
                      {coin.icon_url ? (
                        <img 
                          src={coin.icon_url} 
                          alt={coin.symbol}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // 이미지 로드 실패시 텍스트로 폴백
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = document.createElement('span');
                            fallback.className = 'text-cyan-400 text-sm';
                            fallback.textContent = coin.symbol;
                            target.parentElement?.appendChild(fallback);
                          }}
                        />
                      ) : (
                        <span className="text-cyan-400 text-sm">{coin.symbol}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white">{coin.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${
                          coin.is_active
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {coin.is_active ? '활성' : '비활성'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm">{coin.network}</p>
                      {coin.contract_address && (
                        <p className="text-slate-500 text-xs font-mono mt-1">
                          {coin.contract_address.substring(0, 10)}...
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                  <div>
                    <p className="text-slate-500 text-xs mb-1">최소 입금</p>
                    <p className="text-white text-sm">{coin.min_deposit} {coin.symbol}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs mb-1">최소 출금</p>
                    <p className="text-white text-sm">{coin.min_withdrawal} {coin.symbol}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs mb-1">출금 수수료</p>
                    <p className="text-white text-sm">{coin.withdrawal_fee} {coin.symbol}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs mb-1">등록일</p>
                    <p className="text-white text-sm">{new Date(coin.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleEdit(coin)}
                    className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-500/70 transition-all text-sm flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    수정
                  </button>

                  <button
                    onClick={() => handleToggleActive(coin)}
                    className={`px-4 py-2 rounded-lg border text-sm flex items-center gap-2 transition-all ${
                      coin.is_active
                        ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-500/70'
                        : 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30 hover:border-green-500/70'
                    }`}
                  >
                    {coin.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    {coin.is_active ? '비활성화' : '활성화'}
                  </button>

                  <button
                    onClick={() => handleDeleteCoin(coin)}
                    className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-500/70 transition-all text-sm flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </button>
                </div>
              </div>
            </NeonCard>
          ))
        )}
      </div>

      {/* 코인 추가/수정 모달 */}
      {(showAddModal || editingCoin) && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-hidden"
          onClick={(e) => {
            // 바탕 클릭시 모달 닫기
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              setEditingCoin(null);
              resetForm();
            }
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[85vh]">
            {/* 모달 본체 */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden">
              {/* 헤더 */}
              <div className="flex items-center justify-between p-5 border-b border-cyan-500/20 bg-slate-900/50">
                <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  {editingCoin ? '코인 수정' : '새 코인 추가'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCoin(null);
                    resetForm();
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* 스크롤 영역 */}
              <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 mb-2 text-sm">심볼 *</label>
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      disabled={!!editingCoin}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all disabled:opacity-50"
                      placeholder="BTC"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-2 text-sm">이름 *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="Bitcoin"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-2 text-sm">네트워크 *</label>
                    <input
                      type="text"
                      value={formData.network}
                      onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="Bitcoin / Ethereum (ERC-20)"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-2 text-sm">컨트랙트 주소</label>
                    <input
                      type="text"
                      value={formData.contract_address}
                      onChange={(e) => setFormData({ ...formData, contract_address: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="0x..."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-2 text-sm">10진수</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.decimals}
                      onChange={(e) => setFormData({ ...formData, decimals: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="18"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-2 text-sm">체인 ID / 네트워크 *</label>
                    <input
                      type="text"
                      value={formData.chain_id}
                      onChange={(e) => setFormData({ ...formData, chain_id: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="1 (Ethereum) / 137 (Polygon)"
                    />
                    <p className="text-slate-500 text-xs mt-1">
                      EVM: 숫자 (1, 137 등) / Tron: 임의값 (권장: 728)
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-2 text-sm">RPC URL *</label>
                    <input
                      type="text"
                      value={formData.rpc_url}
                      onChange={(e) => setFormData({ ...formData, rpc_url: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="https://api.trongrid.io"
                    />
                    <p className="text-slate-500 text-xs mt-1">
                      Tron: trongrid.io 포함 시 자동 인식
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-2 text-sm">블록체인 탐색기 URL</label>
                    <input
                      type="text"
                      value={formData.explorer_url}
                      onChange={(e) => setFormData({ ...formData, explorer_url: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="https://etherscan.io/..."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-2 text-sm">최소 입금액</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.min_deposit}
                      onChange={(e) => setFormData({ ...formData, min_deposit: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-2 text-sm">최소 출금액</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.min_withdrawal}
                      onChange={(e) => setFormData({ ...formData, min_withdrawal: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-2 text-sm">출금 수수료</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.withdrawal_fee}
                      onChange={(e) => setFormData({ ...formData, withdrawal_fee: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-2 text-sm">활성 상태</label>
                    <select
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    >
                      <option value="true">활성화</option>
                      <option value="false">비활성화</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-300 mb-2 text-sm">심볼 URL</label>
                    <input
                      type="text"
                      value={formData.icon_url}
                      onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="https://example.com/icon.png"
                    />
                  </div>
                </div>
              </div>

              {/* 푸터 버튼 */}
              <div className="p-5 border-t border-cyan-500/20 bg-slate-900/50 flex gap-2">
                <button
                  onClick={editingCoin ? handleUpdateCoin : handleAddCoin}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-500/70 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{editingCoin ? '수정 중...' : '추가 중...'}</span>
                    </>
                  ) : (
                    <>
                      {editingCoin ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingCoin ? '수정' : '추가'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCoin(null);
                    resetForm();
                  }}
                  className="px-6 py-2.5 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-lg hover:border-slate-600/50 hover:bg-slate-700/50 transition-all"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}