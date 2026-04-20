// SolTax AU - Database Types
// Generated types matching Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Database schema types matching the SQL tables
export interface wallets {
  id: string;
  user_id: string;
  address: string;
  label: string | null;
  created_at: string;
}

export interface transactions {
  id: string;
  wallet_id: string;
  signature: string;
  block_time: string;
  tx_type: string;
  token_in_mint: string | null;
  token_in_amount: string | null;
  token_out_mint: string | null;
  token_out_amount: string | null;
  fee_sol: string | null;
  raw_data: Json;
  ato_classification: Json | null;
  ai_confidence: number | null;
  ai_explanation: string | null;
  is_spam: boolean;
  market_value_aud: number | null;
  acquisition_cost_aud: number | null;
  protocol: string | null;
  source: string | null;
  created_at: string;
}

export interface subscriptions {
  id: string;
  user_id: string;
  tier: 'pro';
  payment_tx_signature: string;
  paid_amount_sol: string;
  treasury_wallet: string;
  activated_at: string;
  expires_at: string | null;
}

export interface cost_basis_lots {
  id: string;
  wallet_id: string;
  mint: string;
  acquired_at: string;
  amount: string;
  cost_basis_aud: string;
  method: 'FIFO' | 'LIFO' | 'SPECIFIC';
  disposed_at: string | null;
  proceeds_aud: string | null;
}

export interface tax_summary {
  id: string;
  wallet_id: string;
  financial_year: number;
  total_income_aud: string;
  total_cgt_gains: string;
  total_cgt_losses: string;
  net_capital_gain: string;
  cgt_discount_applied: boolean;
  created_at: string;
}

export interface user_settings {
  id: string;
  user_id: string;
  tax_resident_country: string;
  marginal_tax_rate: string;
  apply_medicare_levy: boolean;
  cgt_discount_eligible: boolean;
  created_at: string;
  updated_at: string;
}

export interface price_cache {
  id: string;
  mint: string;
  price_aud: string;
  sourced_at: string;
  sourced_date: string;
  source: string;
}

// Database type with relationships
export interface Database {
  public: {
    Tables: {
      wallets: {
        Row: wallets;
        Insert: Omit<wallets, 'id' | 'created_at'>;
        Update: Partial<Omit<wallets, 'id' | 'created_at'>>;
      };
      transactions: {
        Row: transactions;
        Insert: Omit<transactions, 'id' | 'created_at'>;
        Update: Partial<Omit<transactions, 'id' | 'created_at'>>;
      };
      cost_basis_lots: {
        Row: cost_basis_lots;
        Insert: Omit<cost_basis_lots, 'id'>;
        Update: Partial<Omit<cost_basis_lots, 'id'>>;
      };
      tax_summary: {
        Row: tax_summary;
        Insert: Omit<tax_summary, 'id' | 'created_at'>;
        Update: Partial<Omit<tax_summary, 'id' | 'created_at'>>;
      };
      user_settings: {
        Row: user_settings;
        Insert: Omit<user_settings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<user_settings, 'id' | 'created_at' | 'updated_at'>>;
      };
      price_cache: {
        Row: price_cache;
        Insert: Omit<price_cache, 'id'>;
        Update: Partial<Omit<price_cache, 'id'>>;
      };
      subscriptions: {
        Row: subscriptions;
        Insert: Omit<subscriptions, 'id' | 'activated_at'>;
        Update: Partial<Omit<subscriptions, 'id' | 'activated_at'>>;
      };
    };
    Views: {};
    Functions: {
      get_financial_year: {
        Args: { tx_date: string };
        Returns: number;
      };
      is_cgt_discount_eligible: {
        Args: { acquired_at: string; disposed_at: string };
        Returns: boolean;
      };
    };
  };
}
