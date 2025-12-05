import { useState, useEffect } from "react";
import { Plus, Building2, ExternalLink, Eye, Edit, Trash2, Check, X, Filter, GitBranch } from "lucide-react";
import { NeonCard } from "../NeonCard";
import { CreateCenterModal } from "./CreateCenterModal";
import { EditCenterModal } from "./EditCenterModal";
import { supabase } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface Center {
  user_id: string;
  center_name: string;
  domain: string;
  logo_url: string | null;
  template_id: string;
  is_active: boolean;
  created_at: string;
  parent_user_id: string | null;
  design_theme: any;
  metadata: any;
  fee_rate: number;
}

interface Agency {
  user_id: string;
  center_name: string;
}

export function CenterManagement() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [agencies, setAgencies] = useState<Record<string, Agency>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [filterAgencyId, setFilterAgencyId] = useState<string>('all'); // 'all', 'direct', or agency_id
  const [showTreeView, setShowTreeView] = useState(false);

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'center')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCenters(data || []);

      // 에이전시 정보 조회 (부모가 있는 센터들)
      const parentIds = (data || [])
        .map(c => c.parent_user_id)
        .filter(Boolean) as string[];

      if (parentIds.length > 0) {
        const { data: agenciesData } = await supabase
          .from('users')
          .select('user_id, center_name')
          .in('user_id', parentIds);

        if (agenciesData) {
          const agenciesMap: Record<string, Agency> = {};
          agenciesData.forEach(a => {
            agenciesMap[a.user_id] = a;
          });
          setAgencies(agenciesMap);
        }
      }
    } catch (error) {
      console.error('센터 조회 실패:', error);
      toast.error('센터 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleCenterCreated = () => {
    setShowCreateModal(false);
    fetchCenters();
    toast.success('센터가 성공적으로 생성되었습니다');
  };

  const handleToggleActive = async (centerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('user_id', centerId);

      if (error) throw error;

      setCenters(centers.map(c => 
        c.user_id === centerId ? { ...c, is_active: !currentStatus } : c
      ));

      toast.success(currentStatus ? '센터가 비활성화되었습니다' : '센터가 활성화되었습니다');
    } catch (error) {
      console.error('센터 상태 변경 실패:', error);
      toast.error('센터 상태 변경에 실패했습니다');
    }
  };

  const getTemplateLabel = (templateId: string) => {
    const templates: Record<string, string> = {
      modern: 'Modern',
      classic: 'Classic',
      minimal: 'Minimal',
      gaming: 'Gaming',
      luxury: 'Luxury'
    };
    return templates[templateId] || templateId;
  };

  // 필터링된 센터 목록
  const filteredCenters = centers.filter(center => {
    if (filterAgencyId === 'all') return true;
    if (filterAgencyId === 'direct') return !center.parent_user_id;
    return center.parent_user_id === filterAgencyId;
  });

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
          <h2 className="text-cyan-400 mb-2">센터 관리</h2>
          <p className="text-slate-400 text-sm">센터 생성, 수정, 삭제 및 도메인 관리</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTreeView(!showTreeView)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showTreeView
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <GitBranch className="w-5 h-5" />
            계층 구조
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            센터 생성
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <NeonCard>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Filter className="w-5 h-5" />
            <span>필터:</span>
          </div>
          <select
            value={filterAgencyId}
            onChange={(e) => setFilterAgencyId(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">전체 센터 ({centers.length}개)</option>
            <option value="direct">
              마스터 직속 센터 ({centers.filter(c => !c.parent_user_id).length}개)
            </option>
            {Object.values(agencies).map((agency) => {
              const count = centers.filter(c => c.parent_user_id === agency.user_id).length;
              return (
                <option key={agency.user_id} value={agency.user_id}>
                  {agency.center_name} 소속 센터 ({count}개)
                </option>
              );
            })}
          </select>
          <div className="text-slate-400 text-sm">
            {filteredCenters.length}개 표시
          </div>
        </div>
      </NeonCard>

      {/* Tree View or List View */}
      {showTreeView ? (
        <div className="space-y-4">
          {/* 마스터 직속 센터 */}
          {centers.filter(c => !c.parent_user_id).length > 0 && (
            <NeonCard>
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-cyan-400">마스터 직속 센터</h3>
                  <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                    {centers.filter(c => !c.parent_user_id).length}개
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {centers.filter(c => !c.parent_user_id).map((center) => (
                    <div key={center.user_id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-2">
                        {center.logo_url ? (
                          <img 
                            src={center.logo_url} 
                            alt={center.center_name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-cyan-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-200 truncate">{center.center_name}</p>
                          <p className="text-slate-500 text-xs truncate">{center.domain}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCenter(center);
                            setShowEditModal(true);
                          }}
                          className="p-1 hover:bg-slate-700 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </NeonCard>
          )}

          {/* 에이전시별 센터 */}
          {Object.values(agencies).map((agency) => {
            const agencyCenters = centers.filter(c => c.parent_user_id === agency.user_id);
            if (agencyCenters.length === 0) return null;
            
            return (
              <NeonCard key={agency.user_id}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                    <div className="flex items-center gap-2 flex-1">
                      <Building2 className="w-5 h-5 text-purple-400" />
                      <h3 className="text-purple-400">{agency.center_name}</h3>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                        {agencyCenters.length}개
                      </span>
                    </div>
                    <span className="text-slate-500 text-xs">Agency → Center</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {agencyCenters.map((center) => (
                      <div key={center.user_id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2">
                          {center.logo_url ? (
                            <img 
                              src={center.logo_url} 
                              alt={center.center_name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-purple-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 truncate">{center.center_name}</p>
                            <p className="text-slate-500 text-xs truncate">{center.domain}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedCenter(center);
                              setShowEditModal(true);
                            }}
                            className="p-1 hover:bg-slate-700 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </NeonCard>
            );
          })}
        </div>
      ) : (
        <>
      {/* Centers List */}
      {filteredCenters.length === 0 ? (
        <NeonCard>
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">생성된 센터가 없습니다</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
            >
              첫 센터 만들기
            </button>
          </div>
        </NeonCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCenters.map((center) => (
            <NeonCard key={center.user_id}>
              <div className="space-y-4">
                {/* Center Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {center.logo_url ? (
                      <img 
                        src={center.logo_url} 
                        alt={center.center_name}
                        className="w-12 h-12 rounded-lg object-cover border border-cyan-500/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-800 border border-cyan-500/30 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-cyan-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-cyan-400">{center.center_name}</h3>
                      <p className="text-slate-400 text-sm">{center.domain}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(center.user_id, center.is_active)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      center.is_active
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-slate-700 text-slate-400 border border-slate-600'
                    }`}
                  >
                    {center.is_active ? (
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

                {/* Center Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">템플릿</p>
                    <p className="text-slate-300">{getTemplateLabel(center.template_id)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">수수료율</p>
                    <p className="text-amber-400">{center.fee_rate}%</p>
                  </div>
                  <div>
                    <p className="text-slate-500">생성일</p>
                    <p className="text-slate-300">
                      {new Date(center.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">상태</p>
                    <p className={center.is_active ? 'text-green-400' : 'text-slate-500'}>
                      {center.is_active ? '활성' : '비활성'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">계층 구조</p>
                    <p className="text-slate-300 flex items-center gap-1">
                      <span className="text-cyan-400">Master</span>
                      {center.parent_user_id ? (
                        <>
                          <span className="text-slate-600">→</span>
                          <span className="text-purple-400">
                            {agencies[center.parent_user_id]?.center_name || 'Agency'}
                          </span>
                          <span className="text-slate-600">→</span>
                          <span className="text-green-400">{center.center_name}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-600">→</span>
                          <span className="text-green-400">{center.center_name}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Domains */}
                <div className="space-y-2">
                  <p className="text-slate-500 text-sm">도메인</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                      <span className="text-slate-400">회원용:</span>
                      <span className="text-cyan-400">{center.domain}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                      <span className="text-slate-400">관리자용:</span>
                      <span className="text-purple-400">admin.{center.domain}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                  <button
                    onClick={() => window.open(`https://${center.domain}`, '_blank')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    회원페이지 미리보기
                  </button>
                  <button
                    onClick={() => window.open(`https://admin.${center.domain}`, '_blank')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    관리자 페이지
                  </button>
                </div>

                {/* Edit/Delete */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCenter(center);
                      setShowEditModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    수정
                  </button>
                  <button
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </NeonCard>
          ))}
        </div>
      )}
        </>
      )}

      {/* Create Center Modal */}
      {showCreateModal && (
        <CreateCenterModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCenterCreated}
        />
      )}

      {/* Edit Center Modal */}
      {showEditModal && selectedCenter && (
        <EditCenterModal
          center={selectedCenter}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchCenters}
        />
      )}
    </div>
  );
}