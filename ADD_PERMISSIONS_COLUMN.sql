-- Add permissions column to workers table if it doesn't exist
ALTER TABLE workers ADD COLUMN IF NOT EXISTS permissions TEXT DEFAULT '[]';

-- This column stores a JSON array of interface IDs the worker can access
-- Example: ["dashboard", "showroom", "purchase", "pos", "team", "config"]
