-- Add project_id to transactions table
-- This allows linking transactions to specific projects

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON public.transactions(project_id);
