import { ArrowDownCircle, ArrowUpCircle, CheckCircle, XCircle, Clock, Filter, Search, ChevronLeft, ChevronRight, Eye, DollarSign, ExternalLink, FileText, Coins as CoinsIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { SUPABASE_CONFIG } from "../utils/config";
import { toast } from "sonner@2.0.3";
import { getHierarchyUserIds } from "../utils/api/query-helpers";

interface TransferRequest {
  request_id: string;
  user_id: string;
  wallet_id: string;
  coin_type: string;
  amount: number;
  status: string;
  user_note: string | null;
  admin_note: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  tx_hash?: string | null;
  username?: string;
  email?: string;
}

interface Deposit {
  deposit_id: string;
  user_id: string;
  wallet_id: string;
  coin_type: string;
  amount: number;
  tx_hash: string;
  confirmations: number;
  required_confirmations: number;
  status: string;
  from_address: string | null;
  method: string;
  created_at: string;
  confirmed_at: string | null;
  username?: string;
  email?: string;
  viewed_by_store?: boolean;
  viewed_at?: string;
}

interface Withdrawal {
  withdrawal_id: string;
  user_id: string;
  wallet_id: string;
  coin_type: string;
  amount: number;
  fee: number;
  to_address: string;
  tx_hash: string | null;
  status: string;
  rejection_reason: string | null;
  approved_by: string | null;
  method: string;
  created_at: string;
  completed_at: string | null;
  username?: string;
  email?: string;
}

interface TransactionReceipt {
  txHash: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  timestamp?: string;
  confirmations?: number;
}

type TabType = "transfer_requests" | "deposits" | "withdrawals";

export function DepositWithdrawalManagement() {
  const { user } = useAuth();
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  
  // 가맹점 계정은 기본 탭을 "deposits"로 설정
  const initialTab = user?.role === 'store' ? 'deposits' : 'transfer_requests';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Transaction Receipt 모달
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<TransactionReceipt | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  // 코인 아이콘 매핑
  const [coinIcons, setCoinIcons] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchData();
      fetchCoinIcons();

      // 가맹점 계정이 입금 탭을 확인하면 localStorage 업데이트
      if (user.role === 'store' && activeTab === 'deposits') {
        const lastViewedKey = `store_last_viewed_deposits_${user.id}`;
        localStorage.setItem(lastViewedKey, new Date().toISOString());
        console.log('✅ 가맹점 입금 내역 확인 완료:', new Date().toISOString());
      }

      // 실시간 업데이트
      const channel = supabase
        .channel('deposit-withdrawal-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transfer_requests' },
          () => {
            if (user.role !== 'store') {
              fetchData();
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'deposits' },
          () => fetchData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'withdrawals' },
          () => {
            if (user.role !== 'store') {
              fetchData();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    if (!user || !user.role) return;

    console.log('📊 Fetching deposit/withdrawal data for user:', user.id, 'role:', user.role);

    try {
      // 계층 구조에 따라 하위 사용자 ID 조회
      const allowedUserIds = await getHierarchyUserIds(user.id, user.role);

      console.log('✅ Allowed user IDs:', allowedUserIds.length, allowedUserIds);

      // Transfer Requests
      let transferQuery = supabase
        .from('transfer_requests')
        .select(`
          *,
          users!transfer_requests_user_id_fkey(username, email)
        `);

      if (user.role !== 'master') {
        transferQuery = transferQuery.in('user_id', allowedUserIds);
      }

      const { data: transferData } = await transferQuery.order('created_at', { ascending: false });

      if (transferData) {
        setTransferRequests(transferData.map((item: any) => ({
          ...item,
          username: item.users?.username,
          email: item.users?.email
        })));
      }

      // Deposits
      let depositQuery = supabase
        .from('deposits')
        .select(`
          *,
          users!deposits_user_id_fkey(username, email)
        `);

      if (user.role !== 'master') {
        depositQuery = depositQuery.in('user_id', allowedUserIds);
      }

      const { data: depositData } = await depositQuery.order('created_at', { ascending: false });

      if (depositData) {
        setDeposits(depositData.map((item: any) => ({
          ...item,
          username: item.users?.username,
          email: item.users?.email
        })));
      }

      // Withdrawals
      let withdrawalQuery = supabase
        .from('withdrawals')
        .select(`
          *,
          users!withdrawals_user_id_fkey(username, email)
        `);

      if (user.role !== 'master') {
        withdrawalQuery = withdrawalQuery.in('user_id', allowedUserIds);
      }

      const { data: withdrawalData } = await withdrawalQuery.order('created_at', { ascending: false });

      if (withdrawalData) {
        setWithdrawals(withdrawalData.map((item: any) => ({
          ...item,
          username: item.users?.username,
          email: item.users?.email
        })));
      }

      console.log('📊 Data loaded:', {
        transfers: transferData?.length || 0,
        deposits: depositData?.length || 0,
        withdrawals: withdrawalData?.length || 0
      });

    } catch (error) {
      console.error('❌ Error fetching data:', error);
      toast.error('데이터를 가져오는데 실패했습니다');
    }
  };

  const fetchCoinIcons = async () => {
    try {
      const { data: coinData } = await supabase
        .from('supported_tokens')
        .select('symbol, icon_url');

      if (coinData) {
        const icons: Record<string, string> = {};
        coinData.forEach((coin: { symbol: string, icon_url: string }) => {
          icons[coin.symbol] = coin.icon_url;
        });
        setCoinIcons(icons);
      }
    } catch (error) {
      console.error('❌ Error fetching coin icons:', error);
      toast.error('코인 아이콘을 가져오는데 실패했습니다');
    }
  };

  // 코인 구매 요청 승인
  const handleApproveRequest = async (request: TransferRequest) => {
    if (!adminNote.trim()) {
      toast.error('관리자 메모를 입력해주세요');
      return;
    }

    if (!user?.id) {
      toast.error('로그인 정보를 찾을 수 없습니다');
      return;
    }

    setIsProcessing(true);

    try {
      const adminId = user.id; // AuthContext에서 가져온 사용자 ID

      console.log('🔍 관리자 지갑 조회:', { adminId, coin_type: request.coin_type });

      // 디버깅: 관리자의 모든 지갑 조회
      const { data: allAdminWallets } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', adminId);
      
      console.log('👛 관리자의 전체 지갑 목록:', allAdminWallets);

      // 1. 관리자 지갑 정보 조회
      const { data: adminWalletData, error: adminWalletError } = await supabase
        .from('wallets')
        .select('address')
        .eq('user_id', adminId)
        .eq('coin_type', request.coin_type)
        .single();

      console.log('📦 관리자 지갑 조회 결과:', { adminWalletData, adminWalletError });

      if (adminWalletError || !adminWalletData) {
        // 더 상세한 에러 메시지
        const errorMsg = `관리자의 ${request.coin_type} 지갑을 찾을 수 없습니다. 지갑 관리에서 ${request.coin_type} 지갑을 먼저 생성해주세요.`;
        console.error('❌ 관리자 지갑 없음:', errorMsg, { adminId, coin_type: request.coin_type });
        throw new Error(errorMsg);
      }

      // 2. 사용자 지갑 정보 조회
      const { data: userWalletData, error: userWalletError } = await supabase
        .from('wallets')
        .select('address, balance')
        .eq('wallet_id', request.wallet_id)
        .single();

      if (userWalletError || !userWalletData) {
        throw new Error('사용자 지갑을 찾을 수 없습니다');
      }

      // 3. 코인 정보 조회 (chain_id 필요)
      const { data: coinData, error: coinError } = await supabase
        .from('supported_tokens')
        .select('chain_id, contract_address, decimals')
        .eq('symbol', request.coin_type)
        .single();

      if (coinError || !coinData) {
        throw new Error('코인 정보를 찾을 수 없습니다');
      }

      toast.info('블록체인 전송을 시작합니다...');

      // 4. Biconomy Supertransaction API로 실제 전송 (Backend 호출)
      const backendUrl = `${SUPABASE_CONFIG.backendUrl}/api/biconomy/transfer`;
      console.log('🌐 Backend URL:', backendUrl);
      
      const transferResponse = await fetch(backendUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        },
        body: JSON.stringify({
          chainId: coinData.chain_id,
          from: adminWalletData.address,
          to: userWalletData.address,
          token: request.coin_type,
          amount: request.amount.toString(),
          gasPayment: {
            sponsor: true  // 관리자가 가스비 스폰서
          }
        })
      });

      console.log('📡 Transfer Response Status:', transferResponse.status);

      const transferResult = await transferResponse.json();
      console.log('📦 Transfer Result:', transferResult);

      if (!transferResponse.ok || !transferResult.success) {
        // 잔액 부족 에러 처리
        if (transferResult.code === 'INSUFFICIENT_BALANCE' && transferResult.details) {
          const { required, available, shortage, token } = transferResult.details;
          
          // 친절한 에러 메시지
          toast.error(
            <div className="space-y-2">
              <div className="font-semibold">💰 관리자 지갑 잔액 부족</div>
              <div className="text-sm space-y-1">
                <div>• 필요한 수량: <span className="font-mono">{required.toFixed(8)} {token}</span></div>
                <div>• 현재 보유: <span className="font-mono">{available.toFixed(8)} {token}</span></div>
                <div>• 부족한 수량: <span className="font-mono text-red-400">{shortage.toFixed(8)} {token}</span></div>
              </div>
              <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                💡 관리자 지갑 주소: <span className="font-mono">{adminWalletData.address}</span>
              </div>
            </div>,
            { duration: 10000 } // 10초 동안 표시
          );
          
          // 추가 정보 토스트
          setTimeout(() => {
            toast.info(
              `관리자 지갑에 ${shortage.toFixed(2)} ${token} 이상을 충전한 후 다시 승인해주세요.`,
              { duration: 8000 }
            );
          }, 500);
          
          return;
        }
        throw new Error(transferResult.error || '블록체인 전송에 실패했습니다');
      }

      const txHash = transferResult.txHash;
      toast.success('블록체인 전송 완료! 잔액을 업데이트합니다...');
      
      // ===========================
      // 자동 출금 프로세스 시작
      // ===========================
      toast.info('🔄 가맹점으로 자동 출금을 시작합니다...');
      
      try {
        // 1. 사용자의 가맹점(store) 정보 조회
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('parent_user_id')
          .eq('user_id', request.user_id)
          .single();

        if (userError || !userData || !userData.parent_user_id) {
          console.warn('⚠️ 가맹점 정보를 찾을 수 없습니다. 자동 출금을 건너뜁니다.');
          toast.warning('가맹점 정보가 없어 자동 출금을 건너뛰었습니다.');
        } else {
          const storeId = userData.parent_user_id;
          console.log('🏪 가맹점 ID:', storeId);

          // 2. 가맹점의 지갑 주소 조회
          const { data: storeWalletData, error: storeWalletError } = await supabase
            .from('wallets')
            .select('address, wallet_id')
            .eq('user_id', storeId)
            .eq('coin_type', request.coin_type)
            .single();

          if (storeWalletError || !storeWalletData) {
            console.warn(`⚠️ 가맹점의 ${request.coin_type} 지갑을 찾을 수 없습니다.`);
            toast.warning(`가맹점의 ${request.coin_type} 지갑이 없어 자동 출금을 건너뛰었습니다.`);
          } else {
            console.log('📍 가맹점 지갑 주소:', storeWalletData.address);

            // 3. 사용자 지갑에서 가맹점 지갑으로 실제 전송 (Biconomy)
            const backendUrl = `${SUPABASE_CONFIG.backendUrl}/transaction/send`;
            
            const autoWithdrawResponse = await fetch(backendUrl, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
              },
              body: JSON.stringify({
                fromUserId: request.user_id,  // 사용자 ID로 지갑 조회
                toAddress: storeWalletData.address,    // 가맹점 지갑
                coinType: request.coin_type,
                amount: request.amount.toString(),
                gasPayment: {
                  sponsor: true  // 관리자가 가스비 스폰서
                }
              })
            });

            const autoWithdrawResult = await autoWithdrawResponse.json();

            if (!autoWithdrawResponse.ok || !autoWithdrawResult.success) {
              console.error('❌ 자동 출금 실패:', autoWithdrawResult);
              toast.error('자동 출금에 실패했습니다. 수동으로 출금해주세요.');
            } else {
              const withdrawTxHash = autoWithdrawResult.txHash;
              console.log('✅ 자동 출금 성공:', withdrawTxHash);

              // 4. 사용자 지갑 ��액 차감
              const { error: balanceUpdateError } = await supabase
                .from('wallets')
                .update({ balance: 0 })  // 전액 출금
                .eq('wallet_id', request.wallet_id);

              if (balanceUpdateError) {
                console.error('❌ 잔액 업데이트 실패:', balanceUpdateError);
              }

              // 5. withdrawals 테이블에 출금 기록 생성
              const { error: withdrawError } = await supabase
                .from('withdrawals')
                .insert({
                  user_id: request.user_id,
                  wallet_id: request.wallet_id,
                  coin_type: request.coin_type,
                  amount: request.amount,
                  tx_hash: withdrawTxHash,
                  to_address: storeWalletData.address,
                  status: 'completed',
                  fee: 0,  // 가스비는 스폰서가 부담
                  method: 'auto_withdraw',
                  created_at: new Date().toISOString(),
                  completed_at: new Date().toISOString()
                });

              if (withdrawError) {
                console.error('❌ 출금 기록 저장 실패:', withdrawError);
              }

              // 6. transactions 테이블에 출금 기록 생성
              const { error: withdrawTxError } = await supabase
                .from('transactions')
                .insert({
                  user_id: request.user_id,
                  wallet_id: request.wallet_id,
                  type: 'withdrawal',
                  coin_type: request.coin_type,
                  amount: request.amount,
                  balance_before: request.amount,  // 입금 후 출금 전 잔액
                  balance_after: 0,  // 전액 출금
                  reference_id: request.request_id,
                  tx_hash: withdrawTxHash,
                  description: '가맹점 자동 출금',
                  metadata: {
                    method: 'auto_withdraw',
                    store_id: storeId,
                    store_address: storeWalletData.address,
                    gas_sponsored: true,
                    deposit_tx_hash: txHash
                  },
                  created_at: new Date().toISOString()
                });

              if (withdrawTxError) {
                console.error('❌ 출금 트랜잭션 기록 실패:', withdrawTxError);
              }

              // 7. 사용자에게 종알림 전송
              const { error: notificationError } = await supabase
                .from('notifications')
                .insert({
                  user_id: request.user_id,
                  type: 'transaction',
                  title: '입금 완료',
                  message: `${request.amount} ${request.coin_type} 입금이 완료되어 가맹점으로 전송되었습니다.`,
                  is_read: false,
                  metadata: {
                    tx_hash: withdrawTxHash,
                    amount: request.amount,
                    coin_type: request.coin_type,
                    store_address: storeWalletData.address
                  },
                  created_at: new Date().toISOString()
                });

              if (notificationError) {
                console.error('❌ 알림 전송 실패:', notificationError);
              }

              toast.success(`✅ 가맹점으로 자동 출금 완료! TX: ${withdrawTxHash.substring(0, 10)}...`);
            }
          }
        }
      } catch (autoWithdrawError: any) {
        console.error('❌ 자동 출금 처리 중 오류:', autoWithdrawError);
        toast.error(`자동 출금 중 오류: ${autoWithdrawError.message}`);
      }
      // ===========================
      // 자동 출금 프로세스 종료
      // ===========================

      // 5. 요청 상태를 승인으로 변경
      const { error: requestError } = await supabase
        .from('transfer_requests')
        .update({
          status: 'approved',
          admin_note: adminNote,
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          tx_hash: txHash
        })
        .eq('request_id', request.request_id);

      if (requestError) throw requestError;

      // 6. 지갑 잔액 업데이트
      const newBalance = parseFloat(userWalletData.balance) + request.amount;

      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('wallet_id', request.wallet_id);

      if (updateError) throw updateError;

      // 7. deposits 테이블에 입금 기록 생성
      const { error: depositError } = await supabase
        .from('deposits')
        .insert({
          user_id: request.user_id,
          wallet_id: request.wallet_id,
          coin_type: request.coin_type,
          amount: request.amount,
          tx_hash: txHash,
          confirmations: 1,
          required_confirmations: 1,
          status: 'confirmed',
          from_address: adminWalletData.address,
          method: 'supertransaction',
          created_at: new Date().toISOString(),
          confirmed_at: new Date().toISOString()
        });

      if (depositError) throw depositError;

      // 8. 트랜잭션 기록 생성
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: request.user_id,
          wallet_id: request.wallet_id,
          type: 'deposit',
          coin_type: request.coin_type,
          amount: request.amount,
          balance_before: parseFloat(userWalletData.balance),
          balance_after: newBalance,
          reference_id: request.request_id,
          tx_hash: txHash,
          description: `코인 구매 승인 - ${adminNote}`,
          metadata: {
            method: 'supertransaction',
            gas_sponsored: true,
            admin_wallet: adminWalletData.address
          },
          created_at: new Date().toISOString()
        });

      if (txError) throw txError;

      toast.success(`✅ 승인 완료! TX: ${txHash.substring(0, 10)}...`);
      setSelectedRequest(null);
      setAdminNote('');
      fetchData();

    } catch (error: any) {
      console.error('Approve error:', error);
      toast.error(error.message || '승인 처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessing(false);
    }
  };

  // 코인 구매 요청 거부
  const handleRejectRequest = async (request: TransferRequest) => {
    if (!adminNote.trim()) {
      toast.error('거부 사유를 입력해주세요');
      return;
    }

    setIsProcessing(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminId = authData.user?.id;

      const { error } = await supabase
        .from('transfer_requests')
        .update({
          status: 'rejected',
          admin_note: adminNote,
          approved_by: adminId,
          approved_at: new Date().toISOString()
        })
        .eq('request_id', request.request_id);

      if (error) throw error;

      toast.success('코인 구매 요청이 거부되었습니다');
      setSelectedRequest(null);
      setAdminNote('');
      fetchData();

    } catch (error: any) {
      console.error('Reject error:', error);
      toast.error(error.message || '거부 처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessing(false);
    }
  };

  // Transaction Receipt 조회
  const handleViewReceipt = async (txHash: string, chainId: number = 8453, depositId?: string) => {
    setIsLoadingReceipt(true);
    setShowReceiptModal(true);
    setCurrentReceipt({ txHash, status: 'pending' });

    try {
      // 가맹점 계정이 입금 내역의 Receipt를 확인하면 viewed_by_store = true로 업데이트
      if (user?.role === 'store' && depositId && activeTab === 'deposits') {
        console.log('✅ 가맹점이 입금 Receipt 확인:', depositId);
        
        const { error: updateError } = await supabase
          .from('deposits')
          .update({ 
            viewed_by_store: true,
            viewed_at: new Date().toISOString()
          })
          .eq('deposit_id', depositId);

        if (updateError) {
          console.error('❌ viewed_by_store 업데이트 실패:', updateError);
        } else {
          console.log('✅ viewed_by_store 업데이트 성공');
        }
      }

      const backendUrl = 'https://mzoeeqmtvlnyonicycvg.supabase.co/functions/v1/make-server-b6d5667f';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b2VlcW10dmxueW9uaWN5Y3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjIyNzcsImV4cCI6MjA3ODQ5ODI3N30.oo7FsWjthtBtM-Xa1VFJieMGQ4mG__V8w7r9qGBPzaI';

      const response = await fetch(`${backendUrl}/transaction/receipt/${txHash}?chainId=${chainId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${anonKey}`
        }
      });

      const result = await response.json();

      if (result.success && result.receipt) {
        setCurrentReceipt(result.receipt);
      } else {
        toast.error('Receipt 조회 실패');
      }
    } catch (error: any) {
      console.error('Receipt 조회 오류:', error);
      toast.error('Receipt 조회 중 오류가 발생했습니다');
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  // 필터링
  const getFilteredData = () => {
    let data: any[] = [];

    // 가맹점 계정: 코인 구매 요청 탭에서도 입금 내역 표시
    if (user?.role === 'store' && activeTab === "transfer_requests") {
      data = deposits;  // 입금 내역을 표시
    } else if (activeTab === "transfer_requests") {
      data = transferRequests;
    } else if (activeTab === "deposits") {
      data = deposits;
    } else {
      data = withdrawals;
    }

    return data.filter(item => {
      const matchesSearch = 
        item.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.coin_type?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // 통계 계산
  const stats = {
    pending: transferRequests.filter(r => r.status === 'pending').length,
    approved: transferRequests.filter(r => r.status === 'approved').length,
    rejected: transferRequests.filter(r => r.status === 'rejected').length,
    totalDeposits: deposits.length,
    totalWithdrawals: withdrawals.length
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      approved: "bg-green-500/20 text-green-400 border-green-500/30",
      rejected: "bg-red-500/20 text-red-400 border-red-500/30",
      confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
      processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      completed: "bg-green-500/20 text-green-400 border-green-500/30",
      failed: "bg-red-500/20 text-red-400 border-red-500/30"
    };

    const labels = {
      pending: "대기중",
      approved: "승인됨",
      rejected: "거부됨",
      confirmed: "확인됨",
      processing: "처리중",
      completed: "완료",
      failed: "실패"
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {user?.role === 'store' ? (
            <>
              <h2 className="text-cyan-400 mb-1">거래 내역</h2>
              <p className="text-slate-400 text-sm">입금 및 출금 내역을 확인합니다</p>
            </>
          ) : (
            <>
              <h2 className="text-cyan-400 mb-1">구매 요청 관리</h2>
              <p className="text-slate-400 text-sm">사용자의 코인 구매 요청을 승인하고 입출금 내역을 확인합니다</p>
            </>
          )}
        </div>
      </div>

      {/* 통계 카드 */}
      {user?.role === 'store' ? (
        // 가맹점 계정: 총 입금, 총 출금 표시
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">총 입금</p>
              <p className="text-cyan-400 text-2xl">{stats.totalDeposits}</p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">총 출금</p>
              <p className="text-purple-400 text-2xl">{stats.totalWithdrawals}</p>
            </div>
          </div>
        </div>
      ) : (
        // 다른 계정: 전체 통계 표시
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">대기중 요청</p>
              <p className="text-amber-400 text-2xl">{stats.pending}</p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">승인됨</p>
              <p className="text-green-400 text-2xl">{stats.approved}</p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">거부됨</p>
              <p className="text-red-400 text-2xl">{stats.rejected}</p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">총 입금</p>
              <p className="text-cyan-400 text-2xl">{stats.totalDeposits}</p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">총 출금</p>
              <p className="text-purple-400 text-2xl">{stats.totalWithdrawals}</p>
            </div>
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-2 border-b border-slate-700/50">
        {/* 가맹점 계정: 코인 구매 요청 탭 숨김 */}
        {user?.role !== 'store' && (
          <button
            onClick={() => {
              setActiveTab("transfer_requests");
              setCurrentPage(1);
              setStatusFilter("all");
            }}
            className={`px-6 py-3 border-b-2 transition-colors ${
              activeTab === "transfer_requests"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              <span>코인 구매 요청</span>
              {stats.pending > 0 && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                  {stats.pending}
                </span>
              )}
            </div>
          </button>
        )}

        <button
          onClick={() => {
            setActiveTab("deposits");
            setCurrentPage(1);
            setStatusFilter("all");
          }}
          className={`px-6 py-3 border-b-2 transition-colors ${
            activeTab === "deposits"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5" />
            <span>입금 내역</span>
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab("withdrawals");
            setCurrentPage(1);
            setStatusFilter("all");
          }}
          className={`px-6 py-3 border-b-2 transition-colors ${
            activeTab === "withdrawals"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5" />
            <span>출금 내역</span>
          </div>
        </button>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="사용자 이름, 이메일, 코인으로 검색..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        {/* 가맹점 계정: 상태 필터 숨김 */}
        {user?.role !== 'store' && (
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
          >
            <option value="all">전체 상태</option>
            {activeTab === "transfer_requests" && (
              <>
                <option value="pending">대기중</option>
                <option value="approved">승인됨</option>
                <option value="rejected">거부됨</option>
              </>
            )}
            {activeTab === "deposits" && (
              <>
                <option value="pending">대기중</option>
                <option value="confirmed">확인됨</option>
                <option value="failed">실패</option>
              </>
            )}
            {activeTab === "withdrawals" && (
              <>
                <option value="pending">대기중</option>
                <option value="processing">처리중</option>
                <option value="completed">완료</option>
                <option value="rejected">거부됨</option>
                <option value="failed">실패</option>
              </>
            )}
          </select>
        )}
      </div>

      {/* 테이블 */}
      <div className="relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl opacity-20 blur"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-slate-300">사용자</th>
                  <th className="px-6 py-4 text-left text-slate-300">코인</th>
                  <th className="px-6 py-4 text-right text-slate-300">수량</th>
                  <th className="px-6 py-4 text-left text-slate-300">상태</th>
                  <th className="px-6 py-4 text-left text-slate-300">생성일</th>
                  <th className="px-6 py-4 text-right text-slate-300">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      데이터가 없습니다
                    </td>
                  </tr>
                ) : (
                  currentData.map((item: any) => (
                    <tr key={item.request_id || item.deposit_id || item.withdrawal_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-slate-200">{item.username || 'Unknown'}</p>
                          <p className="text-slate-400 text-sm">{item.email || ''}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {coinIcons[item.coin_type] ? (
                            <img 
                              src={coinIcons[item.coin_type]} 
                              alt={item.coin_type}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) => {
                                // 이미지 로드 실패 시 아이콘으로 대체
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center ${coinIcons[item.coin_type] ? 'hidden' : ''}`}>
                            <CoinsIcon className="w-4 h-4 text-cyan-400" />
                          </div>
                          <span className="text-slate-200">{item.coin_type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-slate-200">{parseFloat(item.amount).toFixed(8)}</p>
                        {item.fee && item.fee > 0 && (
                          <p className="text-slate-400 text-sm">수수료: {parseFloat(item.fee).toFixed(8)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-300 text-sm">
                          {new Date(item.created_at).toLocaleString('ko-KR')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === "transfer_requests" && item.status === "pending" && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedRequest(item);
                                  setAdminNote('');
                                }}
                                className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all"
                                title="상세보기"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {activeTab === "transfer_requests" && item.status === "approved" && item.tx_hash && (
                            <button
                              onClick={() => handleViewReceipt(item.tx_hash)}
                              className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-all"
                              title="Receipt 확인"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          {(activeTab === "deposits" || activeTab === "withdrawals") && item.tx_hash && (
                            <button
                              onClick={() => handleViewReceipt(item.tx_hash, 8453, item.deposit_id)}
                              className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-all"
                              title="Receipt 확인"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          {activeTab !== "transfer_requests" && !item.tx_hash && (
                            <button
                              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 transition-all cursor-not-allowed"
                              title="TX Hash 없음"
                              disabled
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50 bg-slate-800/30">
              <div className="text-slate-400 text-sm">
                {filteredData.length}개 중 {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)}개 표시
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[40px] h-10 px-3 rounded-lg transition-all ${
                            currentPage === page
                              ? 'bg-cyan-500 text-white'
                              : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="text-slate-500">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 승인/거부 모달 */}
      {selectedRequest && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => {
            setSelectedRequest(null);
            setAdminNote('');
          }}
        >
          <div
            className="relative w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl opacity-30 blur"></div>
            <div className="relative bg-slate-900 border border-cyan-500/30 rounded-2xl p-6">
              <h3 className="text-white text-xl mb-6">코인 구매 요청 처리</h3>

              <div className="space-y-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">사용자</span>
                    <span className="text-white">{selectedRequest.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">이메일</span>
                    <span className="text-white">{selectedRequest.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">코인</span>
                    <span className="text-cyan-400">{selectedRequest.coin_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">수량</span>
                    <span className="text-white">{parseFloat(selectedRequest.amount.toString()).toFixed(8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">요청일시</span>
                    <span className="text-white">{new Date(selectedRequest.created_at).toLocaleString('ko-KR')}</span>
                  </div>
                  {selectedRequest.user_note && (
                    <div>
                      <span className="text-slate-400 block mb-1">사용자 메모</span>
                      <p className="text-white bg-slate-900/50 rounded p-2 text-sm">{selectedRequest.user_note}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 mb-2 text-sm">관리자 메모 *</label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                    placeholder="승인/거부 사유를 입력하세요..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleApproveRequest(selectedRequest)}
                  disabled={isProcessing}
                  className="flex-1 bg-green-500/20 border border-green-500 text-green-400 py-3 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>승인</span>
                </button>

                <button
                  onClick={() => handleRejectRequest(selectedRequest)}
                  disabled={isProcessing}
                  className="flex-1 bg-red-500/20 border border-red-500 text-red-400 py-3 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  <span>거부</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setAdminNote('');
                  }}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Receipt 모달 */}
      {showReceiptModal && currentReceipt && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => {
            setShowReceiptModal(false);
            setCurrentReceipt(null);
          }}
        >
          <div
            className="relative w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl opacity-30 blur"></div>
            <div className="relative bg-slate-900 border border-cyan-500/30 rounded-2xl p-6">
              <h3 className="text-white text-xl mb-6">트랜잭션 영수증</h3>

              <div className="space-y-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">트랜잭션 해시</span>
                    <span className="text-white">
                      <a href={`https://explorer.binance.org/tx/${currentReceipt.txHash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                        {currentReceipt.txHash.substring(0, 10)}...
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">상태</span>
                    <span className="text-white">
                      {currentReceipt.status === 'pending' && <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">대기중</span>}
                      {currentReceipt.status === 'processing' && <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">처리중</span>}
                      {currentReceipt.status === 'completed' && <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">완료</span>}
                      {currentReceipt.status === 'failed' && <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">실패</span>}
                    </span>
                  </div>
                  {currentReceipt.blockNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">블록 번호</span>
                      <span className="text-white">{currentReceipt.blockNumber}</span>
                    </div>
                  )}
                  {currentReceipt.gasUsed && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">사용된 가스</span>
                      <span className="text-white">{currentReceipt.gasUsed}</span>
                    </div>
                  )}
                  {currentReceipt.effectiveGasPrice && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">효과적인 가스 가격</span>
                      <span className="text-white">{currentReceipt.effectiveGasPrice}</span>
                    </div>
                  )}
                  {currentReceipt.timestamp && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">타임스탬프</span>
                      <span className="text-white">{new Date(currentReceipt.timestamp).toLocaleString('ko-KR')}</span>
                    </div>
                  )}
                  {currentReceipt.confirmations && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">확인 수</span>
                      <span className="text-white">{currentReceipt.confirmations}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReceiptModal(false);
                    setCurrentReceipt(null);
                  }}
                  className="px-6 py-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg hover:border-cyan-500/50 transition-all"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}