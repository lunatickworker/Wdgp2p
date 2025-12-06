import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Activity } from 'lucide-react';

interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  image: string;
}

export function CryptoPriceTicker() {
  const [prices, setPrices] = useState<CoinPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 주요 코인 목록
  const COINS = ['bitcoin', 'ethereum', 'tether', 'usd-coin', 'binancecoin', 'ripple'];

  const fetchPrices = async () => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINS.join(',')}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }
      
      const data = await response.json();
      setPrices(data);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // 초기 로드
    fetchPrices();

    // 1분마다 업데이트
    const interval = setInterval(fetchPrices, 60000);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else if (price >= 1) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
    }
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1_000_000_000_000) {
      return `$${(marketCap / 1_000_000_000_000).toFixed(2)}T`;
    } else if (marketCap >= 1_000_000_000) {
      return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
    } else if (marketCap >= 1_000_000) {
      return `$${(marketCap / 1_000_000).toFixed(2)}M`;
    }
    return `$${marketCap.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-cyan-400 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            실시간 암호화폐 시세
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-3 animate-pulse">
              <div className="h-4 bg-slate-700 rounded mb-2"></div>
              <div className="h-6 bg-slate-700 rounded mb-2"></div>
              <div className="h-3 bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-cyan-400 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          실시간 암호화폐 시세
        </h3>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}</span>
          <button
            onClick={fetchPrices}
            className="p-1 hover:bg-slate-700/50 rounded transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {prices.map((coin) => {
          const isPositive = coin.price_change_percentage_24h >= 0;
          
          return (
            <div
              key={coin.id}
              className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30 hover:border-cyan-500/30 transition-all"
            >
              {/* 코인 아이콘 & 심볼 */}
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src={coin.image} 
                  alt={coin.name}
                  className="w-5 h-5 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-400 truncate">{coin.name}</div>
                  <div className="text-xs text-slate-500 uppercase">{coin.symbol}</div>
                </div>
              </div>

              {/* 현재 가격 */}
              <div className="mb-1">
                <div className="text-white truncate">
                  {formatPrice(coin.current_price)}
                </div>
              </div>

              {/* 24시간 변동률 */}
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1 text-xs ${
                  isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>
                    {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                  </span>
                </div>
                <div className="text-xs text-slate-500" title="시가총액">
                  {formatMarketCap(coin.market_cap)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CoinGecko 크레딧 */}
      <div className="mt-3 text-xs text-slate-500 text-center">
        Powered by{' '}
        <a
          href="https://www.coingecko.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          CoinGecko
        </a>
      </div>
    </div>
  );
}