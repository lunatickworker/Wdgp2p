import { Wallet } from 'lucide-react';
import { Screen } from '../App';
import { NotificationCenter } from '../../components/NotificationCenter';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

interface TopBarProps {
  currentScreen: Screen;
}

export function TopBar({ currentScreen }: TopBarProps) {
  const { user } = useAuth();
  const { notifications } = useNotifications(user?.id, false);
  
  const getTitle = () => {
    switch (currentScreen) {
      case 'home': return '홈';
      case 'wallets': return '내 지갑';
      case 'wallet-detail': return '지갑 상세';
      case 'deposit': return '입금';
      case 'withdrawal': return '출금';
      case 'swap': return '스왑';
      case 'transactions': return '거래 내역';
      case 'settings': return '설정';
      case 'transfer-request': return '전송 요청';
      case 'coin-purchase': return '코인 구매';
      case 'account-verification': return '계좌 인증';
      default: return '';
    }
  };

  return (
    <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-cyan-500/20 p-4 z-10" style={{ zIndex: 9999 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              window.location.hash = '#admin/login';
            }}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-cyan-500/50 flex items-center justify-center hover:border-cyan-400 transition-all active:scale-95"
            style={{
              boxShadow: '0 0 10px rgba(6, 182, 212, 0.3), inset 0 0 10px rgba(6, 182, 212, 0.1)'
            }}
          >
            <Wallet className="w-5 h-5 text-cyan-400" style={{ filter: 'drop-shadow(0 0 2px rgba(6, 182, 212, 0.8))' }} />
          </button>
          <span className="text-white">{getTitle()}</span>
        </div>
        
        {/* 사용자는 알림 벨만 표시 (카테고리 아이콘 제거) */}
        {user?.id && (
          <NotificationCenter 
            userId={user.id} 
            isAdmin={false}
          />
        )}
      </div>
    </div>
  );
}