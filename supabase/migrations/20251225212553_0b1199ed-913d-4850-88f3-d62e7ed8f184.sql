-- Add cashflow fields to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS linked_asset_id uuid REFERENCES public.finance_assets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_frequency text CHECK (recurrence_frequency IN ('weekly', 'monthly', 'yearly'));

-- Create calendar_events table for unified timeline
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  origin_type text NOT NULL CHECK (origin_type IN ('task', 'transaction', 'habit', 'manual')),
  origin_id uuid,
  module text CHECK (module IN ('bio', 'ops', 'vault', 'general')),
  is_all_day boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for calendar_events
CREATE POLICY "Users can view own calendar events" 
ON public.calendar_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar events" 
ON public.calendar_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events" 
ON public.calendar_events 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events" 
ON public.calendar_events 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON public.calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_origin ON public.calendar_events(origin_type, origin_id);
CREATE INDEX IF NOT EXISTS idx_transactions_linked_asset ON public.transactions(linked_asset_id);