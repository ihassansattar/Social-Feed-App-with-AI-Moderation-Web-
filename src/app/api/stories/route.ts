import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log("Stories API route called");
    
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

    console.log("Supabase client created");

    const { data: { user } } = await supabase.auth.getUser();
    
    console.log("User:", user?.id);
    
    if (!user) {
      console.log("No user found");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, media_url, media_type, background_color, text_color } = await request.json();

    if (!content && !media_url) {
      return NextResponse.json({ error: 'Story content or media is required' }, { status: 400 });
    }

    const { data: story, error } = await supabase
      .from('stories')
      .insert({
        user_id: user.id,
        content,
        media_url,
        media_type,
        background_color: background_color || 'white',
        text_color: text_color || 'black'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating story:', error);
      return NextResponse.json({ error: 'Failed to create story' }, { status: 500 });
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error('Error in POST /api/stories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log("Stories GET API route called");
    
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

    console.log("Supabase client created for GET");

    const { data: { user } } = await supabase.auth.getUser();
    
    console.log("User for GET:", user?.id);
    
    if (!user) {
      console.log("No user found for GET");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stories that haven't expired yet
    console.log("Fetching stories...");
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stories:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json({ 
        error: 'Failed to fetch stories',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    console.log("Stories fetched successfully:", stories?.length || 0);

    return NextResponse.json(stories);
  } catch (error) {
    console.error('Error in GET /api/stories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 