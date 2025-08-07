// src/app/api/comment-likes/route.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { commentId } = await request.json();

    if (!commentId) {
      return new Response(JSON.stringify({ error: "Comment ID is required" }), {
        status: 400,
      });
    }

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Check if the comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return new Response(JSON.stringify({ error: "Comment not found" }), {
        status: 404,
      });
    }

    // Check if user already liked the comment
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Unlike the comment
      const { error: unlikeError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      if (unlikeError) {
        console.error('Error unliking comment:', unlikeError);
        return new Response(JSON.stringify({ error: "Failed to unlike comment" }), {
          status: 500,
        });
      }

      return NextResponse.json({ 
        success: true, 
        action: 'unliked',
        message: 'Comment unliked successfully'
      });
    } else {
      // Like the comment
      const { error: likeError } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: user.id,
        });

      if (likeError) {
        console.error('Error liking comment:', likeError);
        return new Response(JSON.stringify({ error: "Failed to like comment" }), {
          status: 500,
        });
      }

      return NextResponse.json({ 
        success: true, 
        action: 'liked',
        message: 'Comment liked successfully'
      });
    }
  } catch (error) {
    console.error('Error in comment likes API:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    const userId = searchParams.get('userId');

    if (!commentId) {
      return new Response(JSON.stringify({ error: "Comment ID is required" }), {
        status: 400,
      });
    }

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

    // Get like count for the comment
    const { data: likeCount, error: countError } = await supabase
      .from('comment_likes')
      .select('id', { count: 'exact' })
      .eq('comment_id', commentId);

    if (countError) {
      console.error('Error getting like count:', countError);
      return new Response(JSON.stringify({ error: "Failed to get like count" }), {
        status: 500,
      });
    }

    let isLiked = false;
    
    // Check if current user liked the comment
    if (userId) {
      const { data: userLike, error: userLikeError } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .single();

      isLiked = !!userLike && !userLikeError;
    }

    return NextResponse.json({
      success: true,
      likeCount: likeCount?.length || 0,
      isLiked
    });
  } catch (error) {
    console.error('Error in comment likes API:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
} 