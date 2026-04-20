-- SolTax AU - Paywall + enrichment migration
-- Run this on top of schema.sql.

-- 1. Enrichment columns written by the Helius importer but missing from the
--    original schema. Additive + nullable so old rows keep working.
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS market_value_aud NUMERIC(18, 2),
    ADD COLUMN IF NOT EXISTS acquisition_cost_aud NUMERIC(18, 2),
    ADD COLUMN IF NOT EXISTS protocol VARCHAR(50),
    ADD COLUMN IF NOT EXISTS source VARCHAR(50);

-- 2. Subscriptions. One row per user. Free users have no row.
--    Pro is unlocked by paying SOL to the treasury; we record the tx signature
--    so payments are auditable and idempotent.
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    tier VARCHAR(20) NOT NULL DEFAULT 'pro',
    payment_tx_signature VARCHAR(100) NOT NULL UNIQUE,
    paid_amount_sol NUMERIC(18, 9) NOT NULL,
    treasury_wallet VARCHAR(44) NOT NULL,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL = lifetime
    CHECK (tier IN ('pro'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Inserts go through the service role (the verify endpoint). No user-level
-- INSERT/UPDATE policies by design — we don't want clients backdating rows.
CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions FOR ALL
    TO service_role
    USING (true);
