import { useState, useEffect } from "react";
import { Plus, Users, ExternalLink, Edit, Trash2, Check, X, Building2, TrendingUp } from "lucide-react";
import { NeonCard } from "../NeonCard";
import { CreateAgencyModal } from "./CreateAgencyModal";
import { EditAgencyModal } from "./EditAgencyModal";
import { supabase } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface Agency {
  user_id: string;
  center_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  // 통계 정보
  stats?: {
    total_centers: number;
    total_stores: number;
    total_users: number;
    total_volume: string;
  };
}

export function AgencyManagement() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'agency')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgencies(data || []);

      // 각 에이전시의 통계 정보 조회
      if (data) {
        data.forEach(agency => fetchAgencyStats(agency.user_id));
      }
    } catch (error) {
      console.error('에이전시 조회 실패:', error);
      toast.error('에이전시 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgencyStats = async (agencyId: string) => {
    try {
      setLoadingStats(prev => ({ ...prev, [agencyId]: true }));

      // 센터 수 조회
      const { count: centerCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'center')
        .eq('parent_user_id', agencyId);

      // 가맹점 수 조회
      const { count: storeCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'store')
        .eq('parent_user_id', agencyId);

      // 일반 사용자 수 조회
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user')
        .eq('parent_user_id', agencyId);

      // 통계 업데이트
      setAgencies(prev => prev.map(agency => 
        agency.user_id === agencyId
          ? {
              ...agency,
              stats: {
                total_centers: centerCount || 0,
                total_stores: storeCount || 0,
                total_users: userCount || 0,
                total_volume: '0', // 실제 거래량 계산 필요
              }
            }
          : agency
      ));
    } catch (error) {
      console.error('에이전시 통계 조회 실패:', error);
    } finally {
      setLoadingStats(prev => ({ ...prev, [agencyId]: false }));
    }
  };

  const handleAgencyCreated = () => {
    setShowCreateModal(false);
    fetchAgencies();
    toast.success('에이전시가 성공적으로 생성되었습니다');
  };

  const handleAgencyEdited = () => {
    setShowEditModal(false);
    fetchAgencies();
    toast.success('에이전시가 성공적으로 수정되었습니다');
  };

  const handleToggleActive = async (agencyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('user_id', agencyId);

      if (error) throw error;

      setAgencies(agencies.map(a => 
        a.user_id === agencyId ? { ...a, is_active: !currentStatus } : a
      ));

      toast.success(currentStatus ? '에이전시가 비활성화되었습니다' : '에이전시가 활성화되었습니다');
    } catch (error) {
      console.error('에이전시 상태 변경 실패:', error);
      toast.error('에이전시 상태 변경에 실패했습니다');
    }
  };

  const handleDelete = async (agencyId: string, agencyName: string) => {
    if (!confirm(`"${agencyName}" 에이전시를 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없으며, 하위 센터와 가맹점도 함께 삭제됩니다.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', agencyId);

      if (error) throw error;

      setAgencies(agencies.filter(a => a.user_id !== agencyId));
      toast.success('에이전시가 삭제되었습니다');
    } catch (error) {
      console.error('에이전시 삭제 실패:', error);
      toast.error('에이전시 삭제에 실패했습니다');
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
          <h2 className="text-cyan-400 mb-2">에이전시 관리</h2>
          <p className="text-slate-400 text-sm">에이전시 생성, 수정, 삭제 및 통계 관리</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          에이전시 생성
        </button>
      </div>

      {/* Summary Stats */}
      {agencies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <NeonCard>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">총 에이전시</p>
                <p className="text-cyan-400">{agencies.length}개</p>
              </div>
            </div>
          </NeonCard>
          <NeonCard>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">활성 에이전시</p>
                <p className="text-purple-400">
                  {agencies.filter(a => a.is_active).length}개
                </p>
              </div>
            </div>
          </NeonCard>
          <NeonCard>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">총 센터</p>
                <p className="text-green-400">
                  {agencies.reduce((sum, a) => sum + (a.stats?.total_centers || 0), 0)}개
                </p>
              </div>
            </div>
          </NeonCard>
          <NeonCard>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">총 사용자</p>
                <p className="text-orange-400">
                  {agencies.reduce((sum, a) => sum + (a.stats?.total_users || 0), 0)}명
                </p>
              </div>
            </div>
          </NeonCard>
        </div>
      )}

      {/* Agencies List */}
      {agencies.length === 0 ? (
        <NeonCard>
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">생성된 에이전시가 없습니다</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
            >
              첫 에이전시 만들기
            </button>
          </div>
        </NeonCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {agencies.map((agency) => (
            <NeonCard key={agency.user_id}>
              <div className="space-y-4">
                {/* Agency Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-cyan-400">{agency.center_name}</h3>
                      <p className="text-slate-400 text-sm">{agency.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(agency.user_id, agency.is_active)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      agency.is_active
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-slate-700 text-slate-400 border border-slate-600'
                    }`}
                  >
                    {agency.is_active ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3" /> 활성
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <X className="w-3 h-3" /> 비활성
                      </span>
                    )}
                  </button>
                </div>

                {/* Agency Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">연락처</p>
                    <p className="text-slate-300">{agency.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">생성일</p>
                    <p className="text-slate-300">
                      {new Date(agency.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>

                {/* Statistics */}
                {loadingStats[agency.user_id] ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : agency.stats ? (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-slate-500 text-xs mb-1">센터</p>
                      <p className="text-cyan-400">{agency.stats.total_centers}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-xs mb-1">가맹점</p>
                      <p className="text-purple-400">{agency.stats.total_stores}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-xs mb-1">사용자</p>
                      <p className="text-green-400">{agency.stats.total_users}</p>
                    </div>
                  </div>
                ) : null}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                  <button
                    onClick={() => {
                      // 에이전시 관리 페이지로 이동 (해시 라우팅)
                      window.location.hash = `#admin?agency=${agency.user_id}`;
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors text-sm"
                    title="에이전시 관리 페이지로 이동"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>관리 페이지</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAgency(agency);
                      setShowEditModal(true);
                    }}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm"
                    title="에이전시 정보 수정"
                  >
                    <Edit className="w-4 h-4" />
                    <span>수정</span>
                  </button>
                  <button
                    onClick={() => handleDelete(agency.user_id, agency.center_name)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
                    title="에이전시 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </NeonCard>
          ))}
        </div>
      )}

      {/* Create Agency Modal */}
      {showCreateModal && (
        <CreateAgencyModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleAgencyCreated}
        />
      )}

      {/* Edit Agency Modal */}
      {showEditModal && selectedAgency && (
        <EditAgencyModal
          agency={selectedAgency}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleAgencyEdited}
        />
      )}
    </div>
  );
}