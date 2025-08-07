// src/app/api/comments/route.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return new Response(JSON.stringify({ error: "Post ID is required" }), {
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

    // Get all comments for the post
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .is('parent_id', null) // Only get top-level comments
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return new Response(JSON.stringify({ error: "Failed to fetch comments" }), {
        status: 500,
      });
    }

    // Get replies for each comment and fetch profiles
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const { data: replies } = await supabase
          .from('comments')
          .select('*')
          .eq('parent_id', comment.id)
          .order('created_at', { ascending: true });

        // Get author profile for comment
        const { data: authorProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', comment.user_id)
          .single();

        // Get like count for comment
        const { data: commentLikes } = await supabase
          .from('comment_likes')
          .select('id')
          .eq('comment_id', comment.id);

        // Get author profiles for replies
        const repliesWithProfiles = await Promise.all(
          (replies || []).map(async (reply) => {
            const { data: replyProfile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', reply.user_id)
              .single();

            // Get like count for reply
            const { data: replyLikes } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comment_id', reply.id);

            return {
              ...reply,
              author: replyProfile,
              like_count: replyLikes?.length || 0
            };
          })
        );

        return {
          ...comment,
          author: authorProfile,
          replies: repliesWithProfiles,
          replies_count: replies?.length || 0,
          like_count: commentLikes?.length || 0
        };
      })
    );

    return NextResponse.json(commentsWithReplies);
  } catch (error) {
    console.error('Error in comments API:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  try {
    const { postId, content, parentId } = await request.json();

    if (!postId || !content) {
      return new Response(JSON.stringify({ error: "Post ID and content are required" }), {
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

    // Check if the post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
      });
    }

    // Check if parent comment exists when creating a reply
    if (parentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parentId)
        .single();

      if (parentError || !parentComment) {
        return new Response(JSON.stringify({ error: "Parent comment not found" }), {
          status: 404,
        });
      }
    }

    // Insert the comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        parent_id: parentId || null,
        content: content.trim(),
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return new Response(JSON.stringify({ error: `Failed to create comment: ${error.message}` }), {
        status: 500,
      });
    }

    // Get the user profile for the comment
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      ...comment,
      author: profile,
      replies: [],
      replies_count: 0
    });
  } catch (error) {
    console.error('Error in comments API:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function PUT(request: Request) {
  try {
    const { commentId, content } = await request.json();

    if (!commentId || !content) {
      return new Response(JSON.stringify({ error: "Comment ID and content are required" }), {
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

    // Update the comment
    const { data: comment, error } = await supabase
      .from('comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('user_id', user.id) // Ensure user can only edit their own comments
      .select('*')
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      return new Response(JSON.stringify({ error: "Failed to update comment" }), {
        status: 500,
      });
    }

    // Get the user profile for the comment
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      ...comment,
      author: profile
    });
  } catch (error) {
    console.error('Error in comments API:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');

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

    // Delete the comment (this will also delete replies due to CASCADE)
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id); // Ensure user can only delete their own comments

    if (error) {
      console.error('Error deleting comment:', error);
      return new Response(JSON.stringify({ error: "Failed to delete comment" }), {
        status: 500,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in comments API:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
} 