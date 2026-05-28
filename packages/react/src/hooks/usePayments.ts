/**
 * usePayments - React hook for payment operations
 * Provides payment state and methods using AgentStack SDK
 */

import { useState, useCallback } from 'react';
import { useSDK } from '../context/SDKContext';
import { PaymentData, Payment, PaymentMethod } from '@agentstack/sdk';

export interface PaymentsState {
  isLoading: boolean;
  error: string | null;
}

export interface PaymentsActions {
  createPayment: (paymentData: PaymentData) => Promise<Payment>;
  getPaymentStatus: (paymentId: string) => Promise<{ payment: Payment; transactions: any[] }>;
  getPayments: (params?: any) => Promise<{ payments: Payment[]; total: number; has_more: boolean }>;
  getPaymentMethods: () => Promise<{ methods: PaymentMethod[] }>;
  cancelPayment: (paymentId: string, reason?: string) => Promise<{ message: string }>;
  refundPayment: (paymentId: string, data: any) => Promise<{ message: string }>;
  getPaymentStats: (params?: any) => Promise<any>;
}

export function usePayments(): PaymentsState & PaymentsActions {
  const { sdk } = useSDK();
  const [state, setState] = useState<PaymentsState>({
    isLoading: false,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const createPayment = useCallback(async (paymentData: PaymentData) => {
    try {
      setLoading(true);
      setError(null);
      const payment = await sdk.payments.createPayment(paymentData);
      setLoading(false);
      return payment;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to create payment');
      throw error;
    }
  }, [sdk.payments, setLoading, setError]);

  const getPaymentStatus = useCallback(async (paymentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.payments.getPaymentStatus(paymentId);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get payment status');
      throw error;
    }
  }, [sdk.payments, setLoading, setError]);

  const getPayments = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.payments.getPayments(params);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get payments');
      throw error;
    }
  }, [sdk.payments, setLoading, setError]);

  const getPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.payments.getPaymentMethods();
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get payment methods');
      throw error;
    }
  }, [sdk.payments, setLoading, setError]);

  const cancelPayment = useCallback(async (paymentId: string, reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.payments.cancelPayment(paymentId, reason);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to cancel payment');
      throw error;
    }
  }, [sdk.payments, setLoading, setError]);

  const refundPayment = useCallback(async (paymentId: string, data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.payments.refundPayment(paymentId, data);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to refund payment');
      throw error;
    }
  }, [sdk.payments, setLoading, setError]);

  const getPaymentStats = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.payments.getPaymentStats(params);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get payment stats');
      throw error;
    }
  }, [sdk.payments, setLoading, setError]);

  return {
    ...state,
    createPayment,
    getPaymentStatus,
    getPayments,
    getPaymentMethods,
    cancelPayment,
    refundPayment,
    getPaymentStats,
  };
}
