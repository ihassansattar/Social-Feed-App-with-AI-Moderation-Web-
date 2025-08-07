-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  background_color TEXT DEFAULT 'white',
  text_color TEXT DEFAULT 'black',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stories
CREATE POLICY "Users can view stories from last 24 hours" ON stories
  FOR SELECT USING (expires_at > NOW());

CREATE POLICY "Users can create their own stories" ON stories
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own stories" ON stories
  FOR DELETE USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);

-- Create storage bucket for stories media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for stories bucket
CREATE POLICY "Public access to story media" ON storage.objects
  FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Users can upload their own story media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stories');

CREATE POLICY "Users can update their own story media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'stories');

CREATE POLICY "Users can delete their own story media" ON storage.objects
  FOR DELETE USING (bucket_id = 'stories');

-- Create a function to manually delete expired stories (can be called periodically)
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql; 