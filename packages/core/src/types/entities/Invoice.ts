/**
 * Invoice Entity Types
 * Types for invoice system in AgentStack
 */

import type { BaseEntity } from '../base/BaseEntity';

export type InvoiceType = 'payment' | 'transfer' | 'exchange';

export type InvoiceStatus = 
  | 'pending' 
  | 'processing' 
  | 'paid' 
  | 'rejected' 
  | 'expired' 
  | 'cancelled';

export interface ExchangeRate {
  from_resource: string;
  to_currency: string;
  rate: string;  // Decimal string
  is_fixed: boolean;
  source: 'config' | 'market';
}

export interface InvoiceItem {
  resource_type: string;
  quantity: string;  // Decimal string
  unit_price?: string;  // Decimal string
  description?: string;
}

export interface Invoice {
  id: string;
  type: InvoiceType;
  status: InvoiceStatus;
  to_user_id: number;
  to_wallet_id: string;
  amount: string;  // Decimal string
  currency: string;
  description: string;
  expires_at: string;  // ISO 8601
  created_at: string;
  updated_at: string;
  
  // Optional fields
  from_user_id?: number;
  from_wallet_id?: string;
  items?: InvoiceItem[];
  exchange_rate?: ExchangeRate;
  paid_at?: string;
  rejected_at?: string;
  transaction_id?: string;
  metadata?: Record<string, any>;
}

// Request/Response types

export interface CreateInvoiceRequest {
  type: InvoiceType;
  to_user_id: number;
  to_wallet_id: string;
  amount: string;
  currency: string;
  description: string;
  expires_days?: number;
  from_wallet_id?: string;
  items?: InvoiceItem[];
  exchange_rate?: ExchangeRate;
  metadata?: Record<string, any>;
}

export interface PayInvoiceRequest {
  wallet_id?: string;
}

export interface ExchangeInvoiceRequest {
  items: InvoiceItem[];
  to_currency: string;
  to_wallet_id: string;
  from_wallet_id?: string;
  exchange_rate?: ExchangeRate;
  description?: string;
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  type?: InvoiceType;
  user_id?: number;
}

export interface InvoiceListResponse {
  success: boolean;
  invoices: Invoice[];
  total: number;
}

export interface InvoiceResponse {
  success: boolean;
  invoice?: Invoice;
  transaction?: any;
  message?: string;
  error?: string;
}


