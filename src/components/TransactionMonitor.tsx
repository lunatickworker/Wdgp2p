import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Loader, Zap, ExternalLink } from 'lucide-react';
import { getTransactionStatus } from '../utils/biconomy/smartAccount';
import { BICONOMY_CONFIG } from '../utils/config';

interface TransactionMonitorProps {
  txHash: string;
  chainId?: number;
  onStatusChange?: (status: string) => void;
}

export function TransactionMonitor({ txHash, chainId = 8453, onStatusChange }: TransactionMonitorProps) {
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!txHash) return;

    const checkStatus = async () => {
      try {
        const result = await getTransactionStatus(txHash);
        setStatus(result.status);
        setDetails(result.details);
        
        if (onStatusChange) {
          onStatusChange(result.status);
        }

        // 완료되거나 실패한 경우 폴링 중지
        if (result.status === 'completed' || result.status === 'failed') {
          return;
        }
      } catch (err: any) {
        console.error('Status check error:', err);
        setError(err.message);
      }
    };

    // 초기 확인
    checkStatus();

    // 5초마다 상태 확인 (pending/processing인 경우만)
    const interval = setInterval(() => {
      if (status === 'pending' || status === 'processing') {
        checkStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [txHash, status, onStatusChange]);

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-400" />;
      case 'processing':
        return <Loader className="w-6 h-6 text-cyan-400 animate-spin" />;
      default:
        return <Clock className="w-6 h-6 text-yellow-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return '완료됨';
      case 'failed':
        return '실패';
      case 'processing':
        return '처리 중';
      default:
        return '대기 중';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
      case 'failed':
        return 'from-red-500/20 to-pink-500/20 border-red-500/30';
      case 'processing':
        return 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30';
      default:
        return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
    }
  };

  const network = Object.values(BICONOMY_CONFIG.networks).find(n => n.chainId === chainId);
  const explorerUrl = network ? `${network.blockExplorer}/tx/${txHash}` : '';

  return (
    <div className={`bg-gradient-to-r ${getStatusColor()} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h4 className="text-white">트랜잭션 상태</h4>
            <p className="text-slate-400 text-sm">{getStatusText()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="text-purple-400 text-sm">Smart</span>
        </div>
      </div>

      {/* TX Hash */}
      <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-400 text-xs">Transaction Hash</span>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-cyan-400 text-xs hover:text-cyan-300 transition-colors"
            >
              <span>블록 탐색기</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <p className="text-slate-300 text-xs break-all font-mono">{txHash}</p>
      </div>

      {/* 상세 정보 */}
      {details && details.steps && details.steps.length > 0 && (
        <div className="space-y-2">
          <p className="text-slate-400 text-xs">처리 단계:</p>
          {details.steps.map((step: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              {step.status === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : step.status === 'processing' ? (
                <Loader className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : (
                <Clock className="w-4 h-4 text-slate-500" />
              )}
              <span className="text-slate-300">{step.step}</span>
            </div>
          ))}
        </div>
      )}

      {/* 예상 완료 시간 */}
      {details?.estimatedCompletion && status !== 'completed' && status !== 'failed' && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <p className="text-slate-400 text-xs">
            예상 완료: <span className="text-cyan-400">{details.estimatedCompletion}</span>
          </p>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}
    </div>
  );
}
