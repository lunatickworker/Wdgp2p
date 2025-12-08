import { LayoutDashboard, Users, Receipt, TrendingUp, DollarSign, Coins, Zap, Shield, MessageCircle, Settings, Home, Repeat, Store, User, Activity } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user } = useAuth();

  // Center Admin 메뉴 (센터 관리자)
  const centerMenuItems = [
    { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { id: "users-wallets", label: "사용자 & 지갑", icon: Users },
    { id: "store-management", label: "가맹점 관리", icon: Store },
    { id: "account-verifications", label: "계좌인증 관리", icon: Shield },
    { id: "deposit-withdrawal", label: "입출금 관리", icon: Receipt },
    { id: "swaps", label: "스왑 관리", icon: Repeat },
    { id: "settlement", label: "정산 관리", icon: DollarSign },
    { id: "support-center", label: "고객센터", icon: MessageCircle },
  ];

  // Master Admin 메뉴 (마스터 관리자만)
  const masterMenuItems = [
    { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { id: "users-wallets", label: "사용자 & 지갑", icon: Users },
    { id: "store-management", label: "가맹점 관리", icon: Store },
    { id: "account-verifications", label: "계좌인증 관리", icon: Shield },
    { id: "deposit-withdrawal", label: "입출금 관리", icon: Receipt },
    { id: "swaps", label: "스왑 관리", icon: Repeat },
    { id: "settlement", label: "정산 관리", icon: DollarSign },
    { id: "coins", label: "코인 관리", icon: Coins },
    { id: "gas-policy", label: "가스비 정책", icon: Zap },
    { id: "security", label: "보안 모니터", icon: Shield },
  ];

  // Store Admin 메뉴 (가맹점 관리자) - 제한된 기능만
  const storeMenuItems = [
    { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { id: "users-wallets", label: "소속 회원", icon: Users },
    { id: "deposit-withdrawal", label: "거래 내역", icon: TrendingUp },
  ];

  // Agency Admin 메뉴 (에이전시 관리자)
  const agencyMenuItems = [
    { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { id: "users-wallets", label: "사용자 & 지갑", icon: Users },
    { id: "deposit-withdrawal", label: "거래 내역", icon: Receipt },
    { id: "settlement", label: "정산 관리", icon: DollarSign },
  ];

  // Role에 따라 메뉴 결정
  let menuItems = centerMenuItems; // 기본값
  
  if (user?.role === 'store') {
    menuItems = storeMenuItems;
  } else if (user?.role === 'agency') {
    menuItems = agencyMenuItems;
  } else if (user?.role === 'center' || user?.role === 'admin') {
    menuItems = centerMenuItems;
  } else if (user?.role === 'master') {
    menuItems = masterMenuItems;
  }

  return (
    <aside className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-cyan-500/20">
      <div className="p-6">
        <button 
          onClick={() => {
            if (user?.role === 'master') {
              // 마스터: 사용자 로그인 페이지로
              window.location.hash = '#';
              window.location.reload();
            } else {
              // 에이전시/센터/가맹점: 대시보드로
              setActiveTab('dashboard');
            }
          }}
          className="flex items-center gap-3 mb-8 group w-full hover:scale-105 transition-transform"
        >
          <div 
            className="w-10 h-10 rounded-lg bg-slate-800 border-2 border-cyan-500 flex items-center justify-center transition-all"
            style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.6), inset 0 0 15px rgba(6, 182, 212, 0.2)' }}
          >
            <Activity className="w-6 h-6 text-cyan-400" style={{ filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 1))' }} />
          </div>
          <div>
            <h1 className="text-cyan-400 group-hover:text-cyan-300 transition-colors">GMS</h1>
            <p className="text-slate-400 text-xs">Crypto Management</p>
          </div>
        </button>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                  isActive
                    ? "bg-cyan-500/20 border border-cyan-500/50 shadow-lg shadow-cyan-500/20 text-cyan-400"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-cyan-300 border border-transparent"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}