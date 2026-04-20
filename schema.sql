-- SolTax AU - Supabase Database Schema
-- Australian Solana Tax Engine

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLES
-- ============================================

-- User wallets table
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    address VARCHAR(44) NOT NULL,
    label VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, address)
);

-- Transactions table - stores all Solana transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    signature VARCHAR(88) NOT NULL,
    block_time TIMESTAMPTZ NOT NULL,
    tx_type VARCHAR(50) NOT NULL,
    token_in_mint VARCHAR(44),
    token_in_amount NUMERIC(78, 0),
    token_out_mint VARCHAR(44),
    token_out_amount NUMERIC(78, 0),
    fee_sol NUMERIC(78, 0),
    raw_data JSONB NOT NULL,
    ato_classification JSONB,
    ai_confidence FLOAT,
    ai_explanation TEXT,
    is_spam BOOLEAN DEFAULT FALSE,
    -- AUD values + protocol tagging populated by the Helius importer.
    market_value_aud NUMERIC(18, 2),
    acquisition_cost_aud NUMERIC(18, 2),
    protocol VARCHAR(50),
    source VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wallet_id, signature)
);

-- One row per user once they've paid for Pro. Absence = free tier.
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    tier VARCHAR(20) NOT NULL DEFAULT 'pro',
    payment_tx_signature VARCHAR(100) NOT NULL UNIQUE,
    paid_amount_sol NUMERIC(18, 9) NOT NULL,
    treasury_wallet VARCHAR(44) NOT NULL,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    CHECK (tier IN ('pro'))
);

-- Cost basis lots for CGT calculations
CREATE TABLE cost_basis_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    mint VARCHAR(44) NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    cost_basis_aud NUMERIC(18, 2) NOT NULL,
    method VARCHAR(20) DEFAULT 'FIFO',
    disposed_at TIMESTAMPTZ,
    proceeds_aud NUMERIC(18, 2),
    CHECK (method IN ('FIFO', 'LIFO', 'SPECIFIC'))
);

-- Tax summary per financial year
CREATE TABLE tax_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    financial_year INTEGER NOT NULL,
    total_income_aud NUMERIC(18, 2) DEFAULT 0,
    total_cgt_gains NUMERIC(18, 2) DEFAULT 0,
    total_cgt_losses NUMERIC(18, 2) DEFAULT 0,
    net_capital_gain NUMERIC(18, 2) DEFAULT 0,
    cgt_discount_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wallet_id, financial_year)
);

-- User preferences and settings
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    tax_resident_country VARCHAR(2) DEFAULT 'AU',
    marginal_tax_rate DECIMAL(5, 2) DEFAULT 32.50,
    apply_medicare_levy BOOLEAN DEFAULT TRUE,
    cgt_discount_eligible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price cache for tokens
CREATE TABLE price_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mint VARCHAR(44) NOT NULL,
    price_aud NUMERIC(18, 8) NOT NULL,
    sourced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sourced_date DATE NOT NULL DEFAULT (NOW()::date),
    source VARCHAR(20) DEFAULT 'coingecko',
    UNIQUE(mint, sourced_date)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_block_time ON transactions(block_time);
CREATE INDEX idx_transactions_tx_type ON transactions(tx_type);
CREATE INDEX idx_cost_basis_lots_wallet_id ON cost_basis_lots(wallet_id);
CREATE INDEX idx_cost_basis_lots_mint ON cost_basis_lots(mint);
CREATE INDEX idx_tax_summary_wallet_year ON tax_summary(wallet_id, financial_year);
CREATE INDEX idx_price_cache_mint_date ON price_cache(mint, sourced_at);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_basis_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Wallets policies
CREATE POLICY "Users can view their own wallets"
    ON wallets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets"
    ON wallets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets"
    ON wallets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallets"
    ON wallets FOR DELETE
    USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM wallets
            WHERE wallets.id = transactions.wallet_id
            AND wallets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own transactions"
    ON transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM wallets
            WHERE wallets.id = transactions.wallet_id
            AND wallets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own transactions"
    ON transactions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM wallets
            WHERE wallets.id = transactions.wallet_id
            AND wallets.user_id = auth.uid()
        )
    );

-- Cost basis lots policies
CREATE POLICY "Users can view their own cost basis lots"
    ON cost_basis_lots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM wallets
            WHERE wallets.id = cost_basis_lots.wallet_id
            AND wallets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own cost basis lots"
    ON cost_basis_lots FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM wallets
            WHERE wallets.id = cost_basis_lots.wallet_id
            AND wallets.user_id = auth.uid()
        )
    );

-- Tax summary policies
CREATE POLICY "Users can view their own tax summaries"
    ON tax_summary FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM wallets
            WHERE wallets.id = tax_summary.wallet_id
            AND wallets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own tax summaries"
    ON tax_summary FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM wallets
            WHERE wallets.id = tax_summary.wallet_id
            AND wallets.user_id = auth.uid()
        )
    );

-- User settings policies
CREATE POLICY "Users can view their own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- Price cache is public read (shared cache)
CREATE POLICY "Anyone can read price cache"
    ON price_cache FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Service role can manage price cache"
    ON price_cache FOR ALL
    TO service_role
    USING (true);

-- Subscription policies: users can read their own row; inserts/updates go
-- through the service role (the verify endpoint) so payments can't be spoofed.
CREATE POLICY "Users can view their own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions FOR ALL
    TO service_role
    USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get financial year from date
CREATE OR REPLACE FUNCTION get_financial_year(tx_date TIMESTAMPTZ)
RETURNS INTEGER AS $$
BEGIN
    -- Australian financial year: July 1 to June 30
    IF EXTRACT(MONTH FROM tx_date) >= 7 THEN
        RETURN EXTRACT(YEAR FROM tx_date);
    ELSE
        RETURN EXTRACT(YEAR FROM tx_date) - 1;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate CGT discount eligibility
CREATE OR REPLACE FUNCTION is_cgt_discount_eligible(acquired_at TIMESTAMPTZ, disposed_at TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
    -- 12+ month holding period for CGT discount
    RETURN disposed_at >= (acquired_at + INTERVAL '12 months');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at on user_settings
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default price cache for common tokens (will be updated by fetcher)
INSERT INTO price_cache (mint, price_aud, sourced_at, source) VALUES
    ('So11111111111111111111111111111111111111112', 200.00, NOW(), 'manual'), -- SOL
    ('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 1.50, NOW(), 'manual'), -- USDC
    ('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 1.50, NOW(), 'manual')  -- USDT
ON CONFLICT DO NOTHING;
