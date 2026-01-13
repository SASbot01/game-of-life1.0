
-- Create finance_categories table for income/expense categories
CREATE TABLE public.finance_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT DEFAULT 'tag',
  color TEXT DEFAULT 'muted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pockets table for wallet money distribution
CREATE TABLE public.pockets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  linked_asset_id UUID NOT NULL REFERENCES public.finance_assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  target_amount NUMERIC DEFAULT NULL,
  color TEXT DEFAULT 'primary',
  icon TEXT DEFAULT 'wallet',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pockets ENABLE ROW LEVEL SECURITY;

-- RLS policies for finance_categories
CREATE POLICY "Users can view own categories" ON public.finance_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.finance_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.finance_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.finance_categories FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for pockets
CREATE POLICY "Users can view own pockets" ON public.pockets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pockets" ON public.pockets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pockets" ON public.pockets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pockets" ON public.pockets FOR DELETE USING (auth.uid() = user_id);

-- Insert default categories for new users (will be seeded per user when needed)
-- Triggers for updated_at
CREATE TRIGGER update_finance_categories_updated_at
BEFORE UPDATE ON public.finance_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pockets_updated_at
BEFORE UPDATE ON public.pockets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
