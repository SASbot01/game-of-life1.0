-- Add time fields to tasks and habits for Chronos scheduling
-- Migration: 20260108230000_add_time_fields.sql

-- Add due_time field to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS due_time TIME;

-- Add scheduled_time field to habits table
ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS scheduled_time TIME;

-- Add index for efficient querying of tasks by date and time
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_time 
ON tasks(user_id, due_date, due_time) 
WHERE due_date IS NOT NULL;

-- Add index for efficient querying of habits by scheduled time
CREATE INDEX IF NOT EXISTS idx_habits_scheduled_time 
ON habits(user_id, scheduled_time, is_active) 
WHERE scheduled_time IS NOT NULL AND is_active = true;

-- Add comment to explain the fields
COMMENT ON COLUMN tasks.due_time IS 'Specific time of day when the task is due (optional)';
COMMENT ON COLUMN habits.scheduled_time IS 'Preferred time of day to perform the habit (optional)';
