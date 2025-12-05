import { useState, useEffect, useMemo } from "react";
import { Plus, Users, Edit, Trash2, Check, X, Search, ArrowUpDown, Building2 } from "lucide-react";
import { NeonCard } from "../NeonCard";
import { CreateAgencyModal } from "./CreateAgencyModal";
import { EditAgencyModal } from "./EditAgencyModal";
import { supabase } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface Agency {
  user_id: string;
  center_name: string;
  username: string;
  email: string;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  metadata?: any;
  // 통계
  center_count?: number;
  store_count?: number;
}

export function AgencyManagementCompact() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  
  // 검색 및 정렬
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "centers" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      
      // 에이전시 목록
      const { data: agenciesData, error } = await supabase
        .from('users')
        .select('user_id, center_name, username, email, phone, is_active, created_at, metadata')
        .eq('role', 'agency')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 각 에이전시의 센터 및 가맹점 수 계산
      const agenciesWithStats = await Promise.all(
        (agenciesData || []).map(async (agency) => {
          // 센터 수
          const { count: centerCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('parent_user_id', agency.user_id)
            .eq('role', 'center');

          // 가맹점 수
          const { count: storeCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('parent_user_id', agency.user_id)
            .eq('role', 'store');

          return {
            ...agency,
            center_count: centerCount || 0,
            store_count: storeCount || 0,
          };
        })
      );

      setAgencies(agenciesWithStats);
    } catch (error) {
      console.error('에이전시 조회 실패:', error);
      toast.error('에이전시 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
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
    if (!confirm(`정말로 "${agencyName}" 에이전시를 삭제하시겠습니까?\n\n연결된 센터와 가맹점도 함께 삭제될 수 있습니다.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', agencyId);

      if (error) throw error;

      setAgencies(agencies.filter(a => a.user_id !== agencyId));
      toast.success('에이전시가 성공적으로 삭제되었습니다');
    } catch (error) {
      console.error('에이전시 삭제 실패:', error);
      toast.error('에이전시 삭제에 실패했습니다');
    }
  };

  // 필터링 및 정렬
  const filteredAndSortedAgencies = useMemo(() => {
    let result = [...agencies];

    // 상태 필터
    if (statusFilter !== "all") {
      result = result.filter(a => 
        statusFilter === "active" ? a.is_active : !a.is_active
      );
    }

    // 검색
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a =>
        a.center_name?.toLowerCase().includes(term) ||
        a.username?.toLowerCase().includes(term) ||
        a.email?.toLowerCase().includes(term)
      );
    }

    // 정렬
    result.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === "name") {
        compareValue = (a.center_name || a.username).localeCompare(b.center_name || b.username);
      } else if (sortBy === "centers") {
        compareValue = (a.center_count || 0) - (b.center_count || 0);
      } else if (sortBy === "date") {
        compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return result;
  }, [agencies, searchTerm, sortBy, sortOrder, statusFilter]);

  const handleSort = (column: "name" | "centers" | "date") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
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
          <p className="text-slate-400 text-sm">
            총 {agencies.length}개 에이전시
            {" • "}
            활성: {agencies.filter(a => a.is_active).length}개
            {" • "}
            비활성: {agencies.filter(a => !a.is_active).length}개
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          에이전시 생성
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
              placeholder="에이전시명, 이메일 검색..."
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
                    에이전시명
                    {sortBy === "name" && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-3 text-slate-400 text-sm">이메일</th>
                <th className="text-center py-3 px-3 text-slate-400 text-sm">
                  <button
                    onClick={() => handleSort("centers")}
                    className="flex items-center gap-1 mx-auto hover:text-cyan-400 transition-colors"
                  >
                    센터 수
                    {sortBy === "centers" && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="text-center py-3 px-3 text-slate-400 text-sm">가맹점 수</th>
                <th className="text-center py-3 px-3 text-slate-400 text-sm">상태</th>
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
              {filteredAndSortedAgencies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    {searchTerm || statusFilter !== "all"
                      ? "검색 결과가 없습니다"
                      : "등록된 에이전시가 없습니다"}
                  </td>
                </tr>
              ) : (
                filteredAndSortedAgencies.map((agency) => (
                  <tr
                    key={agency.user_id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-400" />
                        <span className="text-slate-300 text-sm">
                          {agency.center_name || agency.username}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-400 text-sm font-mono">
                        {agency.email}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs">
                        <Building2 className="w-3 h-3" />
                        {agency.center_count || 0}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                        <Building2 className="w-3 h-3" />
                        {agency.store_count || 0}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleActive(agency.user_id, agency.is_active)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                          agency.is_active
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        }`}
                      >
                        {agency.is_active ? (
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
                        {new Date(agency.created_at).toLocaleString('ko-KR', {
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
                          onClick={() => {
                            setSelectedAgency(agency);
                            setShowEditModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(agency.user_id, agency.center_name || agency.username)}
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
        {filteredAndSortedAgencies.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-sm text-slate-500">
            <p>
              {searchTerm || statusFilter !== "all"
                ? `${filteredAndSortedAgencies.length}개 에이전시 표시 중 (전체 ${agencies.length}개)`
                : `총 ${agencies.length}개 에이전시`}
            </p>
            <p>
              총 센터: {filteredAndSortedAgencies.reduce((sum, a) => sum + (a.center_count || 0), 0)}개
              {" • "}
              총 가맹점: {filteredAndSortedAgencies.reduce((sum, a) => sum + (a.store_count || 0), 0)}개
            </p>
          </div>
        )}
      </NeonCard>

      {/* 모달 */}
      {showCreateModal && (
        <CreateAgencyModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchAgencies();
          }}
        />
      )}
      {showEditModal && selectedAgency && (
        <EditAgencyModal
          agency={selectedAgency}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchAgencies();
          }}
        />
      )}
    </div>
  );
}