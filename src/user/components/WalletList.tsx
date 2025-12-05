import { Plus, Wallet, ChevronRight, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { Screen, WalletData, CoinType } from '../App';
import { getCoinRateSync, preloadCoinRates } from '../utils/helpers';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase/client';

interface WalletListProps {
  wallets: WalletData[];
  onNavigate: (screen: Screen) => void;
  onSelectCoin: (coin: CoinType) => void;
}

export function WalletList({ wallets, onNavigate, onSelectCoin }: WalletListProps) {
  const [showBalance, setShowBalance] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [prices, setPrices] = useState<{ [key: string]: number }>({});
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

  useEffect(() => {
    preloadCoinRates().then(() => {
      const priceMap: { [key: string]: number } = {};
      wallets.forEach(wallet => {
        priceMap[wallet.coin_type] = getCoinRateSync(wallet.coin_type);
      });
      setPrices(priceMap);
    });
  }, [wallets]);

  useEffect(() => {
    const total = wallets.reduce((sum, wallet) => {
      const price = prices[wallet.coin_type] || 0;
      return sum + (wallet.balance * price);
    }, 0);
    setTotalBalance(total);
  }, [wallets, prices]);

  return (
    <div className="space-y-6">
      {/* PC 제목 */}
      <div className="hidden lg:block mb-6">
        <h2 className="text-white text-2xl">내 지갑</h2>
        <p className="text-slate-400 text-sm">보유 중인 암호화폐</p>
      </div>

      {/* 총 자산 카드 */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl opacity-30 group-hover:opacity-40 blur transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-cyan-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">총 자산 평가액</span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>

          {showBalance ? (
            <div className="text-white text-3xl mb-2">
              ₩{totalBalance.toLocaleString()}
            </div>
          ) : (
            <div className="text-white text-3xl mb-2">••••••••</div>
          )}
          
          <div className="text-slate-400 text-sm">
            {wallets.length}개 지갑
          </div>
        </div>
      </div>

      {/* 지갑이 없을 때 */}
      {wallets.length === 0 && (
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur"></div>
          <div className="relative bg-slate-800/50 border-2 border-dashed border-cyan-500/30 rounded-2xl p-12">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-slate-700/50 border-2 border-cyan-500/30 flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-10 h-10 text-cyan-400/50" />
              </div>
              <h3 className="text-white mb-2">아직 지갑이 없습니다</h3>
              <p className="text-slate-400 text-sm mb-6">
                관리자에게 요청하여 지갑을 생성하세요
              </p>
              
              {/* 안내 카드 */}
              <div className="bg-slate-900/50 border border-cyan-500/20 rounded-xl p-4 text-left">
                <h4 className="text-cyan-400 mb-3 text-sm">지갑 생성 방법</h4>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 shrink-0">1.</span>
                    <span>관리자에게 지갑 생성을 요청합니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 shrink-0">2.</span>
                    <span>승인 후 지갑이 자동으로 생성됩니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 shrink-0">3.</span>
                    <span>생성된 지갑으로 입금/출금이 가능합니다</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onNavigate('home')}
                className="mt-6 w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
              >
                홈으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 지갑 목록 */}
      {wallets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white">내 지갑 목록</h3>
            <span className="text-slate-400 text-sm">{wallets.length}개</span>
          </div>

          <div className="space-y-3">
            {wallets.map((wallet) => {
              const price = prices[wallet.coin_type] || 0;
              const value = wallet.balance * price;

              return (
                <button
                  key={wallet.wallet_id}
                  onClick={() => {
                    onSelectCoin(wallet.coin_type);
                    onNavigate('wallet-detail');
                  }}
                  className="w-full group"
                >
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/0 to-purple-500/0 group-hover:from-cyan-500/30 group-hover:to-purple-500/30 rounded-xl blur transition-all"></div>
                    <div className="relative bg-slate-800/50 border border-slate-700/50 group-hover:border-cyan-500/50 rounded-xl p-4 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* 코인 아이콘 */}
                          <div 
                            className="w-12 h-12 rounded-full bg-slate-700 border-2 border-cyan-500/30 group-hover:border-cyan-500 flex items-center justify-center transition-all overflow-hidden"
                            style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)' }}
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
                                    fallback.className = 'fallback-text text-cyan-400 group-hover:text-cyan-300';
                                    fallback.style.filter = 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.8))';
                                    fallback.textContent = wallet.coin_type;
                                    parent.appendChild(fallback);
                                  }
                                }}
                              />
                            ) : (
                              <span className="text-cyan-400 group-hover:text-cyan-300" style={{ filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.8))' }}>
                                {wallet.coin_type}
                              </span>
                            )}
                          </div>

                          {/* 지갑 정보 */}
                          <div className="text-left">
                            <div className="text-white mb-1">
                              {showBalance ? wallet.balance.toString() : '••••••'} {wallet.coin_type}
                            </div>
                            <div className="text-slate-400 text-sm">
                              {showBalance ? `≈ ₩${value.toLocaleString()}` : '••••••'}
                            </div>
                          </div>
                        </div>

                        {/* 화살표 */}
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                      </div>

                      {/* 상태 뱃지 */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-md text-xs ${
                          wallet.status === 'active' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {wallet.status === 'active' ? '활성' : '비활성'}
                        </span>
                        <span className="text-xs text-slate-500 truncate">
                          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 빠른 액션 */}
      {wallets.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('deposit')}
            className="relative overflow-hidden rounded-2xl transition-all active:scale-98"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600"></div>
            <div className="relative px-6 py-4 flex flex-col items-center justify-center gap-2">
              <Plus className="w-6 h-6 text-white" />
              <span className="text-white">입금하기</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('withdrawal')}
            className="relative overflow-hidden rounded-2xl transition-all active:scale-98"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600"></div>
            <div className="relative px-6 py-4 flex flex-col items-center justify-center gap-2">
              <TrendingUp className="w-6 h-6 text-white" />
              <span className="text-white">출금하기</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}