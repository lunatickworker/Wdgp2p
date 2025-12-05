import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Wallet, AlertTriangle, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { createSmartAccount } from '../utils/biconomy/smartAccount';
import { getHierarchyUserIds } from '../utils/api/query-helpers';
import { useAuth } from '../contexts/AuthContext';

interface Verification {
  verification_id: string;
  user_id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  verification_code?: string;
  status?: 'pending' | 'verified' | 'rejected' | null;
  smart_account_address?: string;
  smart_account_chain_id?: number;
  created_at: string;
  verified_at?: string;
  rejection_reason?: string;
  users?: {
    username: string;
    email: string;
  };
}

export function AccountVerificationManagement() {
  const { user } = useAuth();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchVerifications();

    // 실시간 구독
    const subscription = supabase
      .channel('account_verifications_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'account_verifications' },
        () => {
          fetchVerifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, user?.role]);

  const fetchVerifications = async () => {
    if (!user?.id || !user?.role) return;

    try {
      setIsLoading(true);

      // 계층 구조에 따라 하위 사용자 ID 조회
      const hierarchyUserIds = await getHierarchyUserIds(user.id, user.role);

      const { data, error } = await supabase
        .from('account_verifications')
        .select(`
          *,
          users (
            username,
            email
          )
        `)
        .in('user_id', hierarchyUserIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVerifications(data || []);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('데이터 로드 실패');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (verification: Verification) => {
    if (!confirm(`${verification.users?.username}의 계좌인증을 승인하시겠습니까?\nSmart Account가 자동으로 생성됩니다.`)) {
      return;
    }

    setProcessingId(verification.verification_id);

    try {
      // Step 1: 먼저 기존 지갑이 있는지 확인
      const { data: existingWallets, error: walletCheckError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', verification.user_id);

      if (walletCheckError) throw walletCheckError;

      // Step 2: Smart Account 생성 (항상 새로 생성)
      toast.info('⚡ Smart Account 생성 중...');
      
      const smartAccount = await createSmartAccount({
        userId: verification.user_id,
        username: verification.users?.username || 'Unknown',
        chainId: 8453, // Base Mainnet
      });

      const smartAccountAddress = smartAccount.address;
      const chainId = smartAccount.chainId;
      
      toast.success(`✅ Smart Account 생성 완료: ${smartAccountAddress.slice(0, 10)}...`);

      // Step 3: 인증 상태 업데이트
      const { error: updateError } = await supabase
        .from('account_verifications')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          smart_account_address: smartAccountAddress,
          smart_account_chain_id: chainId,
        })
        .eq('verification_id', verification.verification_id);

      if (updateError) throw updateError;

      // Step 4: 기존 지갑이 있으면 UPDATE, 없으면 INSERT
      if (existingWallets && existingWallets.length > 0) {
        // 기존 지갑들을 새 주소로 업데이트
        const { error: walletUpdateError } = await supabase
          .from('wallets')
          .update({
            address: smartAccountAddress,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', verification.user_id);

        if (walletUpdateError) {
          console.error('Wallet update error:', walletUpdateError);
          toast.warning('지갑 주소 업데이트 중 일부 오류 발생');
        } else {
          toast.success(`${existingWallets.length}개 지갑 주소 업데이트 완료`);
        }
      } else {
        // 기존 지갑이 없으면 새로 생성
        const walletsToCreate = [
          {
            user_id: verification.user_id,
            coin_type: 'KRWQ',
            address: smartAccountAddress,
            balance: 0,
            status: 'active',
          },
          {
            user_id: verification.user_id,
            coin_type: 'USDT',
            address: smartAccountAddress,
            balance: 0,
            status: 'active',
          },
        ];

        const { error: walletError } = await supabase
          .from('wallets')
          .insert(walletsToCreate);

        if (walletError) {
          console.error('Wallet creation error:', walletError);
          // 지갑 생성 실패해도 인증은 완료된 상태로 유지
        } else {
          toast.success('지갑 생성 완료');
        }
      }

      toast.success('계좌인증 승인 완료!');
      await fetchVerifications();

    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(`승인 실패: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification || !rejectionReason.trim()) {
      toast.error('거부 사유를 입력해주세요');
      return;
    }

    setProcessingId(selectedVerification.verification_id);

    try {
      const { error } = await supabase
        .from('account_verifications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
        })
        .eq('verification_id', selectedVerification.verification_id);

      if (error) throw error;

      toast.success('계좌인증이 거부되었습니다');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedVerification(null);
      await fetchVerifications();

    } catch (error: any) {
      console.error('Rejection error:', error);
      toast.error('거부 처리 실패');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (verification: Verification) => {
    setSelectedVerification(verification);
    setShowRejectModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle className="w-3 h-3" />
            승인됨
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-3 h-3" />
            대기중
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" />
            거부됨
          </span>
        );
      default:
        return null;
    }
  };

  const filteredVerifications = verifications.filter(v => 
    filter === 'all' ? true : v.status === filter
  );

  const paginatedVerifications = filteredVerifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredVerifications.length / itemsPerPage);

  const stats = {
    total: verifications.length,
    pending: verifications.filter(v => v.status === 'pending').length,
    verified: verifications.filter(v => v.status === 'verified').length,
    rejected: verifications.filter(v => v.status === 'rejected').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-white text-2xl mb-1">계좌인증 관리</h1>
        <p className="text-slate-400 text-sm">1원 계좌인증 요청을 검토하고 Smart Account를 생성합니다</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">전체</span>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-white text-xl">{stats.total}</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-amber-400 text-xs">대기중</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-amber-400 text-xl">{stats.pending}</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-green-400 text-xs">승인됨</span>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-green-400 text-xl">{stats.verified}</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-red-400 text-xs">거부됨</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-red-400 text-xl">{stats.rejected}</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {(['all', 'pending', 'verified', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              filter === f
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            {f === 'all' ? '전체' : f === 'pending' ? '대기중' : f === 'verified' ? '승인됨' : '거부됨'}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800/50 border-b border-slate-700/50">
            <tr className="text-xs text-slate-400">
              <th className="text-left p-3">사용자</th>
              <th className="text-left p-3">은행</th>
              <th className="text-left p-3">계좌번호</th>
              <th className="text-left p-3">예금주</th>
              <th className="text-left p-3">상태</th>
              <th className="text-left p-3">신청일</th>
              <th className="text-center p-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {paginatedVerifications.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center p-8 text-slate-400 text-sm">
                  표시할 인증 요청이 없습니다
                </td>
              </tr>
            ) : (
              paginatedVerifications.map((verification) => (
                <tr 
                  key={verification.verification_id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-3">
                    <div>
                      <p className="text-white text-sm">{verification.users?.username}</p>
                      <p className="text-slate-500 text-xs">{verification.users?.email}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-slate-300 text-sm">{verification.bank_name}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-slate-300 text-sm font-mono">{verification.account_number}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-slate-300 text-sm">{verification.account_holder}</span>
                  </td>
                  <td className="p-3">
                    {getStatusBadge(verification.status || 'pending')}
                  </td>
                  <td className="p-3">
                    <span className="text-slate-400 text-xs">
                      {new Date(verification.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </td>
                  <td className="p-3">
                    {verification.status === 'pending' && (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleApprove(verification)}
                          disabled={processingId === verification.verification_id}
                          className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors text-xs disabled:opacity-50"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => openRejectModal(verification)}
                          disabled={processingId === verification.verification_id}
                          className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors text-xs disabled:opacity-50"
                        >
                          거부
                        </button>
                      </div>
                    )}
                    {verification.status === 'verified' && verification.smart_account_address && (
                      <div className="flex items-center justify-center gap-1 text-xs text-purple-400">
                        <Zap className="w-3 h-3" />
                        <span>Smart Account</span>
                      </div>
                    )}
                    {verification.status === 'rejected' && (
                      <span className="text-slate-500 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 bg-slate-800/50 text-slate-400 text-sm rounded">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 거부 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-slate-800 border border-red-500/30 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-white text-lg">계좌인증 거부</h3>
                <p className="text-slate-400 text-sm">{selectedVerification?.users?.username}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-slate-300 mb-2">거부 사유</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="거부 사유를 입력하세요 (예: 계좌번호 불일치)"
                className="w-full bg-slate-900/50 border border-red-500/30 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedVerification(null);
                }}
                className="flex-1 bg-slate-700 text-white py-3 rounded-lg hover:bg-slate-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingId !== null}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId ? '처리 중...' : '거부하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}