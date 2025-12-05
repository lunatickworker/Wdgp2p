import { useState } from "react";
import { UserWalletManagement } from "./UserWalletManagement";
import { SecurityMonitor } from "./SecurityMonitor";
import { SwapManagement } from "./SwapManagement";
import { CoinManagement } from "./CoinManagement";
import { AccountVerificationManagement } from "./AccountVerificationManagement";
import { GasSponsorshipPolicy } from "./GasSponsorshipPolicy";
import { SupportCenter } from "./SupportCenter";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Dashboard } from "./Dashboard";
import { DepositWithdrawalManagement } from "./DepositWithdrawalManagement";
import { StoreManagement } from "./StoreManagement";
import { SettlementManagement as CenterSettlement } from "./center/SettlementManagement";
import { SettlementManagement as AgencySettlement } from "./agency/SettlementManagement";
import { useAuth } from "../contexts/AuthContext";

export function AdminApp() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const { user } = useAuth();

  // 템플릿에 따라 배경색 변경
  const getBackgroundStyle = () => {
    if (!user?.templateId || user.templateId === 'modern') {
      // Modern: 기본 다크 블루/사이언
      return {
        background: 'linear-gradient(to bottom right, rgb(15 23 42), rgb(30 41 59), rgb(15 23 42))',
        primaryGlow: 'bg-cyan-500/5',
        secondaryGlow: 'bg-purple-500/5'
      };
    } else if (user.templateId === 'classic') {
      // Classic: 화이트/베이지
      return {
        background: 'linear-gradient(to bottom right, rgb(249 250 251), rgb(243 244 246), rgb(255 255 255))',
        primaryGlow: 'bg-amber-500/10',
        secondaryGlow: 'bg-slate-500/10'
      };
    } else if (user.templateId === 'minimal') {
      // Minimal: 라이트 그레이
      return {
        background: 'linear-gradient(to bottom right, rgb(255 255 255), rgb(249 250 251), rgb(255 255 255))',
        primaryGlow: 'bg-gray-500/5',
        secondaryGlow: 'bg-gray-500/5'
      };
    } else if (user.templateId === 'gaming') {
      // Gaming: 다크 퍼플/그린
      return {
        background: 'linear-gradient(to bottom right, rgb(17 24 39), rgb(31 41 55), rgb(17 24 39))',
        primaryGlow: 'bg-green-500/10',
        secondaryGlow: 'bg-purple-500/10'
      };
    } else if (user.templateId === 'luxury') {
      // Luxury: 다크 골드
      return {
        background: 'linear-gradient(to bottom right, rgb(17 24 39), rgb(31 41 55), rgb(17 24 39))',
        primaryGlow: 'bg-yellow-500/10',
        secondaryGlow: 'bg-rose-500/10'
      };
    }
    
    // 기본값
    return {
      background: 'linear-gradient(to bottom right, rgb(15 23 42), rgb(30 41 59), rgb(15 23 42))',
      primaryGlow: 'bg-cyan-500/5',
      secondaryGlow: 'bg-purple-500/5'
    };
  };

  const bgStyle = getBackgroundStyle();

  return (
    <div className="min-h-screen" style={{ background: bgStyle.background }}>
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-96 h-96 ${bgStyle.primaryGlow} rounded-full blur-3xl`}></div>
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 ${bgStyle.secondaryGlow} rounded-full blur-3xl`}></div>
      </div>

      <div className="relative flex h-screen">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onNavigate={setActiveTab} />
          
          <main className="flex-1 overflow-y-auto p-6">
            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "users-wallets" && <UserWalletManagement />}
            {activeTab === "store-management" && <StoreManagement />}
            {activeTab === "account-verifications" && <AccountVerificationManagement />}
            {activeTab === "gas-policy" && <GasSponsorshipPolicy />}
            {activeTab === "deposit-withdrawal" && <DepositWithdrawalManagement />}
            {activeTab === "swaps" && <SwapManagement />}
            {activeTab === "settlement" && (user?.role === 'agency' ? <AgencySettlement /> : <CenterSettlement />)}
            {activeTab === "coins" && <CoinManagement />}
            {activeTab === "security" && <SecurityMonitor />}
            {activeTab === "support-center" && <SupportCenter />}
          </main>
        </div>
      </div>
    </div>
  );
}