-- Update existing likes table to add reactions support
-- Run this in Supabase SQL Editor

-- Add reaction_type column to existing likes table
ALTER TABLE likes 
ADD COLUMN IF NOT EXISTS reaction_type TEXT DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'));

-- Add policy for updating reactions (drop if exists first)
DROP POLICY IF EXISTS "Users can update their own reactions" ON likes;
CREATE POLICY "Users can update their own reactions" ON likes
  FOR UPDATE USING (user_id = auth.uid());

-- Update existing likes to have 'like' reaction type
UPDATE likes 
SET reaction_type = 'like' 
WHERE reaction_type IS NULL; 