import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowDownUp, Info, Zap, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Screen, WalletData, CoinType } from '../App';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../hooks/useWallet';
import { biconomyClient } from '../../utils/biconomy/client';
import { ethers } from 'ethers';

interface SwapProps {
  wallets: WalletData[];
  selectedCoin: CoinType;
  onNavigate: (screen: Screen) => void;
  onSelectCoin: (coin: CoinType) => void;
}

interface GasQuote {
  gasCost: string;
  estimatedTime: string;
  route: string;
}

interface SwapRecord {
  swap_id: string;
  from_coin: string;
  to_coin: string;
  from_amount: number;
  to_amount: number;
  status: string;
  method?: string;
  gas_cost?: string;
  created_at: string;
}

export function Swap({ wallets, selectedCoin, onNavigate, onSelectCoin }: SwapProps) {
  const { user } = useAuth();
  const { signer, address, isConnected } = useWallet();
  const [fromCoin, setFromCoin] = useState<CoinType>('BTC');
  const [toCoin, setToCoin] = useState<CoinType>('ETH');
  const [fromAmount, setFromAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [enableSupertransaction, setEnableSupertransaction] = useState(true);
  const [gasToken, setGasToken] = useState('USDT');
  const [gasQuote, setGasQuote] = useState<GasQuote | null>(null);
  const [isCalculatingGas, setIsCalculatingGas] = useState(false);
  const [recentSwaps, setRecentSwaps] = useState<SwapRecord[]>([]);
  const [currentStep, setCurrentStep] = useState<'idle' | 'composing' | 'signing' | 'executing' | 'completed'>('idle');
  const [coins, setCoins] = useState<CoinType[]>([]);

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
        
        // 기본 선택값 설정
        if (activeCoins.length > 0 && !activeCoins.includes(fromCoin)) {
          setFromCoin(activeCoins[0]);
        }
        if (activeCoins.length > 1 && (!activeCoins.includes(toCoin) || fromCoin === toCoin)) {
          setToCoin(activeCoins[1]);
        }
      }
    };

    fetchActiveCoins();
  }, [wallets]);

  const fromWallet = wallets.find(w => w.coin_type === fromCoin);
  const toWallet = wallets.find(w => w.coin_type === toCoin);

  // 실시간 스왑 내역 업데이트
  useEffect(() => {
    const fetchRecentSwaps = async () => {
      const { data } = await supabase
        .from('coin_swaps')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setRecentSwaps(data as SwapRecord[]);
      }
    };

    fetchRecentSwaps();

    // 실시간 업데이트
    const channel = supabase
      .channel('swap-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coin_swaps',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.success('스왑 요청이 접수되었습니다');
          } else if (payload.eventType === 'UPDATE') {
            const status = (payload.new as any).status;
            if (status === 'completed') {
              toast.success('스왑이 완료되었습니다!');
            } else if (status === 'failed') {
              toast.error('스왑이 실패했습니다');
            }
          }
          fetchRecentSwaps();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 환율 데이터 가져오기
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchPrices = async () => {
      const { data } = await supabase
        .from('supported_tokens')
        .select('symbol, price_krw');

      if (data) {
        const rates: Record<string, number> = {};
        data.forEach((coin: any) => {
          rates[coin.symbol] = coin.price_krw || 1;
        });
        setExchangeRates(rates);
      }
    };

    fetchPrices();

    // 30초마다 가격 업데이트
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  // 환율 계산
  const calculateToAmount = (amount: string) => {
    if (!amount || isNaN(parseFloat(amount))) return '0';
    const fromRate = exchangeRates[fromCoin] || 1;
    const toRate = exchangeRates[toCoin] || 1;
    const exchangeRate = fromRate / toRate;
    const toAmount = parseFloat(amount) * exchangeRate;
    const fee = toAmount * 0.001; // 0.1% 수수료
    return (toAmount - fee).toFixed(8);
  };

  const toAmount = calculateToAmount(fromAmount);
  const fee = fromAmount ? (parseFloat(toAmount) * 0.001).toFixed(8) : '0';

  // 가스비 견적 계산
  useEffect(() => {
    const calculateGas = async () => {
      if (!fromAmount || parseFloat(fromAmount) <= 0 || !enableSupertransaction) {
        setGasQuote(null);
        return;
      }

      setIsCalculatingGas(true);

      // 시뮬레이션 - 실제로는 Biconomy Supertransaction API 호출
      setTimeout(() => {
        setGasQuote({
          gasCost: (Math.random() * 3 + 0.3).toFixed(2) + ' ' + gasToken,
          estimatedTime: '~' + (Math.floor(Math.random() * 15) + 5) + ' 초',
          route: 'Uniswap V3 → Optimized Route'
        });
        setIsCalculatingGas(false);
      }, 800);
    };

    const timer = setTimeout(calculateGas, 500);
    return () => clearTimeout(timer);
  }, [fromAmount, fromCoin, toCoin, enableSupertransaction, gasToken]);

  const handleSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast.error('교환할 금액을 입력하세요');
      return;
    }

    if (!fromWallet || parseFloat(fromAmount) > fromWallet.balance) {
      toast.error('잔액이 부족합니다');
      return;
    }

    if (fromCoin === toCoin) {
      toast.error('같은 코인으로는 교환할 수 없습니다');
      return;
    }

    // Supertransaction 사용 시 지갑 연결 확인
    if (enableSupertransaction && !isConnected) {
      toast.error('먼저 MetaMask를 연결해주세요 (설정 > 지갑 연결)');
      return;
    }

    setIsSwapping(true);
    setCurrentStep('idle');
    
    try {
      let txHash = null;

      // Supertransaction 사용 시
      if (enableSupertransaction && isConnected && signer && address) {
        try {
          toast.info('⚡ 스마트 스왑 실행 중...');

          // Step 1: Compose
          setCurrentStep('composing');
          const composeResponse = await biconomyClient.swap({
            from: address,
            tokenIn: fromCoin,
            tokenOut: toCoin,
            amountIn: ethers.utils.parseUnits(fromAmount, 18).toString(),
            chainId: 8453, // Base Mainnet
            gasToken
          });

          console.log('가스비 견적:', composeResponse.quote);

          // Step 2: Sign
          setCurrentStep('signing');
          const message = JSON.stringify(composeResponse.payload);
          const signature = await signer.signMessage(message);

          // Step 3: Execute
          setCurrentStep('executing');
          const executeResponse = await biconomyClient.execute(composeResponse.payload, signature);
          
          txHash = executeResponse.txHash;
          setCurrentStep('completed');
          toast.success('✅ 스마트 스왑 완료!');
        } catch (superError: any) {
          setCurrentStep('idle');
          console.error('Supertransaction swap error:', superError);
          toast.error(`스마트 스왑 실패: ${superError.message}`);
        }
      }

      // Supabase에 스왑 기록 저장
      const fromRate = exchangeRates[fromCoin] || 1;
      const toRate = exchangeRates[toCoin] || 1;

      const { error: dbError } = await supabase
        .from('coin_swaps')
        .insert({
          user_id: user?.id,
          from_coin: fromCoin,
          to_coin: toCoin,
          from_amount: parseFloat(fromAmount),
          to_amount: parseFloat(toAmount),
          exchange_rate: fromRate / toRate,
          fee: parseFloat(fee),
          fee_coin: toCoin,
          status: txHash ? 'completed' : 'processing',
          tx_hash: txHash,
          method: enableSupertransaction ? 'supertransaction' : 'standard',
          gas_token: enableSupertransaction ? gasToken : null,
          gas_cost: gasQuote?.gasCost || null,
        });

      if (dbError) throw dbError;

      if (!txHash) {
        toast.success(`${fromAmount} ${fromCoin}를 ${toAmount} ${toCoin}로 교환 요청했습니다`);
      }
      setFromAmount('');
      
    } catch (error) {
      console.error('Swap error:', error);
      toast.error('코인 교환에 실패했습니다');
    } finally {
      setIsSwapping(false);
      setCurrentStep('idle');
    }
  };

  const swapCoins = () => {
    const temp = fromCoin;
    setFromCoin(toCoin);
    setToCoin(temp);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; className: string }> = {
      pending: { text: '대기중', className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
      processing: { text: '처리중', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
      completed: { text: '완료', className: 'bg-green-500/20 text-green-400 border border-green-500/30' },
      failed: { text: '실패', className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
      cancelled: { text: '취소', className: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' },
    };
    const badge = badges[status] || badges.pending;
    return <span className={`px-2 py-1 rounded text-xs ${badge.className}`}>{badge.text}</span>;
  };

  return (
    <div className="space-y-6 pb-8">
      <button 
        onClick={() => onNavigate('home')} 
        className="lg:hidden flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>뒤로</span>
      </button>
      
      <div className="hidden lg:block">
        <h2 className="text-white text-2xl">스왑</h2>
        <p className="text-slate-400 text-sm">코인을 교환하세요</p>
      </div>

      <div className="text-center">
        <h2 className="text-white mb-2">코인 교환</h2>
        <p className="text-slate-400 text-sm">다른 코인으로 빠르게 교환하세요</p>
      </div>

      {/* 스마트 스왑 옵션 */}
      <div 
        className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-4"
        style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.15)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span className="text-white">스마트 스왑</span>
          </div>
          <button
            onClick={() => setEnableSupertransaction(!enableSupertransaction)}
            className={`w-12 h-6 rounded-full transition-all relative ${
              enableSupertransaction ? 'bg-cyan-500' : 'bg-slate-600'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
                enableSupertransaction ? 'left-6' : 'left-0.5'
              }`}
            />
          </button>
        </div>
        <p className="text-slate-400 text-sm">
          {enableSupertransaction 
            ? '✅ 최적 DEX 자동 선택 | 최저 가격 | 빠른 실행' 
            : '일반 스왑 방식'}
        </p>
      </div>

      {/* 가스비 토큰 선택 */}
      {enableSupertransaction && (
        <div>
          <label className="block text-slate-300 mb-2 text-sm">가스비 지불 토큰</label>
          <div className="grid grid-cols-3 gap-2">
            {['USDT', 'USDC', 'ETH'].map((token) => (
              <button
                key={token}
                onClick={() => setGasToken(token)}
                className={`py-2 px-4 rounded-lg border transition-all ${
                  gasToken === token
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                    : 'bg-slate-800/50 border-slate-600 text-slate-400'
                }`}
              >
                {token}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 스왑 입력 카드 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4">
        {/* From Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-slate-400 text-sm">보내는 코인</label>
            <span className="text-slate-400 text-xs">
              잔액: {fromWallet?.balance.toFixed(8) || '0'} {fromCoin}
            </span>
          </div>
          <div className="flex gap-3">
            <select
              value={fromCoin}
              onChange={(e) => setFromCoin(e.target.value as CoinType)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
            >
              {coins.map(coin => (
                <option key={coin} value={coin}>{coin}</option>
              ))}
            </select>
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0.00"
              step="any"
              className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white text-right focus:outline-none focus:border-cyan-500"
            />
          </div>
          {fromWallet && (
            <button
              onClick={() => setFromAmount(fromWallet.balance.toString())}
              className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
            >
              최대
            </button>
          )}
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={swapCoins}
            className="bg-slate-700 hover:bg-slate-600 rounded-full p-3 transition-colors"
          >
            <ArrowDownUp className="w-5 h-5 text-cyan-400" />
          </button>
        </div>

        {/* To Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-slate-400 text-sm">받는 코인</label>
            <span className="text-slate-400 text-xs">
              잔액: {toWallet?.balance.toFixed(8) || '0'} {toCoin}
            </span>
          </div>
          <div className="flex gap-3">
            <select
              value={toCoin}
              onChange={(e) => setToCoin(e.target.value as CoinType)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
            >
              {coins.map(coin => (
                <option key={coin} value={coin}>{coin}</option>
              ))}
            </select>
            <input
              type="text"
              value={toAmount}
              readOnly
              placeholder="0.00"
              className="flex-1 bg-slate-700/30 border border-slate-600 rounded-lg px-4 py-3 text-white text-right cursor-not-allowed"
            />
          </div>
        </div>

        {/* 가스비 견적 */}
        {gasQuote && enableSupertransaction && (
          <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Info className="w-4 h-4" />
              <span className="text-sm">스마트 스왑 견적</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-400 text-xs">예상 가스비</div>
                <div className="text-white">{gasQuote.gasCost}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">예상 시간</div>
                <div className="text-cyan-400">{gasQuote.estimatedTime}</div>
              </div>
            </div>
            <div className="text-slate-400 text-xs pt-1">
              경로: {gasQuote.route}
            </div>
          </div>
        )}

        {/* 로딩 상태 */}
        {isCalculatingGas && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>견적 계산 중...</span>
          </div>
        )}

        {/* 진행 상태 */}
        {isSwapping && (
          <div className="bg-slate-800/50 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="text-white">스마트 스왑 진행 중...</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${currentStep !== 'idle' ? 'text-green-400' : 'text-slate-600'}`} />
                <span className={`text-sm ${currentStep !== 'idle' ? 'text-slate-300' : 'text-slate-600'}`}>
                  1. Compose
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${currentStep === 'signing' || currentStep === 'executing' || currentStep === 'completed' ? 'text-green-400' : 'text-slate-600'}`} />
                <span className={`text-sm ${currentStep === 'signing' || currentStep === 'executing' || currentStep === 'completed' ? 'text-slate-300' : 'text-slate-600'}`}>
                  2. Sign
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${currentStep === 'executing' || currentStep === 'completed' ? 'text-green-400' : 'text-slate-600'}`} />
                <span className={`text-sm ${currentStep === 'executing' || currentStep === 'completed' ? 'text-slate-300' : 'text-slate-600'}`}>
                  3. Execute
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Exchange Info */}
        {fromAmount && parseFloat(fromAmount) > 0 && (
          <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 mt-0.5" />
              <div className="flex-1 space-y-1 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>환율</span>
                  <span>1 {fromCoin} = {((exchangeRates[fromCoin] || 1) / (exchangeRates[toCoin] || 1)).toFixed(8)} {toCoin}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>수수료 (0.1%)</span>
                  <span>{fee} {toCoin}</span>
                </div>
                <div className="flex justify-between text-cyan-400 pt-2 border-t border-slate-600">
                  <span>예상 받을 금액</span>
                  <span>{toAmount} {toCoin}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={isSwapping || !fromAmount || parseFloat(fromAmount) <= 0}
          className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-4 rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSwapping ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>교환 중...</span>
            </>
          ) : (
            <>
              {enableSupertransaction && <Zap className="w-5 h-5" />}
              <span>{enableSupertransaction ? '스마트 스왑' : '교환하기'}</span>
            </>
          )}
        </button>
      </div>

      {/* 최근 스왑 내역 */}
      {recentSwaps.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-white mb-4">최근 스왑 내역</h3>
          <div className="space-y-3">
            {recentSwaps.map((swap) => (
              <div 
                key={swap.swap_id}
                className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm">
                      {swap.from_amount.toFixed(4)} {swap.from_coin} → {swap.to_amount.toFixed(4)} {swap.to_coin}
                    </span>
                    {swap.method === 'supertransaction' && (
                      <Zap className="w-3 h-3 text-cyan-400" />
                    )}
                  </div>
                  <div className="text-slate-400 text-xs">
                    {new Date(swap.created_at).toLocaleString('ko-KR')}
                  </div>
                  {swap.gas_cost && (
                    <div className="text-slate-400 text-xs">
                      가스비: {swap.gas_cost}
                    </div>
                  )}
                </div>
                <div>
                  {getStatusBadge(swap.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <p className="text-yellow-400 text-sm">
            {enableSupertransaction 
              ? '스마트 스왑이 자동으로 최적의 DEX를 선택하여 최저 가격으로 교환합니다.' 
              : '코인 교환은 실시간 환율을 기반으로 처리되며, 시장 상황에 따라 최종 금액이 달라질 수 있습니다.'}
          </p>
        </div>
      </div>
    </div>
  );
}