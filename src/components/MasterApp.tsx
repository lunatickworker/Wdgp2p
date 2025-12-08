import { useState } from "react";
import { Building2, Settings, Globe, Users, TrendingUp, DollarSign, Coins, Zap, Shield } from "lucide-react";
import { CenterManagementCompact } from "./master/CenterManagementCompact";
import { MasterDashboard } from "./master/MasterDashboard";
import { DomainManagement } from "./admin/DomainManagement";
import { AgencyManagementCompact } from "./master/AgencyManagementCompact";
import { SystemSettings } from "./master/SystemSettings";
import { SettlementManagement } from "./master/SettlementManagement";
import { CoinManagement } from "./master/CoinManagement";
import { GasPolicyManagement } from "./master/GasPolicyManagement";
import { SecurityMonitor } from "./master/SecurityMonitor";
import { Header } from "./Header";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";

export function MasterApp() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const handleLogoClick = async () => {
    try {
      // 로그아웃 처리
      await supabase.auth.signOut();
      
      // 사용자 로그인 페이지로 이동
      window.location.href = '/';
    } catch (error) {
      console.error('로그아웃 오류:', error);
      toast.error('로그아웃에 실패했습니다');
    }
  };

  const menuItems = [
    { id: "dashboard", label: "대시보드", icon: TrendingUp },
    { id: "centers", label: "센터 관리", icon: Building2 },
    { id: "domains", label: "도메인 관리", icon: Globe },
    { id: "agencies", label: "에이전시 관리", icon: Users },
    { id: "settlement", label: "정산 관리", icon: DollarSign },
    { id: "coins", label: "코인 관리", icon: Coins },
    { id: "gas-policy", label: "가스비 정책", icon: Zap },
    { id: "security", label: "보안 모니터", icon: Shield },
    { id: "settings", label: "시스템 설정", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-cyan-500/20">
          <div className="p-6">
            <div 
              className="flex items-center gap-3 mb-8 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleLogoClick}
            >
              <div 
                className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center"
                style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.6)' }}
              >
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-cyan-400">GMS Master</h1>
                <p className="text-slate-400 text-xs">관리자 콘솔</p>
              </div>
            </div>

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
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header onNavigate={setActiveTab} />
          
          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-6">
            {activeTab === "dashboard" && <MasterDashboard onNavigate={setActiveTab} />}
            {activeTab === "centers" && <CenterManagementCompact />}
            {activeTab === "domains" && <DomainManagement />}
            {activeTab === "agencies" && <AgencyManagementCompact />}
            {activeTab === "settlement" && <SettlementManagement />}
            {activeTab === "coins" && <CoinManagement />}
            {activeTab === "gas-policy" && <GasPolicyManagement />}
            {activeTab === "security" && <SecurityMonitor />}
            {activeTab === "settings" && <SystemSettings />}
          </main>
        </div>
      </div>
    </div>
  );
}