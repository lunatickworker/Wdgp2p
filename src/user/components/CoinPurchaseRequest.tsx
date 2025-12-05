import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X, Send, Info } from 'lucide-react';
import { Screen, CoinType, WalletData } from '../App';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface CoinPurchaseRequestProps {
  wallets: WalletData[];
  selectedCoin: CoinType;
  onNavigate: (screen: Screen) => void;
  onSelectCoin: (coin: CoinType) => void;
}

const QUICK_AMOUNTS = [
  { value: 10000, label: '1만' },
  { value: 30000, label: '3만' },
  { value: 50000, label: '5만' },
  { value: 100000, label: '10만' },
  { value: 1000000, label: '100만' },
  { value: 3000000, label: '300만' },
  { value: 5000000, label: '500만' },
  { value: 10000000, label: '1000만' },
];

export function CoinPurchaseRequest({ 
  wallets, 
  selectedCoin, 
  onNavigate, 
  onSelectCoin 
}: CoinPurchaseRequestProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(0);
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountVerified, setAccountVerified] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 페이지 진입 시 계좌 인증 상태 확인
  useEffect(() => {
    checkAccountVerification();
    onSelectCoin('KRWQ');
  }, []);

  const checkAccountVerification = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('account_verification_status')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setAccountVerified(data.account_verification_status === 'verified');
    } catch (error) {
      console.error('Verification check error:', error);
      setAccountVerified(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 단축 버튼 클릭 (누적 덧셈)
  const handleQuickAmount = (quickAmount: number) => {
    setAmount(prev => prev + quickAmount);
  };

  // 전체 삭제
  const handleClearAmount = () => {
    setAmount(0);
  };

  // 요청 제출
  const handleSubmit = async () => {
    if (!amount || amount <= 0) {
      toast.error('유효한 금액을 입력해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 사용자의 해당 코인 지갑 찾기
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('wallet_id')
        .eq('user_id', user?.id)
        .eq('coin_type', selectedCoin)
        .single();

      if (walletError || !walletData) {
        throw new Error('지갑을 찾을 수 없습니다. 먼저 지갑을 생성해주세요.');
      }

      // 2. transfer_requests 테이블에 코인 구매 요청 생성
      const { error } = await supabase
        .from('transfer_requests')
        .insert({
          user_id: user?.id,
          wallet_id: walletData.wallet_id,
          coin_type: selectedCoin,
          amount: amount,
          request_type: 'purchase',
          status: 'pending',
          memo: memo || null,
        });

      if (error) throw error;

      toast.success('코인 구매 요청이 접수되었습니다');
      setAmount(0);
      setMemo('');
      
      setTimeout(() => {
        onNavigate('home');
      }, 1500);

    } catch (error: any) {
      console.error('Purchase request error:', error);
      toast.error(error.message || '요청 처리 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => onNavigate('home')}
          className="lg:hidden w-10 h-10 rounded-full bg-slate-800/50 border border-cyan-500/30 flex items-center justify-center hover:bg-cyan-500/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-cyan-400" />
        </button>
        <div>
          <h1 className="text-white text-xl lg:text-2xl">코인 구매 요청</h1>
          <p className="text-slate-400 text-sm">관리자 승인 후 지갑에 입금됩니다</p>
        </div>
      </div>

      {/* 로딩 중 */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">계좌 인증 상태 확인 중...</p>
        </div>
      )}

      {/* 계좌 인증이 안 된 경우 */}
      {!isLoading && accountVerified === false && (
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/30 to-orange-500/30 rounded-xl blur"></div>
          <div className="relative bg-slate-800/90 border-2 border-red-500/50 rounded-2xl p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-white text-xl mb-3">계좌 인증이 필요합니다</h3>
              <p className="text-slate-300 mb-6">
                코인 구매 요청을 하려면 먼저 1원 인증을 완료해주세요.
              </p>
              <button
                onClick={() => onNavigate('settings')}
                className="px-6 py-3 bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-all"
              >
                설정으로 이동하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 인증 완료된 경우 - 정상 UI */}
      {!isLoading && accountVerified === true && (
        <>
          {/* 코인 선택 */}
          <div>
            <label className="block text-slate-300 mb-3">코인 선택</label>
            <div className="grid grid-cols-2 gap-3">
              {(['KRWQ', 'USDT'] as CoinType[]).map((coin) => (
                <button
                  key={coin}
                  onClick={() => onSelectCoin(coin)}
                  className={`p-5 rounded-2xl border-2 transition-all ${
                    selectedCoin === coin
                      ? 'bg-cyan-500/20 border-cyan-500'
                      : 'bg-slate-800/30 border-slate-700/50 hover:border-cyan-500/30'
                  }`}
                >
                  <p className={`text-center text-lg ${
                    selectedCoin === coin ? 'text-cyan-400' : 'text-slate-300'
                  }`}>
                    {coin}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 요청 금액 - 대형 디스플레이 */}
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-3xl blur"></div>
            <div className="relative bg-slate-800/90 border-2 border-cyan-500/50 rounded-3xl p-8">
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">요청 금액</p>
                <div className="text-white text-5xl mb-2 tracking-tight">
                  {amount.toLocaleString()}
                </div>
                <p className="text-cyan-400 text-xl">{selectedCoin}</p>
              </div>
            </div>
          </div>

          {/* 전체 삭제 버튼 */}
          {amount > 0 && (
            <button
              onClick={handleClearAmount}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <X className="w-5 h-5" />
              <span>전체 삭제</span>
            </button>
          )}

          {/* 금액 단축 버튼 - 2열 그리드로 개선 */}
          <div>
            <label className="block text-slate-300 mb-3">빠른 금액 선택 (누적 추가)</label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_AMOUNTS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleQuickAmount(item.value)}
                  className="group relative overflow-hidden p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-400 text-xs">+ {item.label}</div>
                      <div className="text-white text-sm">{item.value.toLocaleString()}</div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                      <Plus className="w-3 h-3 text-cyan-400" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 메모 (선택사항) */}
          <div>
            <label className="block text-slate-300 mb-3">메모 (선택사항)</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="요청 사유를 입력하세요 (예: KRWQ 구매)"
              className="w-full bg-slate-800/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              rows={3}
            />
          </div>

          {/* 요청 보내기 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || amount <= 0}
            className="w-full bg-slate-800/50 border-2 border-cyan-500/50 text-cyan-400 py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-cyan-500/10 hover:border-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            <Send className="w-6 h-6" />
            {isSubmitting ? '처리 중...' : '요청 보내기'}
          </button>

          {/* 이용 안내 */}
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl blur"></div>
            <div className="relative bg-slate-800/50 border border-cyan-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <h3 className="text-cyan-400">이용 안내</h3>
              </div>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0">•</span>
                  <span>요청 후 관리자 승인이 필요합니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0">•</span>
                  <span>승인되면 자동으로 지갑에 입금됩니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0">•</span>
                  <span>단축 버튼을 여러 번 눌러 원하는 금액을 만드세요</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0">•</span>
                  <span>거부된 경우 사유를 확인하세요</span>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}