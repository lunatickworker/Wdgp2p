import { useState, useEffect } from 'react';
import { ArrowLeft, Send, AlertCircle, Loader2, CheckCircle2, Zap, Info, Wallet as WalletIcon, Crown } from 'lucide-react';
import { Screen, WalletData, CoinType } from '../App';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';
import { useWallet } from '../../hooks/useWallet';
import { biconomyClient } from '../../utils/biconomy/client';
import { getGasPolicyForUser, getGasPolicyDescription, getLevelBadgeColor, GasPaymentConfig } from '../../utils/biconomy/gasPolicy';
import { composeBiconomyTransaction, checkBiconomyAvailability } from '../../utils/api/biconomy';

interface WithdrawalProps {
  wallets: WalletData[];
  selectedCoin: CoinType;
  onNavigate: (screen: Screen) => void;
  onSelectCoin: (coin: CoinType) => void;
}

interface GasQuote {
  gasCost: string;
  estimatedTime: string;
  network: string;
}

export function Withdrawal({ wallets, selectedCoin, onNavigate, onSelectCoin }: WithdrawalProps) {
  const { user } = useAuth();
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gasQuote, setGasQuote] = useState<GasQuote | null>(null);
  const [isCalculatingGas, setIsCalculatingGas] = useState(false);
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);
  // 스마트 거래는 항상 활성화 (토글 제거)
  const useSupertransaction = true;
  const [gasPaymentConfig, setGasPaymentConfig] = useState<GasPaymentConfig | null>(null);
  const [userLevel, setUserLevel] = useState<string>('Basic');
  const [coins, setCoins] = useState<CoinType[]>([]);
  const [coinIcons, setCoinIcons] = useState<Map<string, string>>(new Map());

  // 코인 아이콘 로드
  useEffect(() => {
    const fetchCoinIcons = async () => {
      try {
        const { data: coinData } = await supabase
          .from('supported_tokens')
          .select('symbol, icon_url');
        
        if (coinData) {
          const iconMap = new Map<string, string>();
          coinData.forEach((coin: any) => {
            if (coin.icon_url) {
              iconMap.set(coin.symbol, coin.icon_url);
            }
          });
          setCoinIcons(iconMap);
        }
      } catch (error) {
        console.error('Error fetching coin icons:', error);
      }
    };

    fetchCoinIcons();
  }, []);

  // 지갑이 있는 코인만 표시
  useEffect(() => {
    const fetchActiveCoins = async () => {
      const { data, error } = await supabase
        .from('supported_tokens')
        .select('symbol')
        .eq('is_active', true)
        .order('symbol');

      if (data && !error) {
        // 지갑이 있는 코인만 필터링
        const walletCoins = wallets.map(w => w.coin_type);
        const activeCoins = data
          .map(token => token.symbol as CoinType)
          .filter(coin => walletCoins.includes(coin));
        
        setCoins(activeCoins);
      }
    };

    fetchActiveCoins();
  }, [wallets]);

  const selectedWallet = wallets.find(w => w.coin_type === selectedCoin);

  // 사용자 레벨 및 가스비 정책 로드
  useEffect(() => {
    const loadGasPolicy = async () => {
      if (!user) return;

      try {
        const policy = await getGasPolicyForUser(user.id);
        setGasPaymentConfig(policy);

        // 사용자 레벨 가져오기
        const { data: userData } = await supabase
          .from('users')
          .select('level')
          .eq('user_id', user.id)
          .single();

        if (userData) {
          setUserLevel(userData.level || 'Basic');
        }
      } catch (error) {
        console.error('Gas policy load error:', error);
      }
    };

    loadGasPolicy();

    // 실시간 가스비 정책 업데이트 구독
    const policySubscription = supabase
      .channel('gas_policy_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gas_sponsorship_policies'
        },
        async (payload) => {
          console.log('Gas policy updated:', payload);
          // 정책이 변경되면 다시 로드
          await loadGasPolicy();
          toast.success('가스비 정책이 업데이트되었습니다');
        }
      )
      .subscribe();

    return () => {
      policySubscription.unsubscribe();
    };
  }, [user]);

  // 실시간 출금 내역 업데이트
  useEffect(() => {
    const fetchRecentWithdrawals = async () => {
      const { data } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('coin_type', selectedCoin)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setRecentWithdrawals(data);
      }
    };

    fetchRecentWithdrawals();

    // 실시간 업데이트
    const channel = supabase
      .channel('withdrawal-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawals',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.success('출금 요청이 접수되었습니다');
          } else if (payload.eventType === 'UPDATE') {
            const status = (payload.new as any).status;
            if (status === 'completed') {
              toast.success('출금이 완료되었습니다!');
            } else if (status === 'rejected') {
              toast.error('출금이 거부되었습니다');
            }
          }
          fetchRecentWithdrawals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedCoin]);

  // 가스비 견적 계산
  useEffect(() => {
    const calculateGas = async () => {
      if (!toAddress || !amount || parseFloat(amount) <= 0) {
        setGasQuote(null);
        return;
      }

      setIsCalculatingGas(true);

      // 시뮬레이션 - 실제로는 Biconomy Supertransaction API 호출
      setTimeout(() => {
        setGasQuote({
          gasCost: (Math.random() * 5 + 0.5).toFixed(2) + ' USDT',
          estimatedTime: '~' + (Math.floor(Math.random() * 20) + 10) + ' 초',
          network: selectedCoin === 'BTC' ? 'Bitcoin' : 'Ethereum'
        });
        setIsCalculatingGas(false);
      }, 1000);
    };

    const debounce = setTimeout(() => {
      calculateGas();
    }, 500);

    return () => clearTimeout(debounce);
  }, [toAddress, amount, selectedCoin]);

  const handleMaxAmount = () => {
    if (selectedWallet) {
      setAmount(selectedWallet.balance.toString());
    }
  };



  const handleWithdraw = async () => {
    if (!selectedWallet || !toAddress || !amount) {
      toast.error('모든 필드를 입력해주세요');
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast.error('유효한 금액을 입력해주세요');
      return;
    }

    if (amountNum > selectedWallet.balance) {
      toast.error('잔액이 부족합니다');
      return;
    }

    setIsLoading(true);

    try {
      if (useSupertransaction) {
        // Biconomy 사용 가능 여부 확인
        const availability = await checkBiconomyAvailability();
        if (!availability.available) {
          toast.error(availability.message);
          setIsLoading(false);
          return;
        }

        // Supertransaction API 사용
        // 1. Compose
        const { payload, quote } = await composeBiconomyTransaction({
          chainId: 8453, // Base
          from: selectedWallet.address,
          steps: [
            {
              type: 'transfer',
              token: selectedCoin,
              to: toAddress,
              amount: amount
            }
          ],
          gasPayment: gasPaymentConfig || { sponsor: false, token: 'USDC' }
        });

        // 2. DB에 출금 요청 저장 (pending 상태)
        const { error: insertError } = await supabase
          .from('withdrawals')
          .insert({
            user_id: user?.id,
            wallet_id: selectedWallet.wallet_id,
            coin_type: selectedCoin,
            amount: amount,
            to_address: toAddress,
            status: 'processing',  // 즉시 처리 시작
            supertransaction_payload: payload,
            gas_quote: quote
          });

        if (insertError) throw insertError;

        toast.success('출금이 진행중입니다. 잠시 후 완료됩니다.');
      } else {
        // 일반 출금
        const { error } = await supabase
          .from('withdrawals')
          .insert({
            user_id: user?.id,
            wallet_id: selectedWallet.wallet_id,
            coin_type: selectedCoin,
            amount: amount,
            to_address: toAddress,
            status: 'processing'  // 즉시 처리 시작
          });

        if (error) throw error;
        toast.success('출금이 진행중입니다. 잠시 후 완료됩니다.');
      }

      // 초기화
      setToAddress('');
      setAmount('');
      setGasQuote(null);
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || '출금 요청 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
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
          <h2 className="text-white text-xl lg:text-2xl">출금</h2>
          <p className="text-slate-400 text-sm">코인을 출금하세요</p>
        </div>
      </div>

      {/* 스마트 거래 토글 - 제거하고 정보만 표시 */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-20 blur"></div>
        <div className="relative bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">스마트 거래 사용중</p>
              <p className="text-purple-300 text-xs">빠르고 안전한 거래를 경험하세요</p>
            </div>
          </div>
        </div>
      </div>

      {/* 코인 선택 - 잔액 표시 개선 */}
      <div>
        <label className="block text-slate-300 mb-3">코인 선택</label>
        <div className="grid grid-cols-3 gap-3">
          {coins.map((coin) => {
            const wallet = wallets.find(w => w.coin_type === coin);
            return (
              <button
                key={coin}
                onClick={() => onSelectCoin(coin)}
                className={`p-4 rounded-xl border-2 transition-all active:scale-95 ${
                  selectedCoin === coin
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="text-center">
                  <p className={`text-base mb-1 ${selectedCoin === coin ? 'text-cyan-400' : 'text-slate-300'}`}>
                    {coin}
                  </p>
                  {wallet && (
                    <p className="text-xs text-slate-500 truncate">
                      {wallet.balance >= 1000000 
                        ? (wallet.balance / 1000000).toFixed(2) + 'M'
                        : wallet.balance >= 1000
                        ? (wallet.balance / 1000).toFixed(2) + 'K'
                        : wallet.balance.toFixed(4)}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 출금 폼 */}
      {selectedWallet ? (
        <div className="space-y-4">
          {/* 받는 주소 */}
          <div>
            <label className="block text-slate-300 mb-2">받는 주소</label>
            <div className="relative">
              <input
                type="text"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder={`${selectedCoin} 주소를 입력하세요`}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
          </div>


          {/* 출금 금액 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-300">출금 금액</label>
              <button
                onClick={handleMaxAmount}
                className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
              >
                MAX
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="any"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 pr-20 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                {selectedCoin}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-400">
                사용 가능: {selectedWallet.balance.toFixed(8)} {selectedCoin}
              </span>
            </div>
          </div>

          {/* 가스비 정책 안내 */}
          {gasPaymentConfig && (
            <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  {userLevel === 'VIP' ? <Crown className="w-4 h-4 text-yellow-400" /> : <Zap className="w-4 h-4 text-cyan-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm">가스비 정책</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getLevelBadgeColor(userLevel)}`}>
                      {userLevel}
                    </span>
                  </div>
                  <p className="text-cyan-300 text-xs">
                    {getGasPolicyDescription(gasPaymentConfig)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 가스비 견적 */}
          {useSupertransaction && gasQuote && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-cyan-400" />
                <span className="text-white text-sm">가스비 견적</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">총 가스비</span>
                  <span className="text-white">{gasQuote.gasCost}</span>
                </div>
                {gasPaymentConfig && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">내가 부담할 금액</span>
                    <span className={`${gasPaymentConfig.sponsor ? 'text-green-400' : 'text-amber-400'}`}>
                      {gasPaymentConfig.sponsor 
                        ? '0 (100% 운영자 부담)' 
                        : gasPaymentConfig.maxUserPayment 
                        ? `최대 ${gasPaymentConfig.maxUserPayment} ${gasPaymentConfig.token}`
                        : gasQuote.gasCost}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">예상 시간</span>
                  <span className="text-green-400">{gasQuote.estimatedTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">네트워크</span>
                  <span className="text-white">{gasQuote.network}</span>
                </div>
              </div>
            </div>
          )}

          {isCalculatingGas && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>가스비 계산 중...</span>
            </div>
          )}

          {/* 출금 버튼 */}
          <button
            onClick={handleWithdraw}
            disabled={isLoading || !toAddress || !amount || isCalculatingGas}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>처리 중...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>출금 요청</span>
              </>
            )}
          </button>

          {/* 출금 안내 */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-400 text-sm mb-1">출금 안내</p>
                <div className="space-y-1 text-xs text-amber-300">
                  <p>• 주소를 정확히 확인해주세요</p>
                  <p>• 출금은 되돌릴 수 없습니다</p>
                  {useSupertransaction && (
                    <p>• 스마트 거래로 빠르고 안전하게 처리됩니다</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-800/30 border border-slate-700/50 rounded-xl">
          <p className="text-slate-400">선택한 코인의 지갑이 없습니다</p>
        </div>
      )}

      {/* 최근 출금 내역 */}
      {recentWithdrawals.length > 0 && (
        <div>
          <h3 className="text-white mb-3">최근 출금 내역</h3>
          <div className="space-y-2">
            {recentWithdrawals.map((withdrawal) => (
              <div
                key={withdrawal.withdrawal_id}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white">-{withdrawal.amount} {withdrawal.coin_type}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      withdrawal.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : withdrawal.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-400'
                        : withdrawal.status === 'processing'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {withdrawal.status === 'completed'
                      ? '완료'
                      : withdrawal.status === 'pending'
                      ? '대기 중'
                      : withdrawal.status === 'processing'
                      ? '처리 중'
                      : '거부됨'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(withdrawal.created_at).toLocaleString('ko-KR')}</span>
                  <span className="truncate max-w-[120px]">{withdrawal.to_address}</span>
                </div>
                {withdrawal.supertransaction_payload && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-purple-400">
                    <Zap className="w-3 h-3" />
                    <span>스마트 거래</span>
                  </div>
                )}
              </div>
            ))}</div>
        </div>
      )}
    </div>
  );
}