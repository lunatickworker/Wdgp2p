import { useState, useEffect } from 'react';
import { Shield, Info, Crown, Star, Award, Users } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface Policy {
  policy_id: string;
  user_level: 'VIP' | 'Premium' | 'Standard' | 'Basic';
  sponsor_mode: 'user' | 'partial' | 'operator';
  max_user_payment: number | null;
  gas_token: string;
  is_active: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export function GasSponsorshipPolicy() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPolicies();

    // 실시간 정책 변경 구독
    const policySubscription = supabase
      .channel('gas_policy_admin_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gas_sponsorship_policies'
        },
        () => {
          fetchPolicies();
        }
      )
      .subscribe();

    return () => {
      policySubscription.unsubscribe();
    };
  }, []);

  const fetchPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('gas_sponsorship_policies')
        .select('*')
        .order('user_level', { ascending: false });

      if (error) throw error;

      setPolicies(data || []);
    } catch (error: any) {
      console.error('Error fetching policies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'VIP': return <Crown className="w-5 h-5 text-yellow-400" />;
      case 'Premium': return <Star className="w-5 h-5 text-purple-400" />;
      case 'Standard': return <Award className="w-5 h-5 text-blue-400" />;
      case 'Basic': return <Users className="w-5 h-5 text-gray-400" />;
      default: return null;
    }
  };

  const getSponsorModeText = (mode: string) => {
    switch (mode) {
      case 'operator': return '100% 운영자 부담';
      case 'partial': return '부분 지원';
      case 'user': return '100% 사용자 부담';
      default: return mode;
    }
  };

  const getSponsorModeColor = (mode: string) => {
    switch (mode) {
      case 'operator': return 'text-green-400';
      case 'partial': return 'text-yellow-400';
      case 'user': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-slate-200 mb-2">
            <Shield className="w-6 h-6 text-cyan-400" />
            가스비 정책 관리
          </h2>
          <p className="text-slate-400 text-sm">
            사용자 등급별 가스비 지원 정책을 확인할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-slate-800/50 border border-cyan-500/30 rounded-lg p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-300">
            <p className="mb-2">정책은 읽기 전용입니다. 사용자의 등급을 변경하면 자동으로 해당 정책이 적용됩니다.</p>
            <p className="text-slate-400">
              💡 사용자 등급 변경: <span className="text-cyan-400">사용자 관리</span> 메뉴에서 변경할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 정책 목록 */}
      <div className="grid gap-4">
        {policies.map((policy) => (
          <div
            key={policy.policy_id}
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-cyan-500/30 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getLevelIcon(policy.user_level)}
                <div>
                  <h3 className="text-slate-200">{policy.user_level}</h3>
                  <p className="text-sm text-slate-400">{policy.description}</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs ${
                policy.is_active 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                {policy.is_active ? '활성' : '비활성'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">가스비 부담</div>
                <div className={`${getSponsorModeColor(policy.sponsor_mode)}`}>
                  {getSponsorModeText(policy.sponsor_mode)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">최대 사용자 부담</div>
                <div className="text-slate-300">
                  {policy.max_user_payment ? `${policy.max_user_payment} ${policy.gas_token}` : '제한 없음'}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">가스 토큰</div>
                <div className="text-slate-300">{policy.gas_token}</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
              <div>생성: {new Date(policy.created_at).toLocaleDateString('ko-KR')}</div>
              <div>수정: {new Date(policy.updated_at).toLocaleDateString('ko-KR')}</div>
            </div>
          </div>
        ))}
      </div>

      {policies.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          등록된 정책이 없습니다.
        </div>
      )}
    </div>
  );
}
