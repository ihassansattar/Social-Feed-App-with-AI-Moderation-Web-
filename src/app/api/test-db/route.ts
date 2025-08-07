import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log("Test DB API route called");
    
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    console.log("Supabase client created for DB test");

    const { data: { user } } = await supabase.auth.getUser();
    
    console.log("User for DB test:", user?.id);
    
    if (!user) {
      console.log("No user found for DB test");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test if stories table exists by trying to select from it
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('count')
      .limit(1);

    if (storiesError) {
      console.log("Stories table error:", storiesError);
      return NextResponse.json({ 
        message: 'Database test failed',
        error: storiesError.message,
        code: storiesError.code
      });
    }

    // Test if we can insert a test story
    const { data: testStory, error: insertError } = await supabase
      .from('stories')
      .insert({
        user_id: user.id,
        content: 'Test story for database verification',
        background_color: 'white',
        text_color: 'black'
      })
      .select()
      .single();

    if (insertError) {
      console.log("Insert test error:", insertError);
      return NextResponse.json({ 
        message: 'Insert test failed',
        error: insertError.message,
        code: insertError.code
      });
    }

    // Test fetching stories without join
    const { data: simpleStories, error: simpleError } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString());

    if (simpleError) {
      console.log("Simple stories fetch error:", simpleError);
      return NextResponse.json({ 
        message: 'Simple fetch test failed',
        error: simpleError.message,
        code: simpleError.code
      });
    }

    // Test fetching stories with join
    const { data: joinedStories, error: joinError } = await supabase
      .from('stories')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .gt('expires_at', new Date().toISOString());

    if (joinError) {
      console.log("Joined stories fetch error:", joinError);
      return NextResponse.json({ 
        message: 'Join fetch test failed',
        error: joinError.message,
        code: joinError.code
      });
    }

    // Clean up the test story
    await supabase
      .from('stories')
      .delete()
      .eq('id', testStory.id);

    return NextResponse.json({ 
      message: 'Database test successful',
      userId: user.id,
      storiesTableExists: true,
      canInsert: true,
      simpleFetchCount: simpleStories?.length || 0,
      joinedFetchCount: joinedStories?.length || 0
    });
  } catch (error) {
    console.error('Error in test DB:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 