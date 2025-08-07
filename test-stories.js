// Test script to verify stories feature
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testStories() {
  try {
    console.log('Testing stories feature...');
    
    // Test 1: Check if stories table exists
    const { data: stories, error: fetchError } = await supabase
      .from('stories')
      .select('*')
      .limit(5);
    
    if (fetchError) {
      console.error('Error fetching stories:', fetchError);
      return;
    }
    
    console.log(`Found ${stories?.length || 0} stories in database`);
    
    // Test 2: Check if we can create a story (if we have auth)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      console.log('User authenticated:', user.id);
      
      const { data: newStory, error: createError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          content: 'Test story from script',
          background_color: 'blue',
          text_color: 'white'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating story:', createError);
      } else {
        console.log('Successfully created test story:', newStory.id);
        
        // Clean up
        await supabase
          .from('stories')
          .delete()
          .eq('id', newStory.id);
        
        console.log('Test story cleaned up');
      }
    } else {
      console.log('No authenticated user found');
    }
    
    console.log('Stories feature test completed!');
  } catch (error) {
    console.error('Error in stories test:', error);
  }
}

// Run the test
testStories(); 