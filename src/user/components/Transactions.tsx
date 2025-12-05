import { ChevronRight, ArrowDownToLine, ArrowUpFromLine, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Screen, Transaction } from '../App';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';

interface TransferRequest {
  request_id: string;
  coin_type: string;
  amount: number;
  status: string;
  user_note: string | null;
  admin_note: string | null;
  created_at: string;
  approved_at: string | null;
}

interface TransactionsProps {
  transactions: Transaction[];
  onNavigate: (screen: Screen) => void;
}

export function Transactions({ transactions, onNavigate }: TransactionsProps) {
  const { user } = useAuth();
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');
  const [coinIcons, setCoinIcons] = useState<Map<string, string>>(new Map());

  // 코인 아이콘 로드
  useEffect(() => {
    const fetchCoinIcons = async () => {
      try {
        const { data: coins } = await supabase
          .from('supported_tokens')
          .select('symbol, icon_url');
        
        if (coins) {
          const iconMap = new Map<string, string>();
          coins.forEach((coin: any) => {
            if (coin.icon_url) {
              iconMap.set(coin.symbol, coin.icon_url);
            }
          });
          setCoinIcons(iconMap);
        }
      } catch (error) {
        console.error('Error fetching coin icons:', error);
      }
    };

    fetchCoinIcons();
  }, []);

  useEffect(() => {
    fetchTransferRequests();
  }, [user]);

  const fetchTransferRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('transfer_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransferRequests(data);
    }
    setIsLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: Clock },
      approved: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle }
    };

    const config = styles[status as keyof typeof styles] || styles.pending;
    const Icon = config.icon;

    const labels = {
      pending: '대기중',
      approved: '승인됨',
      rejected: '거부됨'
    };

    return (
      <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${config.bg} ${config.text} text-xs`}>
        <Icon className="w-3 h-3" />
        <span>{labels[status as keyof typeof labels] || status}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('home')} 
        className="lg:hidden flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span>뒤로</span>
      </button>

      <div>
        <h2 className="text-2xl text-white">거래 내역</h2>
        <p className="hidden lg:block text-slate-400 text-sm mt-1">입출금 및 전송 요청 내역</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400'
          }`}
        >
          입출금 내역
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'requests'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400'
          }`}
        >
          코인 구매 요청
        </button>
      </div>

      {/* 입출금 내역 */}
      {activeTab === 'all' && (
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              거래 내역이 없습니다
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {tx.type === 'deposit' ? (
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <ArrowDownToLine className="w-5 h-5 text-green-400" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <ArrowUpFromLine className="w-5 h-5 text-red-400" />
                      </div>
                    )}
                    <div>
                      <div className="text-white">
                        {tx.type === 'deposit' ? '입금' : '출금'} {tx.status === 'confirmed' || tx.status === 'completed' ? '완료' : '대기'}
                      </div>
                      <div className="text-sm text-slate-400">{tx.coin_type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}>
                      {tx.type === 'deposit' ? '+' : '-'}{tx.amount}
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 코인 구매 요청 내역 */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : transferRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              코인 구매 요청 내역이 없습니다
            </div>
          ) : (
            transferRequests.map((request) => (
              <div key={request.request_id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-white">코인 구매 요청</div>
                      <div className="text-sm text-slate-400">{request.coin_type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400">
                      +{parseFloat(request.amount.toString()).toFixed(8)}
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                  <div>
                    {getStatusBadge(request.status)}
                  </div>
                  {request.approved_at && (
                    <div className="text-xs text-slate-400">
                      처리일: {new Date(request.approved_at).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {request.user_note && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <div className="text-xs text-slate-400 mb-1">내 메모</div>
                    <div className="text-sm text-slate-300">{request.user_note}</div>
                  </div>
                )}

                {request.admin_note && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <div className="text-xs text-slate-400 mb-1">관리자 메모</div>
                    <div className="text-sm text-slate-300">{request.admin_note}</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}