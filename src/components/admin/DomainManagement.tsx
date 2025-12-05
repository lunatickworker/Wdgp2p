import { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader,
  X
} from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { listDomains, addDomainToVercel, toggleDomainStatus, deleteDomainMapping } from '@/utils/api';
import { toast } from 'sonner@2.0.3';

interface DomainInfo {
  domain_id: string;
  domain: string;
  center_id: string;
  domain_type: 'main' | 'admin';
  is_active: boolean;
  created_at: string;
  center?: {
    center_name: string;
    template_id: string;
  };
}

export function DomainManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [centers, setCenters] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 도메인 목록 조회
      const result = await listDomains();
      
      if (result.success && Array.isArray(result.data)) {
        setDomains(result.data);
      } else {
        console.error('Invalid domains response:', result);
        setDomains([]);
      }

      // 센터 목록 조회
      const { data: centerData, error } = await supabase
        .from('users')
        .select('user_id, center_name, domain')
        .eq('role', 'center')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCenters(centerData || []);
    } catch (error: any) {
      toast.error('데이터를 불러올 수 없습니다');
      console.error(error);
      setDomains([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain || !selectedCenterId) {
      toast.error('모든 필드를 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Vercel에 도메인 추가
      const vercelResult = await addDomainToVercel({
        centerId: selectedCenterId,
        domain: newDomain
      });

      if (!vercelResult.success) {
        throw new Error(vercelResult.error || 'Vercel 도메인 추가 실패');
      }

      // 2. DB에 도메인 매핑 추가
      const { error } = await supabase
        .from('domain_mappings')
        .insert([
          {
            domain: newDomain,
            center_id: selectedCenterId,
            domain_type: 'main',
            is_active: true
          },
          {
            domain: `admin.${newDomain}`,
            center_id: selectedCenterId,
            domain_type: 'admin',
            is_active: true
          }
        ]);

      if (error) throw error;

      toast.success('도메인이 추가되었습니다');
      setIsAddDialogOpen(false);
      setNewDomain('');
      setSelectedCenterId('');
      loadData();
    } catch (error: any) {
      toast.error(error.message || '도메인 추가 실패');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (domainId: string, currentStatus: boolean) => {
    try {
      const result = await toggleDomainStatus(domainId, !currentStatus);
      if (result.success) {
        toast.success(
          currentStatus ? '도메인이 비활성화되었습니다' : '도메인이 활성화되었습니다'
        );
        loadData();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || '상태 변경 실패');
    }
  };

  const handleDelete = async (domainId: string, domain: string) => {
    if (!confirm(`"${domain}" 도메인을 삭제하시겠습니까?`)) return;

    try {
      const result = await deleteDomainMapping(domainId);
      if (result.success) {
        toast.success('도메인이 삭제되었습니다');
        loadData();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || '도메인 삭제 실패');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">도메인 정보 로드 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-cyan-400 mb-2">도메인 관리</h2>
          <p className="text-slate-400 text-sm">센터별 도메인 설정 및 관리</p>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          도메인 추가
        </button>
      </div>

      {/* 도메인 목록 */}
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-6 py-4 text-left text-cyan-400">도메인</th>
                <th className="px-6 py-4 text-left text-cyan-400">센터</th>
                <th className="px-6 py-4 text-left text-cyan-400">타입</th>
                <th className="px-6 py-4 text-left text-cyan-400">상태</th>
                <th className="px-6 py-4 text-left text-cyan-400">생성일</th>
                <th className="px-6 py-4 text-right text-cyan-400">작업</th>
              </tr>
            </thead>
            <tbody>
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    등록된 도메인이 없습니다
                  </td>
                </tr>
              ) : (
                domains.map((domain) => (
                  <tr key={domain.domain_id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <a
                        href={`https://${domain.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2"
                      >
                        {domain.domain}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {domain.center?.center_name || '알 수 없음'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          domain.domain_type === 'main'
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}
                      >
                        {domain.domain_type === 'main' ? '회원용' : '관리자용'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(domain.domain_id, domain.is_active)}
                        className="flex items-center gap-2"
                      >
                        {domain.is_active ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-sm">활성</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-500 text-sm">비활성</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(domain.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDelete(domain.domain_id, domain.domain)}
                          className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
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
      </div>

      {/* 안내 메시지 */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-6">
        <h3 className="text-cyan-400 mb-3">도메인 설정 안내</h3>
        <ul className="text-slate-400 text-sm space-y-2">
          <li key="info-1">• 도메인을 추가하면 Vercel에 자동으로 등록됩니다</li>
          <li key="info-2">• DNS 설정이 필요합니다: CNAME → cname.vercel-dns.com</li>
          <li key="info-3">• 주도메인은 회원 앱용, 관리자 도메인은 센터/가맹점 관리용입니다</li>
          <li key="info-4">• 비활성화된 도메인은 접속이 차단됩니다</li>
        </ul>
      </div>

      {/* Add Domain Modal */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-8">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-cyan-400">새 도메인 추가</h2>
                  <p className="text-slate-400 text-sm">센터에 새로운 도메인을 추가합니다. 주도메인과 관리자 도메인이 자동으로 생성됩니다.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddDialogOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-slate-300 mb-2">센터 선택 *</label>
                <select
                  value={selectedCenterId}
                  onChange={(e) => setSelectedCenterId(e.target.value)}
                  className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                >
                  <option key="empty" value="">Centre1 (localhost)</option>
                  {centers.map((center) => (
                    <option key={center.user_id} value={center.user_id}>
                      {center.center_name} ({center.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-2">주도메인 *</label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
                <p className="text-slate-500 text-xs mt-2">
                  관리자 도메인은 자동으로 admin.{newDomain || 'example.com'}으로 생성됩니다
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-700">
              <button
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleAddDomain}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    추가 중...
                  </>
                ) : (
                  '추가'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}