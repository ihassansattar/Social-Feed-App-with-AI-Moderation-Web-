// src/lib/types.ts

export interface Post {
  id: string;
  user_id: string;
  content: string;
  title?: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  feeling?: string;
  background_color?: string;
  text_color?: string;
  status: 'pending' | 'approved' | 'rejected';
  moderation_result: {
    flagged: boolean;
    isToxic: boolean;
    isSpam: boolean;
    isProfane: boolean;
    categories?: string[];
    scores?: Record<string, number>;
  };
  created_at: string;
  author: {
    full_name: string;
    avatar_url?: string;
  } | null;
  likes_count?: number;
  is_liked?: boolean;
  user_reaction?: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'care';
  reactions_count?: {
    like: number;
    love: number;
    haha: number;
    wow: number;
    sad: number;
    angry: number;
    care: number;
  };
  comments_count?: number;
  comments?: CommentWithAuthor[];
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends Comment {
  author: {
    full_name: string;
    avatar_url?: string;
  } | null;
  replies?: CommentWithAuthor[];
  replies_count?: number;
  like_count?: number;
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string;
  reaction_type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'care';
  created_at: string;
}

export interface ModerationResult {
  flagged: boolean;
  isToxic: boolean;
  isSpam: boolean;
  isProfane: boolean;
  categories?: string[];
  scores?: Record<string, number>;
}

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  avatar_url?: string;
  cover_image_url?: string;
  created_at: string;
}

export interface ProfileStats {
  posts_count: number;
  followers_count: number;
  following_count: number;
}

export interface ExtendedUserProfile extends UserProfile {
  stats: ProfileStats;
}
