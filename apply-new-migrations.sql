-- Script to apply new migrations directly to Supabase
-- Run this in Supabase SQL Editor

-- Migration 1: Add time fields
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS due_time TIME;

ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS scheduled_time TIME;

CREATE INDEX IF NOT EXISTS idx_tasks_due_date_time 
ON tasks(user_id, due_date, due_time) 
WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_habits_scheduled_time 
ON habits(user_id, scheduled_time, is_active) 
WHERE scheduled_time IS NOT NULL AND is_active = true;

COMMENT ON COLUMN tasks.due_time IS 'Specific time of day when the task is due (optional)';
COMMENT ON COLUMN habits.scheduled_time IS 'Preferred time of day to perform the habit (optional)';

-- Migration 2: Add vault_mode fields
DO $$ BEGIN
  CREATE TYPE vault_mode_type AS ENUM ('personal', 'business');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE finance_assets 
ADD COLUMN IF NOT EXISTS vault_mode vault_mode_type DEFAULT 'personal' NOT NULL;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS vault_mode vault_mode_type DEFAULT 'personal' NOT NULL;

ALTER TABLE pockets 
ADD COLUMN IF NOT EXISTS vault_mode vault_mode_type DEFAULT 'personal' NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_assets_user_vault_mode 
ON finance_assets(user_id, vault_mode);

CREATE INDEX IF NOT EXISTS idx_transactions_user_vault_mode 
ON transactions(user_id, vault_mode);

CREATE INDEX IF NOT EXISTS idx_pockets_user_vault_mode 
ON pockets(user_id, vault_mode);

COMMENT ON COLUMN finance_assets.vault_mode IS 'Vault mode: personal for personal finances, business for business finances';
COMMENT ON COLUMN transactions.vault_mode IS 'Vault mode: personal for personal transactions, business for business transactions';
COMMENT ON COLUMN pockets.vault_mode IS 'Vault mode: personal for personal pockets, business for business pockets';
