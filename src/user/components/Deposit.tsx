import { useState, useEffect } from 'react';
import { ArrowLeft, Copy, QrCode, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Screen, WalletData, CoinType } from '../App';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';

interface DepositProps {
  wallets: WalletData[];
  selectedCoin: CoinType;
  onNavigate: (screen: Screen) => void;
  onSelectCoin: (coin: CoinType) => void;
}

export function Deposit({ wallets, selectedCoin, onNavigate, onSelectCoin }: DepositProps) {
  const { user } = useAuth();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
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

  // 실시간 입금 감지
  useEffect(() => {
    setIsListening(true);

    // 최근 입금 내역 조회
    const fetchRecentDeposits = async () => {
      const { data } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user?.id)
        .eq('coin_type', selectedCoin)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setRecentDeposits(data);
      }
    };

    fetchRecentDeposits();

    // 실시간 업데이트
    const channel = supabase
      .channel('deposit-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deposits',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          toast.success('새로운 입금이 감지되었습니다!');
          fetchRecentDeposits();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deposits',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          if (payload.new.status === 'confirmed') {
            toast.success('입금이 확인되었습니다!');
          }
          fetchRecentDeposits();
        }
      )
      .subscribe();

    return () => {
      setIsListening(false);
      supabase.removeChannel(channel);
    };
  }, [user, selectedCoin]);

  const handleCopyAddress = async () => {
    if (selectedWallet?.address) {
      try {
        // Fallback 방식을 기본으로 사용 (권한 문제 회피)
        const textArea = document.createElement('textarea');
        textArea.value = selectedWallet.address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopiedAddress(true);
          toast.success('주소가 복사되었습니다');
          setTimeout(() => setCopiedAddress(false), 2000);
        } else {
          throw new Error('Copy command failed');
        }
      } catch (err) {
        // 복사 실패시 사용자에게 주소 표시
        toast.error('자동 복사가 지원되지 않습니다. 주소를 직접 복사해주세요.');
        console.error('Copy failed:', err);
      }
    }
  };

  const getNetworkInfo = (coin: CoinType) => {
    const networks: { [key: string]: string } = {
      BTC: 'Bitcoin Network',
      ETH: 'Ethereum (ERC-20)',
      USDT: 'Ethereum (ERC-20)',
      USDC: 'Ethereum (ERC-20)',
      BNB: 'BNB Smart Chain',
      KRWQ: 'KRWQ Network'
    };
    return networks[coin] || 'Unknown';
  };

  const getMinDeposit = (coin: CoinType) => {
    const minimums: { [key: string]: string } = {
      BTC: '0.0001',
      ETH: '0.01',
      USDT: '10',
      USDC: '10',
      BNB: '0.01',
      KRWQ: '1000'
    };
    return minimums[coin] || '0';
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
          <h2 className="text-white text-xl lg:text-2xl">입금</h2>
          <p className="text-slate-400 text-sm">코인을 입금하세요</p>
        </div>
      </div>

      {/* 코인 선택 */}
      <div>
        <label className="block text-slate-300 mb-3">코인 선택</label>
        <div className="grid grid-cols-5 gap-2">
          {coins.map((coin) => (
            <button
              key={coin}
              onClick={() => onSelectCoin(coin)}
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
      </div>

      {/* 네트워크 정보 */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-400 text-sm mb-1">네트워크 확인</p>
            <p className="text-amber-300 text-xs">
              {getNetworkInfo(selectedCoin)} 네트워크만 지원합니다. 
              다른 네트워크로 전송시 자산을 잃을 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* QR 코드 및 주소 */}
      {selectedWallet ? (
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-800 border border-cyan-500/30 rounded-2xl p-6">
            {/* QR 코드 */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white rounded-2xl">
                {selectedWallet?.address ? (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(selectedWallet.address)}`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* 주소 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">입금 주소</span>
                <div className="flex items-center gap-2">
                  {isListening && (
                    <div className="flex items-center gap-1 text-green-400 text-xs">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      실시간 감지중
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 pr-12 break-all text-cyan-400 text-sm">
                  {selectedWallet.address}
                </div>
                <button
                  onClick={handleCopyAddress}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center hover:bg-cyan-500/30 transition-all active:scale-95"
                >
                  {copiedAddress ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-cyan-400" />
                  )}
                </button>
              </div>
            </div>

            {/* 최소 입금액 */}
            <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">최소 입금액</span>
                <span className="text-white">{getMinDeposit(selectedCoin)} {selectedCoin}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-800/30 border border-slate-700/50 rounded-xl">
          <p className="text-slate-400">선택한 코인의 지갑이 없습니다</p>
        </div>
      )}

      {/* 입금 안내 */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <h3 className="text-white text-sm mb-3">입금 안내</h3>
        <div className="space-y-2 text-xs text-slate-400">
          <p>• 위 주소로만 {selectedCoin}을 전송하세요</p>
          <p>• 최소 입금액 미만은 입금되지 않습니다</p>
          <p>• 네트워크 확인 후 {getNetworkInfo(selectedCoin)}로만 전송하세요</p>
          <p>• 입금은 실시간으로 자동 감지됩니다</p>
          <p>• 블록체인 확인 후 자동으로 지갑에 반영됩니다</p>
        </div>
      </div>

      {/* 최근 입금 내역 */}
      {recentDeposits.length > 0 && (
        <div>
          <h3 className="text-white mb-3">최근 입금 내역</h3>
          <div className="space-y-2">
            {recentDeposits.map((deposit) => (
              <div
                key={deposit.deposit_id}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white">+{deposit.amount} {deposit.coin_type}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      deposit.status === 'confirmed'
                        ? 'bg-green-500/20 text-green-400'
                        : deposit.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-cyan-500/20 text-cyan-400'
                    }`}
                  >
                    {deposit.status === 'confirmed'
                      ? '확인 완료'
                      : deposit.status === 'pending'
                      ? '확인 중'
                      : '처리 중'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(deposit.created_at).toLocaleString('ko-KR')}</span>
                  {deposit.tx_hash && (
                    <span className="truncate max-w-[120px]">{deposit.tx_hash}</span>
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