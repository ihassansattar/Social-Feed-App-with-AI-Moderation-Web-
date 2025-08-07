// src/app/api/test-create-post/route.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create a test post
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: 'This is a test post for testing comments functionality!',
        status: 'approved',
        moderation_result: {
          flagged: false,
          isToxic: false,
          isSpam: false,
          isProfane: false
        }
      })
      .select('*')
      .single();

    if (error) {
      console.error('Create post error:', error);
      return NextResponse.json({ 
        error: error.message, 
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test post created successfully',
      data 
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 