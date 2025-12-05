import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Store,
  TrendingUp,
  Users,
  Coins,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check
} from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface StoreDashboardProps {
  storeId: string;
  centerId: string;
}

interface StoreStats {
  totalSales: number;
  totalTransactions: number;
  totalUsers: number;
  monthlyCommission: number;
}

export function StoreDashboard({ storeId, centerId }: StoreDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState<StoreStats>({
    totalSales: 0,
    totalTransactions: 0,
    totalUsers: 0,
    monthlyCommission: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [storeId]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 가맹점 정보 조회
      const { data: storeData, error: storeError } = await supabase
        .from('users')
        .select('*, referral_code, email')
        .eq('user_id', storeId)
        .eq('role', 'store')
        .single();

      if (storeError) throw storeError;
      
      // referral_code 설정 (없으면 이메일에서 생성)
      const code = storeData.referral_code || storeData.email?.split('@')[0] || '';
      setReferralCode(code.toLowerCase());

      // 통계 조회 (실제로는 transactions 테이블에서 집계)
      // 여기서는 더미 데이터 사용
      setStats({
        totalSales: 15234567,
        totalTransactions: 1234,
        totalUsers: 567,
        monthlyCommission: 234567
      });

      // 최근 거래 내역 (더미 데이터)
      setRecentTransactions([
        {
          id: '1',
          type: '구매',
          amount: 50000,
          user: '홍길동',
          date: '2025-12-01 14:30',
          status: '완료'
        },
        {
          id: '2',
          type: '판매',
          amount: 30000,
          user: '김철수',
          date: '2025-12-01 12:15',
          status: '완료'
        },
        {
          id: '3',
          type: '구매',
          amount: 100000,
          user: '이영희',
          date: '2025-12-01 10:45',
          status: '완료'
        }
      ]);
    } catch (error: any) {
      toast.error('대시보드 데이터를 불러올 수 없습니다');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      // Fallback 방식을 기본으로 사용 (권한 문제 회피)
      const textArea = document.createElement('textarea');
      textArea.value = referralCode;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        toast.success('추천인 코드가 복사되었습니다');
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('Copy command failed');
      }
    } catch (error) {
      console.error('복사 실패:', error);
      toast.error('복사에 실패했습니다');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">대시보드 로드 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">가맹점 대시보드</h1>
            <p className="text-gray-500">매출 및 거래 현황</p>
          </div>
        </div>
        <Button>
          <Calendar className="w-4 h-4 mr-2" />
          정산 요청
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">총 매출</span>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold mb-1">
            {stats.totalSales.toLocaleString()} KRWQ
          </div>
          <div className="flex items-center text-sm text-green-500">
            <ArrowUpRight className="w-4 h-4 mr-1" />
            <span>+12.5% from last month</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">거래 건수</span>
            <Coins className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold mb-1">
            {stats.totalTransactions.toLocaleString()}
          </div>
          <div className="flex items-center text-sm text-blue-500">
            <ArrowUpRight className="w-4 h-4 mr-1" />
            <span>+8.2% from last month</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">이용 회원</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold mb-1">
            {stats.totalUsers.toLocaleString()}
          </div>
          <div className="flex items-center text-sm text-purple-500">
            <ArrowUpRight className="w-4 h-4 mr-1" />
            <span>+5.7% from last month</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">이번 달 커미션</span>
            <TrendingUp className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold mb-1">
            {stats.monthlyCommission.toLocaleString()} KRWQ
          </div>
          <div className="flex items-center text-sm text-orange-500">
            <ArrowUpRight className="w-4 h-4 mr-1" />
            <span>+15.3% from last month</span>
          </div>
        </Card>
      </div>

      {/* 추천인 코드 카드 */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              추천인 코드
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              회원이 가입할 때 이 코드를 사용합니다. 코드를 공유하여 신규 회원을 등록하세요.
            </p>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-lg">
                {referralCode}
              </code>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    복사
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>사용 방법:</strong> 회원에게 이 코드를 전달하여 가입 시 "추천인 코드" 필드에 입력하도록 안내하세요.
          </p>
        </div>
      </Card>

      {/* 탭 컨텐츠 */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList>
          <TabsTrigger value="transactions">최근 거래</TabsTrigger>
          <TabsTrigger value="users">회원 목록</TabsTrigger>
          <TabsTrigger value="commission">커미션 내역</TabsTrigger>
        </TabsList>

        {/* 최근 거래 탭 */}
        <TabsContent value="transactions">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">최근 거래 내역</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>거래 ID</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>회원</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>날짜</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-sm">
                        {tx.id}
                      </TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell>{tx.user}</TableCell>
                      <TableCell className="font-semibold">
                        {tx.amount.toLocaleString()} KRWQ
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {tx.date}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                          {tx.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* 회원 목록 탭 */}
        <TabsContent value="users">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">이용 회원 목록</h3>
            <p className="text-gray-500">구현 예정</p>
          </Card>
        </TabsContent>

        {/* 커미션 내역 탭 */}
        <TabsContent value="commission">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">커미션 정산 내역</h3>
            <p className="text-gray-500">구현 예정</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}