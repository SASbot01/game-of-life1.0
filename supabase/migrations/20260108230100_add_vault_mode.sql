-- Add vault_mode field to finance tables for Personal/Business separation
-- Migration: 20260108230100_add_vault_mode.sql

-- Create enum type for vault mode
DO $$ BEGIN
  CREATE TYPE vault_mode_type AS ENUM ('personal', 'business');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add vault_mode to finance_assets
ALTER TABLE finance_assets 
ADD COLUMN IF NOT EXISTS vault_mode vault_mode_type DEFAULT 'personal' NOT NULL;

-- Add vault_mode to transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS vault_mode vault_mode_type DEFAULT 'personal' NOT NULL;

-- Add vault_mode to pockets
ALTER TABLE pockets 
ADD COLUMN IF NOT EXISTS vault_mode vault_mode_type DEFAULT 'personal' NOT NULL;

-- Update existing records to 'personal' (already done by DEFAULT, but explicit for clarity)
UPDATE finance_assets SET vault_mode = 'personal' WHERE vault_mode IS NULL;
UPDATE transactions SET vault_mode = 'personal' WHERE vault_mode IS NULL;
UPDATE pockets SET vault_mode = 'personal' WHERE vault_mode IS NULL;

-- Add composite indexes for efficient filtering by user and vault mode
CREATE INDEX IF NOT EXISTS idx_finance_assets_user_vault_mode 
ON finance_assets(user_id, vault_mode);

CREATE INDEX IF NOT EXISTS idx_transactions_user_vault_mode 
ON transactions(user_id, vault_mode);

CREATE INDEX IF NOT EXISTS idx_pockets_user_vault_mode 
ON pockets(user_id, vault_mode);

-- Add comments to explain the field
COMMENT ON COLUMN finance_assets.vault_mode IS 'Vault mode: personal for personal finances, business for business finances';
COMMENT ON COLUMN transactions.vault_mode IS 'Vault mode: personal for personal transactions, business for business transactions';
COMMENT ON COLUMN pockets.vault_mode IS 'Vault mode: personal for personal pockets, business for business pockets';
