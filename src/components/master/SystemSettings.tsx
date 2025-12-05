import { useState, useEffect } from "react";
import { Save, RefreshCw, Shield, Bell, Database, Globe, AlertTriangle, Check } from "lucide-react";
import { NeonCard } from "../NeonCard";
import { supabase } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface SystemSettings {
  // 가스 정책
  gas_sponsorship_enabled: boolean;
  max_gas_limit: string;
  gas_buffer_percentage: number;
  
  // 보안 설정
  two_factor_required: boolean;
  kyc_required: boolean;
  max_login_attempts: number;
  session_timeout_minutes: number;
  
  // 거래 설정
  min_withdrawal_amount: string;
  max_withdrawal_amount: string;
  daily_withdrawal_limit: string;
  withdrawal_fee_percentage: number;
  
  // 알림 설정
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  webhook_url: string;
  
  // 시스템 설정
  maintenance_mode: boolean;
  allow_new_registrations: boolean;
  api_rate_limit: number;
  
  // 네트워크 설정
  default_network: string;
  supported_networks: string[];
}

const DEFAULT_SETTINGS: SystemSettings = {
  gas_sponsorship_enabled: true,
  max_gas_limit: '500000',
  gas_buffer_percentage: 10,
  two_factor_required: false,
  kyc_required: true,
  max_login_attempts: 5,
  session_timeout_minutes: 30,
  min_withdrawal_amount: '10',
  max_withdrawal_amount: '100000',
  daily_withdrawal_limit: '500000',
  withdrawal_fee_percentage: 0.1,
  email_notifications_enabled: true,
  sms_notifications_enabled: false,
  webhook_url: '',
  maintenance_mode: false,
  allow_new_registrations: true,
  api_rate_limit: 100,
  default_network: 'base',
  supported_networks: ['ethereum', 'polygon', 'base', 'arbitrum'],
};

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'gas' | 'security' | 'transaction' | 'notification' | 'system'>('gas');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // system_settings 테이블에서 설정 로드
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        throw error;
      }

      if (data) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
        });
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
      toast.error('설정을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // system_settings 테이블에 저장 (upsert)
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 1, // 단일 설정 레코드
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('설정이 저장되었습니다');
    } catch (error) {
      console.error('설정 저장 실패:', error);
      toast.error('설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
      setSettings(DEFAULT_SETTINGS);
      toast.success('설정이 초기화되었습니다');
    }
  };

  const tabs = [
    { id: 'gas', label: '가스 정책', icon: Globe },
    { id: 'security', label: '보안', icon: Shield },
    { id: 'transaction', label: '거래', icon: Database },
    { id: 'notification', label: '알림', icon: Bell },
    { id: 'system', label: '시스템', icon: AlertTriangle },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-cyan-400 mb-2">시스템 설정</h2>
          <p className="text-slate-400 text-sm">전역 시스템 설정 및 정책 관리</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            초기화
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                저장
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Gas Policy Settings */}
        {activeTab === 'gas' && (
          <NeonCard>
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-cyan-400">가스 정책</h3>
                  <p className="text-slate-400 text-sm">가스 스폰서십 및 한도 설정</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-slate-300">가스 스폰서십 활성화</p>
                  <p className="text-slate-500 text-sm">사용자의 가스비를 시스템이 부담</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, gas_sponsorship_enabled: !settings.gas_sponsorship_enabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.gas_sponsorship_enabled ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.gas_sponsorship_enabled ? 'translate-x-6' : ''
                  }`}></div>
                </button>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">최대 가스 한도</label>
                <input
                  type="text"
                  value={settings.max_gas_limit}
                  onChange={(e) => setSettings({ ...settings, max_gas_limit: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="500000"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">가스 버퍼 (%)</label>
                <input
                  type="number"
                  value={settings.gas_buffer_percentage}
                  onChange={(e) => setSettings({ ...settings, gas_buffer_percentage: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="10"
                  min="0"
                  max="100"
                />
                <p className="text-slate-500 text-xs mt-1">예상 가스에 추가되는 안전 버퍼</p>
              </div>
            </div>
          </NeonCard>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <NeonCard>
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-cyan-400">보안 설정</h3>
                  <p className="text-slate-400 text-sm">인증 및 보안 정책</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-slate-300">2단계 인증 필수</p>
                  <p className="text-slate-500 text-sm">모든 사용자에게 2FA 요구</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, two_factor_required: !settings.two_factor_required })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.two_factor_required ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.two_factor_required ? 'translate-x-6' : ''
                  }`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-slate-300">KYC 인증 필수</p>
                  <p className="text-slate-500 text-sm">거래 전 본인 인증 요구</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, kyc_required: !settings.kyc_required })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.kyc_required ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.kyc_required ? 'translate-x-6' : ''
                  }`}></div>
                </button>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">최대 로그인 시도 횟수</label>
                <input
                  type="number"
                  value={settings.max_login_attempts}
                  onChange={(e) => setSettings({ ...settings, max_login_attempts: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="5"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">세션 타임아웃 (분)</label>
                <input
                  type="number"
                  value={settings.session_timeout_minutes}
                  onChange={(e) => setSettings({ ...settings, session_timeout_minutes: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="30"
                  min="5"
                />
              </div>
            </div>
          </NeonCard>
        )}

        {/* Transaction Settings */}
        {activeTab === 'transaction' && (
          <NeonCard>
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-cyan-400">거래 설정</h3>
                  <p className="text-slate-400 text-sm">출금 한도 및 수수료 설정</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">최소 출금 금액</label>
                  <input
                    type="text"
                    value={settings.min_withdrawal_amount}
                    onChange={(e) => setSettings({ ...settings, min_withdrawal_amount: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    placeholder="10"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">최대 출금 금액</label>
                  <input
                    type="text"
                    value={settings.max_withdrawal_amount}
                    onChange={(e) => setSettings({ ...settings, max_withdrawal_amount: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    placeholder="100000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">일일 출금 한도</label>
                <input
                  type="text"
                  value={settings.daily_withdrawal_limit}
                  onChange={(e) => setSettings({ ...settings, daily_withdrawal_limit: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="500000"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">출금 수수료 (%)</label>
                <input
                  type="number"
                  value={settings.withdrawal_fee_percentage}
                  onChange={(e) => setSettings({ ...settings, withdrawal_fee_percentage: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="0.1"
                  min="0"
                  max="10"
                  step="0.01"
                />
              </div>
            </div>
          </NeonCard>
        )}

        {/* Notification Settings */}
        {activeTab === 'notification' && (
          <NeonCard>
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-cyan-400">알림 설정</h3>
                  <p className="text-slate-400 text-sm">이메일, SMS, 웹훅 설정</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-slate-300">이메일 알림</p>
                  <p className="text-slate-500 text-sm">중요 이벤트 이메일 전송</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, email_notifications_enabled: !settings.email_notifications_enabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.email_notifications_enabled ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.email_notifications_enabled ? 'translate-x-6' : ''
                  }`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-slate-300">SMS 알림</p>
                  <p className="text-slate-500 text-sm">중요 이벤트 SMS 전송</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, sms_notifications_enabled: !settings.sms_notifications_enabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.sms_notifications_enabled ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.sms_notifications_enabled ? 'translate-x-6' : ''
                  }`}></div>
                </button>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">웹훅 URL</label>
                <input
                  type="text"
                  value={settings.webhook_url}
                  onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="https://your-api.com/webhook"
                />
                <p className="text-slate-500 text-xs mt-1">이벤트 발생 시 웹훅 전송</p>
              </div>
            </div>
          </NeonCard>
        )}

        {/* System Settings */}
        {activeTab === 'system' && (
          <NeonCard>
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-cyan-400">시스템 설정</h3>
                  <p className="text-slate-400 text-sm">유지보수 및 API 설정</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div>
                  <p className="text-orange-400">유지보수 모드</p>
                  <p className="text-slate-500 text-sm">활성화 시 일반 사용자 접근 차단</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.maintenance_mode ? 'bg-orange-500' : 'bg-slate-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.maintenance_mode ? 'translate-x-6' : ''
                  }`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-slate-300">신규 회원가입 허용</p>
                  <p className="text-slate-500 text-sm">새로운 사용자 등록 허용 여부</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, allow_new_registrations: !settings.allow_new_registrations })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.allow_new_registrations ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.allow_new_registrations ? 'translate-x-6' : ''
                  }`}></div>
                </button>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">API 요청 제한 (분당)</label>
                <input
                  type="number"
                  value={settings.api_rate_limit}
                  onChange={(e) => setSettings({ ...settings, api_rate_limit: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="100"
                  min="10"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">기본 네트워크</label>
                <select
                  value={settings.default_network}
                  onChange={(e) => setSettings({ ...settings, default_network: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ethereum">Ethereum</option>
                  <option value="polygon">Polygon</option>
                  <option value="base">Base</option>
                  <option value="arbitrum">Arbitrum</option>
                </select>
              </div>
            </div>
          </NeonCard>
        )}
      </div>

      {/* Save Button - Fixed at bottom */}
      <div className="sticky bottom-0 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent pt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              저장 중...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              설정 저장
            </>
          )}
        </button>
      </div>
    </div>
  );
}