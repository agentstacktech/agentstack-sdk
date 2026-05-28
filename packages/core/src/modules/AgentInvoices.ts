/**
 * AgentInvoices - SDK Module for Invoice Operations
 * Unified SDK interface for invoice management
 */

import { HTTPClient } from '../client/http-client';
import type {
  Invoice,
  InvoiceListResponse,
  InvoiceResponse,
  CreateInvoiceRequest,
  PayInvoiceRequest,
  ExchangeInvoiceRequest,
  InvoiceFilters
} from '../types/entities/Invoice';

export class AgentInvoices {
  constructor(private client: HTTPClient) {}

  /**
   * Create invoice
   */
  async createInvoice(
    data: CreateInvoiceRequest,
    projectId?: number
  ): Promise<InvoiceResponse> {
    const response = await this.client.post('/invoices', data, {
      params: projectId ? { project_id: projectId } : undefined
    });
    return response.data;
  }

  /**
   * Get invoices list
   */
  async getInvoices(
    filters?: InvoiceFilters,
    projectId?: number
  ): Promise<InvoiceListResponse> {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.type) params.type = filters.type;
    if (filters?.user_id) params.user_id = filters.user_id.toString();
    if (projectId) params.project_id = projectId.toString();

    const response = await this.client.get('/invoices', params);
    return response.data;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(
    invoiceId: string,
    projectId?: number
  ): Promise<InvoiceResponse> {
    const response = await this.client.get(`/invoices/${invoiceId}`, {
      params: projectId ? { project_id: projectId } : undefined
    });
    return response.data;
  }

  /**
   * Pay invoice
   */
  async payInvoice(
    invoiceId: string,
    data?: PayInvoiceRequest,
    projectId?: number
  ): Promise<InvoiceResponse> {
    const response = await this.client.post(`/invoices/${invoiceId}/pay`, data || {}, {
      params: projectId ? { project_id: projectId } : undefined
    });
    return response.data;
  }

  /**
   * Reject invoice
   */
  async rejectInvoice(
    invoiceId: string,
    projectId?: number
  ): Promise<InvoiceResponse> {
    const response = await this.client.post(`/invoices/${invoiceId}/reject`, {}, {
      params: projectId ? { project_id: projectId } : undefined
    });
    return response.data;
  }

  /**
   * Delete invoice (only rejected invoices)
   */
  async deleteInvoice(
    invoiceId: string,
    projectId?: number
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await this.client.delete(`/invoices/${invoiceId}`, {
      params: projectId ? { project_id: projectId } : undefined
    });
    return response.data;
  }

  /**
   * Check invoice payment status (for seller)
   */
  async checkInvoicePayment(
    invoiceId: string,
    projectId?: number
  ): Promise<InvoiceResponse & { is_paid?: boolean; payment_status?: string }> {
    const response = await this.client.get(`/invoices/${invoiceId}/check`, {
      params: projectId ? { project_id: projectId } : undefined
    });
    return response.data;
  }

  /**
   * Create exchange invoice
   */
  async createExchangeInvoice(
    data: ExchangeInvoiceRequest,
    projectId?: number
  ): Promise<InvoiceResponse> {
    const response = await this.client.post('/invoices/exchange', data, {
      params: projectId ? { project_id: projectId } : undefined
    });
    return response.data;
  }

  /**
   * Get exchange rates
   */
  async getExchangeRates(
    projectId?: number
  ): Promise<{ success: boolean; exchange_rates?: Record<string, string> }> {
    const response = await this.client.get('/invoices/exchange-rates', {
      params: projectId ? { project_id: projectId } : undefined
    });
    return response.data;
  }

  /**
   * Expire invoices (for scheduler)
   */
  async expireInvoices(
    projectId?: number
  ): Promise<{ success: boolean; expired_count?: number; message?: string }> {
    const response = await this.client.post('/invoices/expire', {}, {
      params: projectId ? { project_id: projectId } : undefined
    });
    return response.data;
  }
}

