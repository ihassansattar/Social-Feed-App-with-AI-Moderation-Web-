-- Add background_color column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS background_color VARCHAR(20) DEFAULT 'white';

-- Add text_color column for better contrast
ALTER TABLE posts ADD COLUMN IF NOT EXISTS text_color VARCHAR(20) DEFAULT 'black';

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_posts_background_color ON posts(background_color);

-- Update existing posts to have default colors
UPDATE posts SET 
  background_color = 'white',
  text_color = 'black'
WHERE background_color IS NULL OR text_color IS NULL; 