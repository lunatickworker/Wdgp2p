import { useState, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Screen, WalletData, CoinType } from '../App';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface TransferRequestProps {
  wallets: WalletData[];
  selectedCoin: CoinType;
  onNavigate: (screen: Screen) => void;
  onSelectCoin: (coin: CoinType) => void;
}

interface TransferRequestRecord {
  request_id: string;
  coin_type: string;
  amount: number;
  status: string;
  created_at: string;
  admin_note?: string;
  approved_at?: string;
}

export function TransferRequest({ wallets, selectedCoin, onNavigate, onSelectCoin }: TransferRequestProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState<TransferRequestRecord[]>([]);
  const [availableCoins, setAvailableCoins] = useState<string[]>([]);
  const [isLoadingCoins, setIsLoadingCoins] = useState(true);

  // DB에서 활성화된 코인 목록 조회
  useEffect(() => {
    fetchAvailableCoins();

    // 실시간 업데이트 - 코인 목록 변경 감지
    const coinsChannel = supabase
      .channel('supported-tokens-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supported_tokens'
        },
        () => {
          fetchAvailableCoins();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(coinsChannel);
    };
  }, []);

  // 내 요청 내역 조회
  useEffect(() => {
    fetchMyRequests();

    // 실시간 업데이트
    const channel = supabase
      .channel('my-transfer-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfer_requests',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && (payload.new as any).status === 'approved') {
            toast.success('전송 요청이 승인되었습니다!');
          } else if (payload.eventType === 'UPDATE' && (payload.new as any).status === 'rejected') {
            toast.error('전송 요청이 거부되었습니다');
          }
          fetchMyRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchAvailableCoins = async () => {
    setIsLoadingCoins(true);
    const { data, error } = await supabase
      .from('supported_tokens')
      .select('symbol')
      .eq('is_active', true)
      .order('symbol', { ascending: true });

    if (!error && data) {
      const coins = data.map((coin: any) => coin.symbol);
      setAvailableCoins(coins);
      
      // 선택된 코인이 목록에 없으면 첫 번째 코인으로 변경
      if (coins.length > 0 && !coins.includes(selectedCoin)) {
        onSelectCoin(coins[0] as CoinType);
      }
    } else {
      toast.error('코인 목록을 불러오는데 실패했습니다');
    }
    setIsLoadingCoins(false);
  };

  const fetchMyRequests = async () => {
    const { data } = await supabase
      .from('transfer_requests')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setRequests(data as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('유효한 금액을 입력해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      // 사용자 지갑 찾기
      const { data: walletData } = await supabase
        .from('wallets')
        .select('wallet_id')
        .eq('user_id', user?.id)
        .eq('coin_type', selectedCoin)
        .single();

      if (!walletData) {
        throw new Error('지갑을 찾을 수 없습니다');
      }

      // 전송 요청 생성
      const { error } = await supabase
        .from('transfer_requests')
        .insert({
          user_id: user?.id,
          wallet_id: walletData.wallet_id,
          coin_type: selectedCoin,
          amount: parseFloat(amount),
          status: 'pending',
          user_note: note || null
        });

      if (error) throw error;

      toast.success('전송 요청이 생성되었습니다');
      setAmount('');
      setNote('');
      fetchMyRequests();
    } catch (error: any) {
      console.error('Request error:', error);
      toast.error(error.message || '요청 생성 실패');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            승인 대기
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle2 className="w-3 h-3" />
            승인됨
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" />
            거부됨
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate('home')}
          className="lg:hidden w-10 h-10 rounded-full bg-slate-800 border border-cyan-500/30 flex items-center justify-center hover:border-cyan-500/50 transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-cyan-400" />
        </button>
        <div>
          <h2 className="text-white text-xl lg:text-2xl">코인 구매 요청</h2>
          <p className="text-slate-400 text-sm">관리자 승인 후 지갑에 입금됩니다</p>
        </div>
      </div>

      {/* 요청 폼 */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 코인 선택 */}
        <div>
          <label className="block text-slate-300 mb-3">코인 선택</label>
          {isLoadingCoins ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : availableCoins.length === 0 ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
              <p className="text-amber-400 text-sm">현재 이용 가능한 코인이 없습니다</p>
              <p className="text-amber-300 text-xs mt-1">관리자에게 문의하세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableCoins.map((coin) => (
                <button
                  key={coin}
                  type="button"
                  onClick={() => onSelectCoin(coin as CoinType)}
                  className={`p-3 rounded-xl border-2 transition-all active:scale-95 ${
                    selectedCoin === coin
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="text-center">
                    <p className={`text-sm ${selectedCoin === coin ? 'text-cyan-400' : 'text-slate-400'}`}>
                      {coin}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 금액 입력 */}
        <div>
          <label className="block text-slate-300 mb-2">요청 금액</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-4 py-4 bg-slate-800 border border-cyan-500/30 rounded-xl text-white text-lg focus:outline-none focus:border-cyan-500/50 transition-all"
              required
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400">
              {selectedCoin}
            </div>
          </div>
        </div>

        {/* 메모 (선택사항) */}
        <div>
          <label className="block text-slate-300 mb-2">메모 (선택사항)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="요청 사유를 입력하세요 (예: KRWQ 구매)"
            rows={3}
            className="w-full px-4 py-3 bg-slate-800 border border-cyan-500/30 rounded-xl text-white text-sm resize-none focus:outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isSubmitting || !amount || parseFloat(amount) <= 0 || availableCoins.length === 0}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl hover:from-cyan-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              요청 중...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              요청 보내기
            </>
          )}
        </button>
      </form>

      {/* 안내 */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
        <h3 className="text-cyan-400 text-sm mb-2">이용 안내</h3>
        <div className="space-y-1 text-xs text-cyan-300">
          <p>• 요청 후 관리자 승인이 필요합니다</p>
          <p>• 승인되면 자동으로 지갑에 입금됩니다</p>
          <p>• 실시간으로 승인 상태를 확인할 수 있습니다</p>
          <p>• 거부된 경우 사유를 확인하세요</p>
        </div>
      </div>

      {/* 내 요청 내역 */}
      {requests.length > 0 && (
        <div>
          <h3 className="text-white mb-3">최근 요청 내역</h3>
          <div className="space-y-2">
            {requests.map((request) => (
              <div
                key={request.request_id}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white">{request.amount} {request.coin_type}</span>
                    {getStatusBadge(request.status)}
                  </div>
                </div>
                
                <div className="text-xs text-slate-400 space-y-1">
                  <div>요청일: {new Date(request.created_at).toLocaleString('ko-KR')}</div>
                  {request.approved_at && (
                    <div>처리일: {new Date(request.approved_at).toLocaleString('ko-KR')}</div>
                  )}
                  {request.admin_note && (
                    <div className="mt-2 p-2 bg-slate-900/50 rounded text-slate-300">
                      관리자 메모: {request.admin_note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
