import { Home, Wallet, ArrowLeftRight, User, Activity } from 'lucide-react';
import { Screen } from '../App';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export function Sidebar({ currentScreen, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: 'home' as Screen, icon: Home, label: '홈' },
    { id: 'wallets' as Screen, icon: Wallet, label: '지갑' },
    { id: 'transactions' as Screen, icon: ArrowLeftRight, label: '거래' },
    { id: 'settings' as Screen, icon: User, label: '더보기' },
  ];

  return (
    <div className="hidden lg:flex flex-col w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white">GMS Wallet</h1>
            <p className="text-slate-400 text-xs">암호화폐 지갑</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id || 
              (item.id === 'wallets' && currentScreen === 'wallet-detail');
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
