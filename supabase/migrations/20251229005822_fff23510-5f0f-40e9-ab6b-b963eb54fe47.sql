-- Create areas table for the top-level hierarchy
CREATE TABLE IF NOT EXISTS public.areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT 'ops',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on areas
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- RLS policies for areas (use IF NOT EXISTS pattern via DO block)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'areas' AND policyname = 'Users can view own areas') THEN
    CREATE POLICY "Users can view own areas" ON public.areas FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'areas' AND policyname = 'Users can insert own areas') THEN
    CREATE POLICY "Users can insert own areas" ON public.areas FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'areas' AND policyname = 'Users can update own areas') THEN
    CREATE POLICY "Users can update own areas" ON public.areas FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'areas' AND policyname = 'Users can delete own areas') THEN
    CREATE POLICY "Users can delete own areas" ON public.areas FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add area_id to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL;

-- Add time_estimate and assignee to tasks table  
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time_estimate TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee TEXT;

-- Create trigger for areas updated_at (if not exists)
DROP TRIGGER IF EXISTS update_areas_updated_at ON public.areas;
CREATE TRIGGER update_areas_updated_at
  BEFORE UPDATE ON public.areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_area_id ON public.projects(area_id);