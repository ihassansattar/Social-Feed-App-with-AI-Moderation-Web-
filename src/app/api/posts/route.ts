// src/app/api/posts/route.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';

// Define the schema for the moderation result
const moderationSchema = z.object({
  isToxic: z.boolean().describe('Is the content toxic, hateful, or violent?'),
  isSpam: z.boolean().describe('Is the content spam or promotional?'),
  isProfane: z.boolean().describe('Does the content contain profanity or swear words?'),
});

export async function POST(request: Request) {
  try {
    console.log("API route called");
    
    const { content, title, media_url, media_type, feeling, background_color, text_color } = await request.json();
    console.log("Content received:", content);
    console.log("Title:", title);
    console.log("Media URL:", media_url);
    console.log("Media Type:", media_type);
    console.log("Feeling:", feeling);
    
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    console.log("User:", user?.id);
    
    if (!user) {
      console.log("No user found");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Use AI to moderate the content and title
    console.log("Starting AI moderation...");
    
    // Combine content and title for moderation
    const fullContent = title ? `Title: "${title}"\n\nContent: "${content}"` : `Content: "${content}"`;
    
    const { object: moderationResult } = await generateObject({
      model: google("gemini-1.5-flash"),
      prompt: `You are a content moderator. Please analyze the following text and determine if it is toxic, spam, or contains profanity.
      
      ${fullContent}
      
      Please be strict and flag any content that could be harmful, offensive, or inappropriate. Check both the title and content thoroughly.`,
      schema: moderationSchema,
    });

    console.log("AI moderation result:", moderationResult);

    const { isToxic, isSpam, isProfane } = moderationResult;
    const isFlagged = isToxic || isSpam || isProfane;
    const status = isFlagged ? "rejected" : "approved";

    console.log("Content status:", status, "Flagged:", isFlagged);

    console.log("About to insert post");

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content,
        title,
        media_url,
        media_type,
        feeling,
        background_color: background_color || 'white',
        text_color: text_color || 'black',
        status,
        moderation_result: moderationResult,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(JSON.stringify({ error: "Failed to create post: " + error.message }), {
        status: 500,
      });
    }

    console.log("Post created successfully:", data);
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("API Route Error:", error);
    return new Response(
      JSON.stringify({ error: "An internal server error occurred: " + (error as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
