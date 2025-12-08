import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Repeat, TrendingUp, Eye, EyeOff, Zap, ShoppingCart, Coins } from 'lucide-react';
import { Screen, WalletData, Transaction } from '../App';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';

interface HomeProps {
  wallets: WalletData[];
  transactions: Transaction[];
  onNavigate: (screen: Screen) => void;
  onSelectCoin: (coin: any) => void;
}

export function Home({ wallets, transactions, onNavigate, onSelectCoin }: HomeProps) {
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [todayChange, setTodayChange] = useState(0);
  const [prices, setPrices] = useState<{ [key: string]: number }>({});
  const [accountVerified, setAccountVerified] = useState<boolean>(false);
  const [coinIcons, setCoinIcons] = useState<Map<string, string>>(new Map());

  // 코인 아이콘 로드
  useEffect(() => {
    const fetchCoinIcons = async () => {
      try {
        const { data: coins } = await supabase
          .from('supported_tokens')
          .select('symbol, icon_url');
        
        if (coins) {
          const iconMap = new Map<string, string>();
          coins.forEach((coin: any) => {
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

  // 계좌 인증 상태 확인
  useEffect(() => {
    const checkVerification = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('users')
        .select('account_verification_status')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setAccountVerified(data.account_verification_status === 'verified');
      }
    };

    checkVerification();
  }, [user]);

  // 토큰 가격 정보 가져오기
  useEffect(() => {
    const fetchPrices = async () => {
      const { data } = await supabase
        .from('supported_tokens')
        .select('symbol, price_usd');

      if (data) {
        const priceMap: { [key: string]: number } = {};
        data.forEach((token: any) => {
          // USD 가격을 원화로 변환 (1 USD = 1350 KRW 가정)
          priceMap[token.symbol] = (token.price_usd || 0) * 1350;
        });
        setPrices(priceMap);
      }
    };

    fetchPrices();

    // 30초마다 가격 업데이트
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  // 실시간 잔액 업데이트
  useEffect(() => {
    const channel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          // 부모 컴포넌트에서 wallets 재조회
          window.location.reload(); // 임시 - 실제로는 부모에서 fetchWallets 호출
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 총 잔액 계산 및 변동률 계산
  useEffect(() => {
    const total = wallets.reduce((sum, wallet) => {
      const price = prices[wallet.coin_type] || 0;
      return sum + (wallet.balance * price);
    }, 0);

    setTotalBalance(total);

    // 페이지 첫 로드 시 잔액 저장 (이후 계속 이 값 대비 변동률 계산)
    const savedBalance = localStorage.getItem('balance_snapshot_value');

    if (!savedBalance) {
      // 저장된 값이 없으면 현재 잔액을 기준으로 저장
      localStorage.setItem('balance_snapshot_value', total.toString());
      setTodayChange(0); // 첫 로드 시에는 0%
    } else {
      // 저장된 기준 잔액과 현재 잔액 비교
      const startBalance = parseFloat(savedBalance);
      if (startBalance > 0) {
        const changePercent = ((total - startBalance) / startBalance) * 100;
        setTodayChange(changePercent);
      } else {
        setTodayChange(0);
      }
    }
  }, [wallets, prices]);

  const recentTransactions = transactions.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* PC 제목 */}
      <div className="hidden lg:block mb-6">
        <h2 className="text-white text-2xl">홈</h2>
        <p className="text-slate-400 text-sm">내 자산 현황</p>
      </div>

      {/* 총 자산 카드 */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl opacity-30 group-hover:opacity-40 blur transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-cyan-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">총 자산</span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>

          {showBalance ? (
            <>
              <div className="text-white text-3xl mb-2">
                ₩{totalBalance.toLocaleString()}
              </div>
              <div className={`flex items-center gap-1 text-sm ${todayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <TrendingUp className={`w-4 h-4 ${todayChange < 0 ? 'rotate-180' : ''}`} />
                <span>{todayChange >= 0 ? '+' : ''}{todayChange.toFixed(2)}%</span>
                <span className="text-slate-500">오늘</span>
              </div>
            </>
          ) : (
            <div className="text-white text-3xl mb-2">••••••••</div>
          )}

          {/* 주요 액션 버튼 - 큰 버튼 2개 */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={() => onNavigate('deposit')}
              className="relative group overflow-hidden rounded-2xl transition-all active:scale-98"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 opacity-100"></div>
              <div className="relative px-6 py-5 flex flex-col items-center justify-center gap-2">
                <ArrowDownLeft className="w-6 h-6 text-white" />
                <span className="text-white">입금하기</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('withdrawal')}
              className="relative group overflow-hidden rounded-2xl transition-all active:scale-98"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 opacity-100"></div>
              <div className="relative px-6 py-5 flex flex-col items-center justify-center gap-2">
                <ArrowUpRight className="w-6 h-6 text-white" />
                <span className="text-white">출금하기</span>
              </div>
            </button>
          </div>

          {/* 추가 액션 버튼 */}
          <div className="grid grid-cols-1 gap-3 mt-3">
            <button
              onClick={() => onNavigate('swap')}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all active:scale-95"
            >
              <Repeat className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-400">스왑</span>
            </button>
          </div>
        </div>
      </div>

      {/* 내 코인 목록 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white">내 코인</h3>
          <button
            onClick={() => onNavigate('wallets')}
            className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
          >
            전체보기
          </button>
        </div>

        {/* 코인 구매 요청 버튼 */}
        <button
          onClick={() => {
            if (!accountVerified) {
              onNavigate('settings');
            } else {
              onNavigate('coin-purchase');
            }
          }}
          className={`w-full mb-3 p-4 rounded-xl transition-all active:scale-98 group ${
            accountVerified
              ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-2 border-cyan-500/30 hover:border-cyan-500/50'
              : 'bg-gradient-to-r from-slate-700/10 to-slate-800/10 border-2 border-slate-600/30 hover:border-slate-600/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${
                accountVerified
                  ? 'bg-gradient-to-br from-cyan-500 to-purple-500'
                  : 'bg-gradient-to-br from-slate-600 to-slate-700'
              }`}>
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className={accountVerified ? 'text-white' : 'text-slate-400'}>
                  코인 구매 요청
                  {!accountVerified && ' (인증 필요)'}
                </p>
                <p className={`text-sm ${accountVerified ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {accountVerified ? '관리자 승인 후 즉시 입금' : '1원 인증을 먼저 완료해주세요'}
                </p>
              </div>
            </div>
            <div className={accountVerified ? 'text-cyan-400' : 'text-slate-500'}>
              →
            </div>
          </div>
        </button>

        <div className="space-y-3">
          {wallets.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 border border-slate-700/50 rounded-xl">
              <p className="text-slate-400">지갑이 없습니다</p>
            </div>
          ) : (
            wallets.slice(0, 5).map((wallet) => (
              <button
                key={wallet.wallet_id}
                onClick={() => {
                  onSelectCoin(wallet.coin_type);
                  onNavigate('wallet-detail');
                }}
                className="w-full bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 rounded-xl p-4 transition-all active:scale-98"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full bg-slate-700 border-2 border-cyan-500/50 flex items-center justify-center overflow-hidden"
                      style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.3)' }}
                    >
                      {coinIcons.has(wallet.coin_type) ? (
                        <img 
                          src={coinIcons.get(wallet.coin_type)} 
                          alt={wallet.coin_type}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.fallback-text')) {
                              const fallback = document.createElement('span');
                              fallback.className = 'fallback-text text-cyan-400';
                              fallback.textContent = wallet.coin_type;
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <span className="text-cyan-400">{wallet.coin_type}</span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-white">{wallet.coin_type}</p>
                      <p className="text-slate-400 text-sm">
                        {wallet.balance.toFixed(8)} {wallet.coin_type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white">
                      ₩{(wallet.balance * (prices[wallet.coin_type] || 0)).toLocaleString()}
                    </p>
                    <p className="text-green-400 text-sm">+2.5%</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 최근 거래 내역 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white">최근 거래</h3>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
          >
            전체보기
          </button>
        </div>

        <div className="space-y-3">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 border border-slate-700/50 rounded-xl">
              <p className="text-slate-400">거래 내역이 없습니다</p>
            </div>
          ) : (
            recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'deposit'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {tx.type === 'deposit' ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm">
                        {tx.type === 'deposit' ? '입금' : '출금'}
                      </p>
                      <p className="text-slate-400 text-xs">{tx.coin_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white">
                      {tx.type === 'deposit' ? '+' : '-'}{tx.amount} {tx.coin_type}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        tx.status === 'confirmed'
                          ? 'bg-green-500/20 text-green-400'
                          : tx.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-cyan-500/20 text-cyan-400'
                      }`}
                    >
                      {tx.status === 'confirmed'
                        ? '완료'
                        : tx.status === 'pending'
                        ? '대기'
                        : '처리중'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 스마트 거래 배너 */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-30 blur"></div>
        <div className="relative bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm mb-1">스마트 거래 사용중</p>
              <p className="text-purple-300 text-xs">빠르고 안전한 거래를 경험하세요</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}