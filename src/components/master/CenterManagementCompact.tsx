import { useState, useEffect, useMemo } from "react";
import { Plus, Building2, Eye, Edit, Trash2, Check, X, Search, ArrowUpDown } from "lucide-react";
import { NeonCard } from "../NeonCard";
import { CreateCenterModal } from "./CreateCenterModal";
import { EditCenterModal } from "./EditCenterModal";
import { supabase } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface Center {
  user_id: string;
  center_name: string;
  username: string;
  email: string;
  domain: string;
  logo_url: string | null;
  template_id: string;
  is_active: boolean;
  created_at: string;
  parent_user_id: string | null;
  fee_rate: number;
  mapped_domains?: Array<{ domain: string; domain_type: string }>; // 도메인 매핑 추가
}

export function CenterManagementCompact() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  
  // 검색 및 정렬
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      setLoading(true);
      
      // 1. 센터 목록 조회
      const { data: centersData, error: centersError } = await supabase
        .from('users')
        .select('user_id, center_name, username, email, domain, logo_url, template_id, is_active, created_at, parent_user_id, fee_rate')
        .eq('role', 'center')
        .order('created_at', { ascending: false });

      if (centersError) throw centersError;

      // 2. 각 센터의 도메인 매핑 조회
      const centersWithDomains = await Promise.all(
        (centersData || []).map(async (center) => {
          const { data: domainMappings } = await supabase
            .from('domain_mappings')
            .select('domain, domain_type')
            .eq('center_id', center.user_id)
            .order('domain_type'); // main 먼저, admin 나중에
          
          return {
            ...center,
            mapped_domains: domainMappings || []
          };
        })
      );

      setCenters(centersWithDomains);
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

  const handleEdit = (center: Center) => {
    setSelectedCenter(center);
    setShowEditModal(true);
  };

  const handleCenterUpdated = () => {
    setShowEditModal(false);
    setSelectedCenter(null);
    fetchCenters();
  };

  const handleDelete = async (centerId: string, centerName: string) => {
    if (!confirm(`정말로 "${centerName}" 센터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', centerId);

      if (error) throw error;

      setCenters(centers.filter(c => c.user_id !== centerId));
      toast.success('센터가 성공적으로 삭제되었습니다');
    } catch (error) {
      console.error('센터 삭제 실패:', error);
      toast.error('센터 삭제에 실패했습니다');
    }
  };

  // 필터링 및 정렬
  const filteredAndSortedCenters = useMemo(() => {
    let result = [...centers];

    // 상태 필터
    if (statusFilter !== "all") {
      result = result.filter(c => 
        statusFilter === "active" ? c.is_active : !c.is_active
      );
    }

    // 검색
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.center_name?.toLowerCase().includes(term) ||
        c.username?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.domain?.toLowerCase().includes(term)
      );
    }

    // 정렬
    result.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === "name") {
        compareValue = (a.center_name || a.username).localeCompare(b.center_name || b.username);
      } else if (sortBy === "date") {
        compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === "status") {
        compareValue = (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0);
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return result;
  }, [centers, searchTerm, sortBy, sortOrder, statusFilter]);

  const handleSort = (column: "name" | "date" | "status") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const getTemplateColor = (templateId: string) => {
    const colors: Record<string, string> = {
      modern: 'bg-cyan-500/20 text-cyan-400',
      classic: 'bg-amber-500/20 text-amber-400',
      minimal: 'bg-slate-500/20 text-slate-400',
      gaming: 'bg-purple-500/20 text-purple-400',
      luxury: 'bg-rose-500/20 text-rose-400'
    };
    return colors[templateId] || 'bg-gray-500/20 text-gray-400';
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
          <h2 className="text-cyan-400 mb-2">센터 관리</h2>
          <p className="text-slate-400 text-sm">
            총 {centers.length}개 센터 
            {" • "}
            활성: {centers.filter(c => c.is_active).length}개
            {" • "}
            비활성: {centers.filter(c => !c.is_active).length}개
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          센터 생성
        </button>
      </div>

      <NeonCard>
        {/* 필터 및 검색 */}
        <div className="flex items-center justify-between gap-4 mb-6">
          {/* 검색 */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="센터명, 이메일, 도메인 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* 상태 필터 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                statusFilter === "all"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                statusFilter === "active"
                  ? "bg-green-500/20 text-green-400 border border-green-500/50"
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
              }`}
            >
              활성
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                statusFilter === "inactive"
                  ? "bg-red-500/20 text-red-400 border border-red-500/50"
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
              }`}
            >
              비활성
            </button>
          </div>
        </div>

        {/* 컴팩트 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-3 text-slate-400 text-sm">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                  >
                    센터명
                    {sortBy === "name" && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-3 text-slate-400 text-sm">이메일</th>
                <th className="text-left py-3 px-3 text-slate-400 text-sm">도메인</th>
                <th className="text-left py-3 px-3 text-slate-400 text-sm">템플릿</th>
                <th className="text-right py-3 px-3 text-slate-400 text-sm">수수료율</th>
                <th className="text-center py-3 px-3 text-slate-400 text-sm">
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center gap-1 mx-auto hover:text-cyan-400 transition-colors"
                  >
                    상태
                    {sortBy === "status" && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-3 text-slate-400 text-sm">
                  <button
                    onClick={() => handleSort("date")}
                    className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                  >
                    생성일
                    {sortBy === "date" && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="text-right py-3 px-3 text-slate-400 text-sm">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedCenters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    {searchTerm || statusFilter !== "all"
                      ? "검색 결과가 없습니다"
                      : "등록된 센터가 없습니다"}
                  </td>
                </tr>
              ) : (
                filteredAndSortedCenters.map((center) => (
                  <tr
                    key={center.user_id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-cyan-400" />
                        <span className="text-slate-300 text-sm">
                          {center.center_name || center.username}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-400 text-sm font-mono">
                        {center.email}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {center.mapped_domains && center.mapped_domains.length > 0 ? (
                        <div className="space-y-1">
                          {center.mapped_domains.map((dm, idx) => (
                            <a
                              key={idx}
                              href={`https://${dm.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`block text-sm hover:underline ${
                                dm.domain_type === 'main' 
                                  ? 'text-cyan-400' 
                                  : 'text-purple-400'
                              }`}
                              title={dm.domain_type === 'main' ? '회원용' : '관리자용'}
                            >
                              {dm.domain}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">매핑 없음</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs capitalize ${getTemplateColor(center.template_id)}`}>
                        {center.template_id}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-amber-400">
                        {center.fee_rate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleActive(center.user_id, center.is_active)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                          center.is_active
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        }`}
                      >
                        {center.is_active ? (
                          <>
                            <Check className="w-3 h-3" />
                            활성
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" />
                            비활성
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-400 text-sm">
                        {new Date(center.created_at).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(center)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(center.user_id, center.center_name || center.username)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 푸터 정보 */}
        {filteredAndSortedCenters.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800 text-sm text-slate-500">
            {searchTerm || statusFilter !== "all" ? (
              <p>
                {filteredAndSortedCenters.length}개 센터 표시 중 (전체 {centers.length}개)
              </p>
            ) : (
              <p>총 {centers.length}개 센터</p>
            )}
          </div>
        )}
      </NeonCard>

      {/* Modals */}
      {showCreateModal && (
        <CreateCenterModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCenterCreated}
        />
      )}

      {showEditModal && selectedCenter && (
        <EditCenterModal
          center={selectedCenter}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCenter(null);
          }}
          onSuccess={handleCenterUpdated}
        />
      )}
    </div>
  );
}