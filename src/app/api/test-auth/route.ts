import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log("Test auth API route called");
    
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

    console.log("Supabase client created for test");

    const { data: { user } } = await supabase.auth.getUser();
    
    console.log("User for test:", user?.id);
    
    if (!user) {
      console.log("No user found for test");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ 
      message: 'Authentication working',
      userId: user.id,
      email: user.email 
    });
  } catch (error) {
    console.error('Error in test auth:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 