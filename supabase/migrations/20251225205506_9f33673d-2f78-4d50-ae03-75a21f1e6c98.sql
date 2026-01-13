-- Create finance_assets table with proper accounting classification
CREATE TABLE public.finance_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'Other',
  class TEXT NOT NULL DEFAULT 'current_asset' CHECK (class IN ('current_asset', 'fixed_asset', 'current_liability', 'long_term_liability')),
  icon TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.finance_assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own finance assets"
ON public.finance_assets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finance assets"
ON public.finance_assets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finance assets"
ON public.finance_assets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finance assets"
ON public.finance_assets
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_finance_assets_updated_at
BEFORE UPDATE ON public.finance_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add streak tracking to habits table
ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS streak_current INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMP WITH TIME ZONE;

-- Add category to transactions table for better filtering
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS notes TEXT;