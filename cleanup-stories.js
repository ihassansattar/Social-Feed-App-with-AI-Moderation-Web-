// Simple script to clean up expired stories
// Run this manually or set up as a cron job on your server

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations
);

async function cleanupExpiredStories() {
  try {
    console.log('Starting cleanup of expired stories...');
    
    // Delete expired stories
    const { data, error } = await supabase
      .from('stories')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) {
      console.error('Error cleaning up stories:', error);
      return;
    }
    
    console.log(`Successfully cleaned up expired stories`);
  } catch (error) {
    console.error('Error in cleanup script:', error);
  }
}

// Run the cleanup
cleanupExpiredStories(); 