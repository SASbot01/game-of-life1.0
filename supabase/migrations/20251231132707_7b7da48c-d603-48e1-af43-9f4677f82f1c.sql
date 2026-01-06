-- Add area_id to habits table for linking habits to areas
ALTER TABLE public.habits 
ADD COLUMN area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL;

-- Add area_id to transactions table for linking transactions to areas
ALTER TABLE public.transactions 
ADD COLUMN area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX idx_habits_area_id ON public.habits(area_id);
CREATE INDEX idx_transactions_area_id ON public.transactions(area_id);

-- Update RLS policies to ensure users can only access their own data (already exists, but verify)
-- The existing policies already use user_id checks, so habits and transactions with area_id 
-- will still be properly secured