// Biconomy Supertransaction Hook
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  composeTransaction,
  signPayload,
  executeTransaction,
  getTransactionStatus,
  executeSupertransaction,
  handleSupertransactionError,
  ComposeRequest,
  ComposeResponse,
  ExecuteResponse,
  StatusResponse,
} from '../utils/biconomy/supertransaction';

export function useSupertransaction() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'idle' | 'composing' | 'signing' | 'executing' | 'completed'>('idle');
  const [quote, setQuote] = useState<ComposeResponse['quote'] | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  /**
   * 단순 전송 (Transfer)
   */
  const transfer = useCallback(
    async (params: {
      chainId: number;
      from: string;
      to: string;
      token: string;
      amount: string;
      signer: ethers.Signer;
      gasToken?: string;
      sponsor?: boolean;
    }) => {
      setIsLoading(true);
      setError(null);
      setCurrentStep('composing');

      try {
        const request: ComposeRequest = {
          chainId: params.chainId,
          from: params.from,
          steps: [
            {
              type: 'transfer',
              token: params.token,
              to: params.to,
              amount: params.amount,
            },
          ],
          gasPayment: {
            token: params.gasToken,
            sponsor: params.sponsor || false,
          },
        };

        const result = await executeSupertransaction(request, params.signer);
        setTxHash(result.txHash);
        setCurrentStep('completed');
        return result;
      } catch (err: any) {
        const errorMessage = handleSupertransactionError(err);
        setError(errorMessage);
        setCurrentStep('idle');
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 스왑 (Swap)
   */
  const swap = useCallback(
    async (params: {
      chainId: number;
      from: string;
      tokenIn: string;
      tokenOut: string;
      amountIn: string;
      signer: ethers.Signer;
      gasToken?: string;
      sponsor?: boolean;
    }) => {
      setIsLoading(true);
      setError(null);
      setCurrentStep('composing');

      try {
        const request: ComposeRequest = {
          chainId: params.chainId,
          from: params.from,
          steps: [
            {
              type: 'swap',
              tokenIn: params.tokenIn,
              tokenOut: params.tokenOut,
              amountIn: params.amountIn,
            },
          ],
          gasPayment: {
            token: params.gasToken,
            sponsor: params.sponsor || false,
          },
        };

        const result = await executeSupertransaction(request, params.signer);
        setTxHash(result.txHash);
        setCurrentStep('completed');
        return result;
      } catch (err: any) {
        const errorMessage = handleSupertransactionError(err);
        setError(errorMessage);
        setCurrentStep('idle');
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 스왑 후 전송 (Swap + Transfer)
   */
  const swapAndTransfer = useCallback(
    async (params: {
      chainId: number;
      from: string;
      to: string;
      tokenIn: string;
      tokenOut: string;
      amountIn: string;
      signer: ethers.Signer;
      gasToken?: string;
      sponsor?: boolean;
    }) => {
      setIsLoading(true);
      setError(null);
      setCurrentStep('composing');

      try {
        const request: ComposeRequest = {
          chainId: params.chainId,
          from: params.from,
          steps: [
            {
              type: 'swap',
              tokenIn: params.tokenIn,
              tokenOut: params.tokenOut,
              amountIn: params.amountIn,
            },
            {
              type: 'transfer',
              token: params.tokenOut,
              to: params.to,
              amount: 'MAX', // 스왑 결과 전부 전송
            },
          ],
          gasPayment: {
            token: params.gasToken,
            sponsor: params.sponsor || false,
          },
        };

        const result = await executeSupertransaction(request, params.signer);
        setTxHash(result.txHash);
        setCurrentStep('completed');
        return result;
      } catch (err: any) {
        const errorMessage = handleSupertransactionError(err);
        setError(errorMessage);
        setCurrentStep('idle');
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 크로스체인 전송 (Bridge + Transfer)
   */
  const bridgeAndTransfer = useCallback(
    async (params: {
      from: string;
      to: string;
      fromChainId: number;
      toChainId: number;
      token: string;
      amount: string;
      signer: ethers.Signer;
      gasToken?: string;
      sponsor?: boolean;
    }) => {
      setIsLoading(true);
      setError(null);
      setCurrentStep('composing');

      try {
        const request: ComposeRequest = {
          chainId: params.fromChainId,
          from: params.from,
          steps: [
            {
              type: 'bridge',
              fromChainId: params.fromChainId,
              toChainId: params.toChainId,
              token: params.token,
              amount: params.amount,
            },
            {
              type: 'transfer',
              token: params.token,
              to: params.to,
              amount: params.amount,
            },
          ],
          gasPayment: {
            token: params.gasToken,
            sponsor: params.sponsor || false,
          },
        };

        const result = await executeSupertransaction(request, params.signer);
        setTxHash(result.txHash);
        setCurrentStep('completed');
        return result;
      } catch (err: any) {
        const errorMessage = handleSupertransactionError(err);
        setError(errorMessage);
        setCurrentStep('idle');
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 배치 전송 (Batch Transfer)
   */
  const batchTransfer = useCallback(
    async (params: {
      chainId: number;
      from: string;
      recipients: Array<{ address: string; amount: string }>;
      token: string;
      signer: ethers.Signer;
      gasToken?: string;
      sponsor?: boolean;
    }) => {
      setIsLoading(true);
      setError(null);
      setCurrentStep('composing');

      try {
        const steps = params.recipients.map((recipient) => ({
          type: 'transfer' as const,
          token: params.token,
          to: recipient.address,
          amount: recipient.amount,
        }));

        const request: ComposeRequest = {
          chainId: params.chainId,
          from: params.from,
          steps,
          gasPayment: {
            token: params.gasToken,
            sponsor: params.sponsor || false,
          },
        };

        const result = await executeSupertransaction(request, params.signer);
        setTxHash(result.txHash);
        setCurrentStep('completed');
        return result;
      } catch (err: any) {
        const errorMessage = handleSupertransactionError(err);
        setError(errorMessage);
        setCurrentStep('idle');
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 견적 조회 (Quote Only)
   */
  const getQuote = useCallback(
    async (request: ComposeRequest): Promise<ComposeResponse['quote']> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await composeTransaction(request);
        setQuote(result.quote);
        return result.quote;
      } catch (err: any) {
        const errorMessage = handleSupertransactionError(err);
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 트랜잭션 상태 조회
   */
  const checkStatus = useCallback(
    async (txHash: string): Promise<StatusResponse> => {
      try {
        return await getTransactionStatus(txHash);
      } catch (err: any) {
        const errorMessage = handleSupertransactionError(err);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setCurrentStep('idle');
    setQuote(null);
    setTxHash(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    currentStep,
    quote,
    txHash,

    // Actions
    transfer,
    swap,
    swapAndTransfer,
    bridgeAndTransfer,
    batchTransfer,
    getQuote,
    checkStatus,
    reset,
  };
}
