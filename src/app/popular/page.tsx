"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, MessageCircle, ThumbsUp, MessageSquare, Share, TrendingUp, Crown, Heart, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Post } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PopularPost extends Post {
  author_name: string;
  author_avatar?: string;
  total_likes: number;
  rank: number;
}

export default function PopularPage() {
  const router = useRouter();
  const [popularPosts, setPopularPosts] = useState<PopularPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    fetchPopularPosts();
  }, []);

  const fetchPopularPosts = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }

      // Get all approved posts with their like counts
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        toast.error('Failed to load popular posts');
        return;
      }

      if (!posts || posts.length === 0) {
        setPopularPosts([]);
        setLoading(false);
        return;
      }

      // Get likes for all posts
      const postsWithLikes = await Promise.all(
        posts.map(async (post) => {
          const { data: likes } = await supabase
            .from('likes')
            .select('*')
            .eq('post_id', post.id);

          const reactionsCount = {
            like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0, care: 0
          };

          likes?.forEach(like => {
            if (like.reaction_type in reactionsCount) {
              reactionsCount[like.reaction_type as keyof typeof reactionsCount]++;
            }
          });

          const userReaction = user ? likes?.find(like => like.user_id === user.id)?.reaction_type : null;

          // Get author profile
          const { data: authorProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', post.user_id)
            .single();

          return {
            ...post,
            likes_count: likes?.length || 0,
            total_likes: likes?.length || 0,
            reactions_count: reactionsCount,
            user_reaction: userReaction,
            is_liked: !!userReaction,
            author_name: authorProfile?.full_name || 'Unknown User',
            author_avatar: authorProfile?.avatar_url,
            rank: 0 // Will be set after sorting
          };
        })
      );

      // Sort by total likes and get top 5
      const sortedPosts = postsWithLikes
        .sort((a, b) => b.total_likes - a.total_likes)
        .slice(0, 5)
        .map((post, index) => ({
          ...post,
          rank: index + 1
        }));

      setPopularPosts(sortedPosts);
    } catch (error) {
      console.error('Error fetching popular posts:', error);
      toast.error('Failed to load popular posts');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 text-yellow-500" />;
      case 2: return <span className="text-gray-400">🥈</span>;
      case 3: return <span className="text-orange-400">🥉</span>;
      default: return <span className="text-gray-500 font-bold">{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-400 text-white';
      case 3: return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getFeelingName = (emoji: string) => {
    const feelingMap: Record<string, string> = {
      '😊': 'happy',
      '😂': 'amused',
      '😍': 'loved',
      '🥰': 'blessed',
      '😎': 'cool',
      '🤔': 'thoughtful',
      '😢': 'sad',
      '😡': 'angry',
      '🎉': 'celebratory',
      '❤️': 'loved',
      '👍': 'positive',
      '👎': 'negative',
      '🔥': 'excited',
      '💯': 'amazed',
      '✨': 'magical',
      '🌟': 'starstruck'
    };
    return feelingMap[emoji] || 'good';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg shadow-sm p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Popular Posts</h1>
                <p className="text-gray-600 text-base">Discover the most engaging content from our community</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 px-4 py-2 text-sm font-medium shadow-sm">
                <Crown className="w-4 h-4 mr-2" />
                Trending Now
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {popularPosts.length === 0 ? (
            <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 shadow-sm">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <TrendingUp className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Popular Posts Yet</h3>
                <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                  Posts will appear here once they start getting likes from the community. Be the first to create engaging content!
                </p>
                <Button 
                  onClick={() => router.push('/feed')}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-medium text-lg shadow-lg"
                >
                  Create Your First Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {popularPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
                >
                  {/* Post Header */}
                  <div className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => router.push(`/user/${post.user_id}`)}
                        >
                          {post.author_avatar ? (
                            <img
                              src={post.author_avatar}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {post.author_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimeAgo(post.created_at)} • <span className="text-blue-600">🌍</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gradient-to-r from-red-400 to-red-600 text-white border-0 flex items-center gap-1 px-3 py-1 text-xs shadow-sm">
                            <Heart className="w-3 h-3" />
                            {post.total_likes} likes
                          </Badge>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRankColor(post.rank)} shadow-sm border-2 border-white`}>
                            {getRankIcon(post.rank)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feeling Display - Facebook Style */}
                  {post.feeling && (
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>
                          <span className="font-semibold text-black text-lg">{post.author_name}</span> <span className=" ml-1 text-black">is</span>   <span className="text-lg">{post.feeling}</span> <span className='text-black'> feeling </span>
                          <span className="font-semibold text-black ml-1">
                            {getFeelingName(post.feeling)}
                          </span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Post Content */}
                  <div className="px-4 pb-4">
                    {/* Title */}
                    {post.title && (
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {post.title}
                      </h3>
                    )}
                    
                    {/* Text Post with Background Color */}
                    {!post.media_url && post.content && (
                      <div 
                        className="mb-3 rounded-lg p-6 text-center"
                        style={{ 
                          backgroundColor: post.background_color || 'white',
                          color: post.text_color || 'black'
                        }}
                      >
                        <p className="text-2xl font-bold leading-relaxed">
                          {post.content}
                        </p>
                      </div>
                    )}

                    {/* Regular Content for Media Posts */}
                    {post.media_url && (
                      <div className="mb-3">
                        <p className="text-gray-900 text-base leading-relaxed">
                          {post.content}
                        </p>
                      </div>
                    )}

                    {/* Media */}
                    {post.media_url && (
                      <div className="mt-3">
                        {post.media_type === 'image' ? (
                          <img
                            src={post.media_url}
                            alt="Post media"
                            className="max-w-full rounded-lg"
                          />
                        ) : post.media_type === 'video' ? (
                          <video
                            src={post.media_url}
                            controls
                            className="max-w-full rounded-lg"
                          />
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Post Stats - Facebook Style */}
                  <div className="px-4 py-2 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        {/* Show reaction emojis */}
                        {post.reactions_count && Object.values(post.reactions_count).some(count => count > 0) && (
                          <div className="flex items-center space-x-1">
                            {post.reactions_count.like > 0 && <span className="text-sm">👍</span>}
                            {post.reactions_count.love > 0 && <span className="text-sm">❤️</span>}
                            {post.reactions_count.haha > 0 && <span className="text-sm">😂</span>}
                            {post.reactions_count.wow > 0 && <span className="text-sm">😮</span>}
                            {post.reactions_count.sad > 0 && <span className="text-sm">😢</span>}
                            {post.reactions_count.angry > 0 && <span className="text-sm">😡</span>}
                            {post.reactions_count.care > 0 && <span className="text-sm">🤗</span>}
                            <span className="text-gray-600">
                              {post.user_reaction ? 'You' : ''} 
                              {post.user_reaction && Object.values(post.reactions_count).some(count => count > 0) ? ' and ' : ''}
                              {Object.values(post.reactions_count).reduce((sum, count) => sum + count, 0)} others
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-gray-600 hover:underline cursor-pointer font-medium">
                        0 comments • 0 shares
                      </span>
                    </div>
                  </div>

                  {/* Post Actions */}
                  <div className="px-4 py-2 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="sm" className="flex items-center space-x-2 flex-1 justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                        <ThumbsUp className="w-4 h-4" />
                        <span>Like</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="flex items-center space-x-2 flex-1 justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                        <MessageSquare className="w-4 h-4" />
                        <span>Comment</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="flex items-center space-x-2 flex-1 justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                        <Share className="w-4 h-4" />
                        <span>Share</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 text-lg mb-3">
                  How Popular Posts Work
                </h3>
                <p className="text-blue-800 text-base leading-relaxed mb-4">
                  Posts are ranked by the total number of likes they receive. Only approved posts are eligible for the popular posts list. The more engagement your posts get, the higher they rank!
                </p>
                <div className="flex items-center gap-4 text-sm text-blue-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <span>1st Place - Gold</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span>2nd Place - Silver</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                    <span>3rd Place - Bronze</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 