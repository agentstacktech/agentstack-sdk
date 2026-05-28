/**
 * useAnalytics - React hook for analytics operations
 * Provides analytics state and methods using AgentStack SDK
 */

import { useState, useCallback } from 'react';
import { useSDK } from '../context/SDKContext';
import { AnalyticsEvent, DashboardMetrics, UsageStats } from '@agentstack/sdk';

export interface AnalyticsState {
  isLoading: boolean;
  error: string | null;
}

export interface AnalyticsActions {
  trackEvent: (event: AnalyticsEvent) => Promise<Record<string, unknown>>;
  getDashboardMetrics: (params?: any) => Promise<DashboardMetrics>;
  getUsageStats: (params?: any) => Promise<UsageStats>;
  getPaymentStats: (params?: any) => Promise<any>;
  getUserStats: (params?: any) => Promise<any>;
  getProjectStats: (projectId?: number) => Promise<any>;
  getTopEvents: (params?: any) => Promise<any>;
  getConversionFunnel: (params?: any) => Promise<any>;
  createCustomReport: (report: any) => Promise<any>;
  getCustomReports: () => Promise<any>;
  runCustomReport: (reportId: string, parameters?: any) => Promise<any>;
  getReportResult: (reportId: string) => Promise<any>;
  deleteCustomReport: (reportId: string) => Promise<{ message: string }>;
  exportAnalytics: (data: any) => Promise<any>;
  getExportStatus: (exportId: string) => Promise<any>;
  getRealTimeMetrics: () => Promise<any>;
  getAlerts: (params?: any) => Promise<any>;
  createAlert: (alert: any) => Promise<any>;
  createMetric: (projectId: number, metric: any) => Promise<any>;
}

export function useAnalytics(): AnalyticsState & AnalyticsActions {
  const { sdk } = useSDK();
  const [state, setState] = useState<AnalyticsState>({
    isLoading: false,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.trackEvent(event);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to track event');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const getDashboardMetrics = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.getDashboardMetrics(params);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get dashboard metrics');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const getUsageStats = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.getUsageStats(params);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get usage stats');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const getPaymentStats = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.getPaymentStats(params);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get payment stats');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const getUserStats = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.getUserStats(params);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get user stats');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const getProjectStats = useCallback(async (projectId?: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.getProjectStats(projectId);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get project stats');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const getTopEvents = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.getTopEvents(params);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get top events');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const getConversionFunnel = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.getConversionFunnel(params);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get conversion funnel');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const createCustomReport = useCallback(async (report: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.createCustomReport(report);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to create custom report');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const getCustomReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.getCustomReports();
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get custom reports');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const runCustomReport = useCallback(async (reportId: string, parameters?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.runCustomReport(reportId, parameters);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to run custom report');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const getReportResult = useCallback(async (reportId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.getReportResult(reportId);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get report result');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const deleteCustomReport = useCallback(async (reportId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.deleteCustomReport(reportId);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to delete custom report');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const exportAnalytics = useCallback(async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.exportAnalytics(data);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to export analytics');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const getExportStatus = useCallback(async (exportId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.getExportStatus(exportId);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get export status');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const getRealTimeMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.getRealTimeMetrics();
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get real-time metrics');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const getAlerts = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.getAlerts(params);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to get alerts');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const createAlert = useCallback(async (alert: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.createAlert(alert);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to create alert');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  const createMetric = useCallback(async (projectId: number, metric: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await sdk.analytics.createMetric(projectId, metric);
      setLoading(false);
      return result;
    } catch (error: any) {
      setLoading(false);
      setError(error.message || 'Failed to create metric');
      throw error;
    }
  }, [sdk.analytics, setLoading, setError]);

  return {
    ...state,
    trackEvent,
    getDashboardMetrics,
    getUsageStats,
    getPaymentStats,
    getUserStats,
    getProjectStats,
    getTopEvents,
    getConversionFunnel,
    createCustomReport,
    getCustomReports,
    runCustomReport,
    getReportResult,
    deleteCustomReport,
    exportAnalytics,
    getExportStatus,
    getRealTimeMetrics,
    getAlerts,
    createAlert,
    createMetric,
  };
}
