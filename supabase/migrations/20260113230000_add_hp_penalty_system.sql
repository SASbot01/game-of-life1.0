-- Add hp_penalty column to habits table
ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS hp_penalty INTEGER DEFAULT 10 
CHECK (hp_penalty >= 1 AND hp_penalty <= 50);

COMMENT ON COLUMN habits.hp_penalty IS 'HP points deducted when habit is not completed (1-50)';

-- Add punishment_task column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS punishment_task TEXT DEFAULT '100 push-ups';

COMMENT ON COLUMN profiles.punishment_task IS 'Custom punishment task when HP reaches 0';

-- Update existing habits with default hp_penalty value
UPDATE habits 
SET hp_penalty = 10 
WHERE hp_penalty IS NULL;
