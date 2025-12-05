import { ChevronRight, Copy, QrCode, ArrowDownToLine, ArrowUpFromLine, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Screen, WalletData, Transaction, CoinType } from '../App';
import { getCoinRateSync, preloadCoinRates } from '../utils/helpers';
import { toast } from 'sonner@2.0.3';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase/client';

interface WalletDetailProps {
  wallets: WalletData[];
  transactions: Transaction[];
  selectedCoin: CoinType;
  onNavigate: (screen: Screen) => void;
}

export function WalletDetail({ wallets, transactions, selectedCoin, onNavigate }: WalletDetailProps) {
  const wallet = wallets.find(w => w.coin_type === selectedCoin);
  const [coinRate, setCoinRate] = useState(0);
  const [coinIcon, setCoinIcon] = useState<string | null>(null);
  
  // 코인 아이콘 로드
  useEffect(() => {
    const fetchCoinIcon = async () => {
      try {
        const { data } = await supabase
          .from('supported_tokens')
          .select('icon_url')
          .eq('symbol', selectedCoin)
          .single();
        
        if (data?.icon_url) {
          setCoinIcon(data.icon_url);
        }
      } catch (error) {
        console.error('Error fetching coin icon:', error);
      }
    };

    fetchCoinIcon();
  }, [selectedCoin]);
  
  // 가격 로드
  useEffect(() => {
    preloadCoinRates().then(() => {
      if (wallet) {
        setCoinRate(getCoinRateSync(wallet.coin_type));
      }
    });
  }, [wallet]);
  
  if (!wallet) {
    return (
      <div className="text-slate-400 text-center p-8">
        지갑을 찾을 수 없습니다
      </div>
    );
  }

  const value = parseFloat(wallet.balance.toString()) * coinRate;

  const copyAddress = async (address: string) => {
    try {
      // Fallback 방식을 기본으로 사용 (권한 문제 회피)
      const textArea = document.createElement('textarea');
      textArea.value = address;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        toast.success('주소가 복사되었습니다');
      } else {
        throw new Error('Copy command failed');
      }
    } catch (err) {
      toast.error('자동 복사가 지원되지 않습니다. 주소를 직접 복사해주세요.');
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('wallets')} 
        className="lg:hidden flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span>뒤로</span>
      </button>
      
      <div className="hidden lg:block">
        <h2 className="text-white text-2xl">지갑 상세</h2>
        <p className="text-slate-400 text-sm">{selectedCoin} 지갑 정보</p>
      </div>

      <div className="text-center py-8">
        <div 
          className="w-20 h-20 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center mx-auto mb-4"
          style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.6), inset 0 0 20px rgba(6, 182, 212, 0.2)' }}
        >
          {coinIcon ? (
            <img 
              src={coinIcon} 
              alt={`${selectedCoin} Icon`} 
              className="w-10 h-10" 
              style={{ filter: 'drop-shadow(0 0 5px rgba(6, 182, 212, 1))' }}
            />
          ) : (
            <span className="text-cyan-400 text-2xl" style={{ filter: 'drop-shadow(0 0 5px rgba(6, 182, 212, 1))' }}>{wallet.coin_type}</span>
          )}
        </div>
        <div className="text-3xl text-white mb-2">{wallet.balance.toString()} {wallet.coin_type}</div>
        <div className="text-slate-400">≈ ₩{value.toLocaleString()}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('deposit')}
          className="relative overflow-hidden rounded-2xl transition-all active:scale-98"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600"></div>
          <div className="relative px-6 py-4 flex flex-col items-center justify-center gap-2">
            <ArrowDownLeft className="w-6 h-6 text-white" />
            <span className="text-white">입금하기</span>
          </div>
        </button>
        
        <button
          onClick={() => onNavigate('withdrawal')}
          className="relative overflow-hidden rounded-2xl transition-all active:scale-98"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600"></div>
          <div className="relative px-6 py-4 flex flex-col items-center justify-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-white" />
            <span className="text-white">출금하기</span>
          </div>
        </button>
      </div>

      <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4">
        <div className="text-slate-300 mb-3">내 지갑 주소</div>
        <div className="bg-slate-900/50 rounded-lg p-4 mb-3 flex justify-center">
          <div className="p-3 bg-white rounded-xl">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(wallet.address)}`}
              alt="QR Code"
              className="w-32 h-32"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-900/50 rounded-lg p-3 text-slate-300 text-sm truncate">
            {wallet.address}
          </div>
          <button
            onClick={() => copyAddress(wallet.address)}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 px-4 py-3 rounded-lg transition-all"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-slate-300 mb-3">최근 거래</h3>
        <div className="space-y-2">
          {transactions
            .filter(tx => tx.coin_type === selectedCoin)
            .slice(0, 5)
            .map((tx) => (
              <div key={tx.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white">
                      {tx.type === 'deposit' ? '입금' : '출금'} {tx.status === 'confirmed' || tx.status === 'completed' ? '완료' : '대기'}
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className={tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}>
                    {tx.type === 'deposit' ? '+' : '-'}{tx.amount}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}