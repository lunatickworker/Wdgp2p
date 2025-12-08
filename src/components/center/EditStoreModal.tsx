import { useState, useEffect } from 'react';
import { X, Store, Lock, Eye, EyeOff, Percent, History, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { recordFeeRateChange, getFeeRateHistory } from '../../utils/api/fee-rate-history';
import { useAuth } from '../../contexts/AuthContext';

interface StoreData {
  user_id: string;
  username: string;
  email: string;
  fee_rate: number;
  status: string;
  created_at: string;
}

interface EditStoreModalProps {
  store: StoreData;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditStoreModal({ store, onClose, onSuccess }: EditStoreModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    username: store.username,
    fee_rate: store.fee_rate || 5,
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [feeRateHistory, setFeeRateHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchFeeRateHistory();
  }, []);

  const fetchFeeRateHistory = async () => {
    try {
      const { history } = await getFeeRateHistory(store.user_id);
      setFeeRateHistory(history || []);
    } catch (error) {
      console.error('수수료율 변경 이력 조회 실패:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 가맹점명 검증
    if (!formData.username.trim()) {
      toast.error('가맹점명을 입력해주세요');
      return;
    }

    // 수수료율 검증 (0~100%)
    if (formData.fee_rate < 0 || formData.fee_rate > 100) {
      toast.error('수수료율은 0~100% 사이여야 합니다');
      return;
    }

    // 비밀번호 검증
    if (formData.new_password || formData.confirm_password) {
      if (formData.new_password !== formData.confirm_password) {
        toast.error('비밀번호가 일치하지 않습니다');
        return;
      }
      if (formData.new_password.length < 8) {
        toast.error('비밀번호는 최소 8자 이상이어야 합니다');
        return;
      }
    }

    try {
      setLoading(true);

      // 1. 가맹점 정보 업데이트
      const updateData: any = {
        username: formData.username,
        fee_rate: formData.fee_rate,
      };

      // 비밀번호 변경 시
      if (formData.new_password) {
        // Edge Function 호출하여 비밀번호 변경
        const { data: resetData, error: resetError } = await supabase.functions.invoke('reset-password', {
          body: {
            userId: store.user_id,
            newPassword: formData.new_password
          }
        });

        if (resetError || !resetData?.success) {
          console.error('❌ 비밀번호 변경 실패:', resetError || resetData);
          throw new Error(resetData?.error || '비밀번호 변경에 실패했습니다');
        }
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', store.user_id);

      if (updateError) throw updateError;

      // 2. 수수료율 변경 이력 기록 (변경된 경우)
      if (formData.fee_rate !== store.fee_rate) {
        await recordFeeRateChange({
          centerId: store.user_id,
          oldRate: store.fee_rate,
          newRate: formData.fee_rate,
          changedBy: user?.id || 'system'
        });
      }

      toast.success('가맹점 정보가 수정되었습니다');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ Error:', error);
      toast.error(error.message || '가맹점 정보 수정 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg">
              <Store className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl text-cyan-400">가맹점 정보 수정</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h4 className="text-slate-300 flex items-center gap-2">
              <Store className="w-4 h-4 text-cyan-400" />
              기본 정보
            </h4>

            <div>
              <label className="block text-slate-400 text-sm mb-2">가맹점명 *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">이메일 (변경 불가)</label>
              <input
                type="email"
                value={store.email}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                disabled
              />
              <p className="text-slate-500 text-xs mt-1">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                이메일은 데이터 격리 구조상 변경할 수 없습니다
              </p>
            </div>
          </div>

          {/* 수수료율 설정 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-slate-300 flex items-center gap-2">
                <Percent className="w-4 h-4 text-cyan-400" />
                수수료율 설정
              </h4>
              {feeRateHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <History className="w-4 h-4" />
                  {showHistory ? '이력 숨기기' : '변경 이력 보기'}
                </button>
              )}
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">
                수수료율 (%) *
                <span className="text-slate-500 ml-2">현재: {store.fee_rate}%</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.fee_rate}
                onChange={(e) => setFormData({ ...formData, fee_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500"
                required
              />
              <p className="text-slate-500 text-xs mt-1">0~100% 사이의 값을 입력하세요</p>
            </div>

            {/* 수수료율 변경 이력 */}
            {showHistory && feeRateHistory.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h5 className="text-slate-400 text-sm mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  수수료율 변경 이력
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {feeRateHistory.map((record, index) => (
                    <div
                      key={record.id || index}
                      className="flex items-center justify-between text-xs p-2 bg-slate-900/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">
                          {new Date(record.changed_at).toLocaleString('ko-KR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">
                          {record.old_rate !== null ? `${record.old_rate}%` : '없음'}
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className="text-cyan-400">{record.new_rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 비밀번호 변경 */}
          <div className="space-y-4">
            <h4 className="text-slate-300 flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              비밀번호 변경
            </h4>

            <div>
              <label className="block text-slate-400 text-sm mb-2">
                새 비밀번호
                <span className="text-slate-500 ml-2">(변경하지 않으려면 비워두세요)</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.new_password}
                  onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                  className="w-full px-4 py-2 pr-12 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500"
                  minLength={8}
                  placeholder="8자 이상"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">비밀번호 확인</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  className="w-full px-4 py-2 pr-12 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500"
                  minLength={8}
                  placeholder="비밀번호 재입력"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {formData.new_password && formData.confirm_password && (
              <div className={`text-sm ${formData.new_password === formData.confirm_password ? 'text-green-400' : 'text-red-400'}`}>
                {formData.new_password === formData.confirm_password ? '✓ 비밀번호가 일치합니다' : '✗ 비밀번호가 일치하지 않습니다'}
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '수정 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}