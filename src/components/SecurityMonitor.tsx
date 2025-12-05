import { Shield, AlertTriangle, Activity, Globe, Lock, Eye } from "lucide-react";
import { NeonCard } from "./NeonCard";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface SecurityAlert {
  log_id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  created_at: string;
  status: 'pending' | 'resolved' | 'monitoring' | 'blocked';
}

interface IPWhitelist {
  whitelist_id: string;
  ip_address: string;
  label: string;
  status: 'active' | 'inactive';
  last_access: string;
}

export function SecurityMonitor() {
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [ipWhitelist, setIPWhitelist] = useState<IPWhitelist[]>([]);
  const [loading, setLoading] = useState(false); // 즉시 UI 표시
  const [stats, setStats] = useState({
    high: 0,
    medium: 0,
    resolved: 0,
    activeIPs: 0
  });

  useEffect(() => {
    fetchData();

    // 실시간 업데이트
    const channel = supabase
      .channel('security-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_logs' }, () => {
        fetchSecurityAlerts();
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ip_whitelist' }, () => {
        fetchIPWhitelist();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchSecurityAlerts(), fetchIPWhitelist(), fetchStats()]);
    } catch (error) {
      console.error('Security data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityAlerts = async () => {
    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Security alerts fetch error:', error);
      toast.error('보안 알림을 불러오는데 실패했습니다');
      return;
    }

    setSecurityAlerts(data || []);
  };

  const fetchIPWhitelist = async () => {
    const { data, error } = await supabase
      .from('ip_whitelist')
      .select('*')
      .order('last_access', { ascending: false });

    if (error) {
      console.error('IP whitelist fetch error:', error);
      return;
    }

    setIPWhitelist(data || []);
  };

  const fetchStats = async () => {
    const { count: high } = await supabase
      .from('security_logs')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'high')
      .neq('status', 'resolved');

    const { count: medium } = await supabase
      .from('security_logs')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'medium')
      .neq('status', 'resolved');

    const { count: resolved } = await supabase
      .from('security_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved');

    const { count: activeIPs } = await supabase
      .from('ip_whitelist')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    setStats({
      high: high || 0,
      medium: medium || 0,
      resolved: resolved || 0,
      activeIPs: activeIPs || 0
    });
  };

  const handleResolveAlert = async (logId: string) => {
    const { error } = await supabase
      .from('security_logs')
      .update({ status: 'resolved' })
      .eq('log_id', logId);

    if (error) {
      toast.error('알림을 해결하는데 실패했습니다');
      return;
    }

    toast.success('보안 알림이 해결되었습니다');
    fetchSecurityAlerts();
    fetchStats();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "low":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "blocked":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "resolved":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "monitoring":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getSeverityLabel = (severity: string) => {
    const map: { [key: string]: string } = {
      'critical': '위급',
      'high': '높음',
      'medium': '중간',
      'low': '낮음'
    };
    return map[severity] || severity;
  };

  const getStatusLabel = (status: string) => {
    const map: { [key: string]: string } = {
      'pending': '대기중',
      'blocked': '차단됨',
      'resolved': '해결됨',
      'monitoring': '모니터링'
    };
    return map[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-cyan-400 mb-1">보안 모니터</h2>
          <p className="text-slate-400 text-sm">실시간 보안 이벤트 및 이상 거래 탐지</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 text-sm">시스템 정상</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 text-2xl">{stats.high}</span>
            </div>
            <p className="text-slate-400 text-sm">높은 위험도</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 text-2xl">{stats.medium}</span>
            </div>
            <p className="text-slate-400 text-sm">중간 위험도</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-2xl">{stats.resolved}</span>
            </div>
            <p className="text-slate-400 text-sm">해결됨</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-400 text-2xl">{stats.activeIPs}</span>
            </div>
            <p className="text-slate-400 text-sm">활성 IP</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Security Alerts */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            보안 알림
          </h3>

          {securityAlerts.map((alert) => (
            <NeonCard key={alert.log_id}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs border ${getSeverityColor(alert.severity)}`}>
                        {getSeverityLabel(alert.severity)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(alert.status)}`}>
                        {getStatusLabel(alert.status)}
                      </span>
                    </div>
                    <h4 className="text-slate-200 mb-1">{alert.event_type}</h4>
                    <p className="text-slate-400 text-sm">{alert.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                  <span className="text-slate-500 text-xs">{alert.created_at}</span>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all text-xs">
                      상세보기
                    </button>
                    {alert.status === "pending" && (
                      <button
                        className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all text-xs"
                        onClick={() => handleResolveAlert(alert.log_id)}
                      >
                        해결
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </NeonCard>
          ))}
        </div>

        {/* IP Whitelist */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-200 flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              IP 화이트리스트
            </h3>
            <button className="px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all text-xs">
              추가
            </button>
          </div>

          <NeonCard>
            <div className="space-y-3">
              {ipWhitelist.map((ip, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    ip.status === "active"
                      ? "bg-slate-800/30 border-slate-700/50"
                      : "bg-slate-800/20 border-slate-700/30 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        ip.status === "active" ? "bg-green-400 animate-pulse" : "bg-slate-500"
                      }`}></div>
                      <code className="text-cyan-400 text-sm">{ip.ip_address}</code>
                    </div>
                    <Lock className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-xs mb-1">{ip.label}</p>
                  <p className="text-slate-500 text-xs">마지막 접근: {ip.last_access}</p>
                </div>
              ))}
            </div>
          </NeonCard>

          <NeonCard>
            <div className="space-y-3">
              <h4 className="text-slate-200 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                보안 설정
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                  <span className="text-slate-400">2FA 필수</span>
                  <span className="text-green-400">활성화</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                  <span className="text-slate-400">IP 제한</span>
                  <span className="text-green-400">활성화</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                  <span className="text-slate-400">다중 서명</span>
                  <span className="text-green-400">활성화</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                  <span className="text-slate-400">자동 탐지</span>
                  <span className="text-green-400">활성화</span>
                </div>
              </div>

              <button className="w-full px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all text-sm">
                보안 설정 관리
              </button>
            </div>
          </NeonCard>
        </div>
      </div>
    </div>
  );
}