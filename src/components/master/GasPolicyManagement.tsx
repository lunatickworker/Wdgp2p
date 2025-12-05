import { useState, useEffect } from "react";
import { Save, Zap, Users, Crown, Star, Shield } from "lucide-react";
import { NeonCard } from "../NeonCard";
import { supabase } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface GasPolicy {
  policy_id?: string;
  user_level: string;
  sponsor_mode: 'user' | 'partial' | 'operator';
  gas_token: string;
  max_user_payment?: number;
  description: string;
  is_active?: boolean;
}

const DEFAULT_POLICIES: GasPolicy[] = [
  {
    user_level: 'VIP',
    sponsor_mode: 'operator',
    gas_token: 'USDC',
    max_user_payment: undefined,
    description: '가스비 100% 무료 - 모든 트랜잭션 가스비 플랫폼 부담'
  },
  {
    user_level: 'Premium',
    sponsor_mode: 'partial',
    gas_token: 'USDC',
    max_user_payment: 1.0,
    description: '최대 1 USDC까지만 부담 - 초과분은 플랫폼 부담'
  },
  {
    user_level: 'Standard',
    sponsor_mode: 'partial',
    gas_token: 'USDC',
    max_user_payment: 3.0,
    description: '최대 3 USDC까지 사용자 부담'
  },
  {
    user_level: 'Basic',
    sponsor_mode: 'user',
    gas_token: 'USDC',
    max_user_payment: undefined,
    description: 'USDC로 가스비 지불 - 사용자 전액 부담'
  }
];

export function GasPolicyManagement() {
  const [policies, setPolicies] = useState<GasPolicy[]>(DEFAULT_POLICIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    vip: 0,
    premium: 0,
    standard: 0,
    basic: 0
  });

  useEffect(() => {
    loadPolicies();
    loadUserStats();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gas_sponsorship_policies')
        .select('*')
        .order('user_level');

      if (error && error.code !== 'PGRST116') throw error;

      if (data && data.length > 0) {
        setPolicies(data);
      }
    } catch (error) {
      console.error('가스비 정책 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('level');

      if (error) throw error;

      const counts = {
        vip: data?.filter(u => u.level === 'VIP').length || 0,
        premium: data?.filter(u => u.level === 'Premium').length || 0,
        standard: data?.filter(u => u.level === 'Standard').length || 0,
        basic: data?.filter(u => u.level === 'Basic').length || 0
      };

      setStats(counts);
    } catch (error) {
      console.error('사용자 통계 로드 실패:', error);
    }
  };

  const handleSavePolicies = async () => {
    try {
      setSaving(true);

      // 각 정책을 개별적으로 upsert
      for (const policy of policies) {
        const { error } = await supabase
          .from('gas_sponsorship_policies')
          .upsert({
            user_level: policy.user_level,
            sponsor_mode: policy.sponsor_mode,
            gas_token: policy.gas_token,
            max_user_payment: policy.max_user_payment || null,
            description: policy.description,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_level'
          });

        if (error) throw error;
      }

      toast.success('가스비 정책이 저장되었습니다');
      loadPolicies();
    } catch (error: any) {
      console.error('가스비 정책 저장 실패:', error);
      toast.error(error.message || '정책 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const updatePolicy = (user_level: string, updates: Partial<GasPolicy>) => {
    setPolicies(policies.map(p => 
      p.user_level === user_level ? { ...p, ...updates } : p
    ));
  };

  const getLevelIcon = (user_level: string) => {
    switch (user_level) {
      case 'VIP':
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 'Premium':
        return <Star className="w-6 h-6 text-purple-400" />;
      case 'Standard':
        return <Shield className="w-6 h-6 text-cyan-400" />;
      case 'Basic':
        return <Users className="w-6 h-6 text-slate-400" />;
      default:
        return <Users className="w-6 h-6 text-slate-400" />;
    }
  };

  const getLevelColor = (user_level: string) => {
    switch (user_level) {
      case 'VIP':
        return 'from-yellow-500/20 to-yellow-500/10 border-yellow-500/30';
      case 'Premium':
        return 'from-purple-500/20 to-purple-500/10 border-purple-500/30';
      case 'Standard':
        return 'from-cyan-500/20 to-cyan-500/10 border-cyan-500/30';
      case 'Basic':
        return 'from-slate-500/20 to-slate-500/10 border-slate-500/30';
      default:
        return 'from-slate-500/20 to-slate-500/10 border-slate-500/30';
    }
  };

  const getUserCount = (user_level: string) => {
    switch (user_level) {
      case 'VIP': return stats.vip;
      case 'Premium': return stats.premium;
      case 'Standard': return stats.standard;
      case 'Basic': return stats.basic;
      default: return 0;
    }
  };

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
          <h2 className="text-cyan-400 mb-2">가스비 정책</h2>
          <p className="text-slate-400 text-sm">사용자 레벨별 가스비 스폰서십 정책 설정</p>
        </div>
        <button
          onClick={handleSavePolicies}
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

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-white text-sm mb-1">Biconomy Supertransaction 가스 추상화</h3>
            <p className="text-slate-400 text-xs">
              사용자는 USDC, USDT 등 10,000+ ERC-20 토큰으로 가스비를 지불할 수 있습니다.
              플랫폼이 가스비를 스폰서하여 사용자 경험을 향상시킬 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Policy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {policies.map((policy) => (
          <NeonCard key={policy.user_level}>
            <div className={`p-6 rounded-lg bg-gradient-to-br border ${getLevelColor(policy.user_level)}`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getLevelIcon(policy.user_level)}
                  <div>
                    <h3 className="text-white">{policy.user_level}</h3>
                    <p className="text-slate-400 text-xs">{getUserCount(policy.user_level)}명의 사용자</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={policy.sponsor_mode}
                    onChange={(e) => updatePolicy(policy.user_level, { sponsor_mode: e.target.value as any })}
                    className="px-3 py-1 bg-slate-800/50 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="operator">100% 운영자</option>
                    <option value="partial">부분 지원</option>
                    <option value="user">100% 사용자</option>
                  </select>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                {/* Token Selection */}
                <div>
                  <label className="block text-slate-400 text-sm mb-2">가스비 지불 토큰</label>
                  <select
                    value={policy.gas_token}
                    onChange={(e) => updatePolicy(policy.user_level, { gas_token: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="DAI">DAI</option>
                    <option value="KRWQ">KRWQ</option>
                  </select>
                </div>

                {/* Max User Payment */}
                {policy.sponsor_mode === 'partial' && (
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      최대 사용자 부담 금액
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={policy.max_user_payment || ''}
                        onChange={(e) => updatePolicy(policy.user_level, { max_user_payment: parseFloat(e.target.value) || undefined })}
                        className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="1.0"
                      />
                      <span className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white">
                        {policy.gas_token}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-1">
                      이 금액까지만 사용자 부담, 초과분은 플랫폼 부담
                    </p>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-slate-400 text-sm mb-2">설명</label>
                  <textarea
                    value={policy.description}
                    onChange={(e) => updatePolicy(policy.user_level, { description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                {/* Summary */}
                <div className="pt-4 border-t border-slate-700/50">
                  <p className="text-slate-300 text-sm">
                    {policy.sponsor_mode === 'operator' 
                      ? '플랫폼이 가스비 100% 부담 🎉'
                      : policy.sponsor_mode === 'partial'
                      ? `사용자는 최대 ${policy.max_user_payment} ${policy.gas_token}만 부담, 초과분은 플랫폼 부담`
                      : `사용자가 ${policy.gas_token}로 가스비 전액 부담`
                    }
                  </p>
                </div>
              </div>
            </div>
          </NeonCard>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSavePolicies}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              정책 저장
            </>
          )}
        </button>
      </div>
    </div>
  );
}