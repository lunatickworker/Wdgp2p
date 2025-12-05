import { Home, Wallet, ArrowLeftRight, User } from 'lucide-react';
import { Screen } from '../App';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-cyan-500/20 z-20">
      <div className="grid grid-cols-4 gap-1 p-2">
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-all ${
            currentScreen === 'home' ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-300'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs">홈</span>
        </button>
        <button
          onClick={() => onNavigate('wallets')}
          className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-all ${
            currentScreen === 'wallets' || currentScreen === 'wallet-detail' ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-300'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-xs">지갑</span>
        </button>
        <button
          onClick={() => onNavigate('transactions')}
          className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-all ${
            currentScreen === 'transactions' ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-300'
          }`}
        >
          <ArrowLeftRight className="w-5 h-5" />
          <span className="text-xs">거래</span>
        </button>
        <button
          onClick={() => onNavigate('settings')}
          className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-all ${
            currentScreen === 'settings' ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-300'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-xs">더보기</span>
        </button>
      </div>
    </div>
  );
}