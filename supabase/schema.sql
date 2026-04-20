-- SolTax AU - Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up all tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, address)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  signature TEXT NOT NULL,
  block_time TIMESTAMPTZ NOT NULL,
  tx_type TEXT NOT NULL,
  token_in_mint TEXT,
  token_in_amount TEXT,
  token_out_mint TEXT,
  token_out_amount TEXT,
  fee_sol TEXT,
  raw_data JSONB,
  ato_classification JSONB,
  ai_confidence NUMERIC,
  ai_explanation TEXT,
  is_spam BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wallet_id, signature)
);

-- Cost basis lots for FIFO tracking
CREATE TABLE IF NOT EXISTS cost_basis_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  mint TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL,
  amount TEXT NOT NULL,
  cost_basis_aud TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'FIFO',
  disposed_at TIMESTAMPTZ,
  proceeds_aud TEXT
);

-- Tax summary per financial year
CREATE TABLE IF NOT EXISTS tax_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  financial_year INTEGER NOT NULL,
  total_income_aud TEXT NOT NULL,
  total_cgt_gains TEXT NOT NULL,
  total_cgt_losses TEXT NOT NULL,
  net_capital_gain TEXT NOT NULL,
  cgt_discount_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wallet_id, financial_year)
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_resident_country TEXT NOT NULL DEFAULT 'Australia',
  marginal_tax_rate TEXT NOT NULL DEFAULT '0.32',
  apply_medicare_levy BOOLEAN DEFAULT TRUE,
  cgt_discount_eligible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Price cache for token prices
CREATE TABLE IF NOT EXISTS price_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mint TEXT NOT NULL,
  price_aud TEXT NOT NULL,
  sourced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sourced_date DATE NOT NULL DEFAULT (NOW()::date),
  source TEXT NOT NULL DEFAULT 'coingecko',
  UNIQUE(mint, sourced_date)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_signature ON transactions(signature);
CREATE INDEX IF NOT EXISTS idx_transactions_block_time ON transactions(block_time);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_cost_basis_lots_wallet ON cost_basis_lots(wallet_id);
CREATE INDEX IF NOT EXISTS idx_cost_basis_lots_mint ON cost_basis_lots(mint);
CREATE INDEX IF NOT EXISTS idx_tax_summary_wallet ON tax_summary(wallet_id);
CREATE INDEX IF NOT EXISTS idx_price_cache_mint ON price_cache(mint);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get financial year for a transaction date
CREATE OR REPLACE FUNCTION get_financial_year(tx_date TIMESTAMPTZ)
RETURNS INTEGER AS $$
BEGIN
  -- Australian financial year: July 1 to June 30
  IF EXTRACT(MONTH FROM tx_date) >= 7 THEN
    RETURN EXTRACT(YEAR FROM tx_date)::INTEGER;
  ELSE
    RETURN (EXTRACT(YEAR FROM tx_date) - 1)::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if CGT discount applies (held > 12 months)
CREATE OR REPLACE FUNCTION is_cgt_discount_eligible(acquired_at TIMESTAMPTZ, disposed_at TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (disposed_at - acquired_at) > INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_basis_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;

-- Wallets policies
CREATE POLICY "Users can view own wallets"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets"
  ON wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets"
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets"
  ON wallets FOR DELETE
  USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (wallet_id IN (
    SELECT id FROM wallets WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert transactions to own wallets"
  ON transactions FOR INSERT
  WITH CHECK (wallet_id IN (
    SELECT id FROM wallets WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (wallet_id IN (
    SELECT id FROM wallets WHERE user_id = auth.uid()
  ));

-- Cost basis lots policies
CREATE POLICY "Users can view own cost basis lots"
  ON cost_basis_lots FOR SELECT
  USING (wallet_id IN (
    SELECT id FROM wallets WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own cost basis lots"
  ON cost_basis_lots FOR INSERT
  WITH CHECK (wallet_id IN (
    SELECT id FROM wallets WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own cost basis lots"
  ON cost_basis_lots FOR UPDATE
  USING (wallet_id IN (
    SELECT id FROM wallets WHERE user_id = auth.uid()
  ));

-- Tax summary policies
CREATE POLICY "Users can view own tax summaries"
  ON tax_summary FOR SELECT
  USING (wallet_id IN (
    SELECT id FROM wallets WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own tax summaries"
  ON tax_summary FOR INSERT
  WITH CHECK (wallet_id IN (
    SELECT id FROM wallets WHERE user_id = auth.uid()
  ));

-- User settings policies
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Price cache policies (public read, service role write)
CREATE POLICY "Anyone can read price cache"
  ON price_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage price cache"
  ON price_cache FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
