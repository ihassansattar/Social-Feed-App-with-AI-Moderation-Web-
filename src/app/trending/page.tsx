"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, MessageCircle, ThumbsUp, MessageSquare, Share, Activity, TrendingUp, Heart, Eye, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { Post } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TrendingPost extends Post {
  author_name: string;
  author_avatar?: string;
  total_likes: number;
  total_comments: number;
  engagement_score: number;
  rank: number;
}

export default function TrendingPage() {
  const router = useRouter();
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchTrendingPosts();
  }, [timeFilter]);

  const fetchTrendingPosts = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }

      // Calculate date filter
      const now = new Date();
      let startDate = new Date();
      
      switch (timeFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      // Get all approved posts within the time filter
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'approved')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        toast.error('Failed to load trending posts');
        return;
      }

      if (!posts || posts.length === 0) {
        setTrendingPosts([]);
        setLoading(false);
        return;
      }

      // Get engagement data for all posts
      const postsWithEngagement = await Promise.all(
        posts.map(async (post) => {
          // Get likes
          const { data: likes } = await supabase
            .from('likes')
            .select('*')
            .eq('post_id', post.id);

          // Get real comments count
          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)
            .is('parent_id', null); // Only count top-level comments

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

          const totalLikes = likes?.length || 0;
          const totalComments = commentsCount || 0;
          
          // Calculate engagement score (likes + comments * 2 for comments weight)
          const engagementScore = totalLikes + (totalComments * 2);

          return {
            ...post,
            likes_count: totalLikes,
            total_likes: totalLikes,
            total_comments: totalComments,
            engagement_score: engagementScore,
            reactions_count: reactionsCount,
            user_reaction: userReaction,
            is_liked: !!userReaction,
            author_name: authorProfile?.full_name || 'Unknown User',
            author_avatar: authorProfile?.avatar_url,
            rank: 0 // Will be set after sorting
          };
        })
      );

      // Sort by engagement score and get top 5
      const sortedPosts = postsWithEngagement
        .sort((a, b) => b.engagement_score - a.engagement_score)
        .slice(0, 5)
        .map((post, index) => ({
          ...post,
          rank: index + 1
        }));

      setTrendingPosts(sortedPosts);
    } catch (error) {
      console.error('Error fetching trending posts:', error);
      toast.error('Failed to load trending posts');
    } finally {
      setLoading(false);
    }
  };

  const getTrendingIcon = (rank: number) => {
    if (rank <= 3) return <span className="text-orange-500">🔥</span>;
    if (rank <= 5) return <Zap className="w-4 h-4 text-yellow-500" />;
    return <TrendingUp className="w-4 h-4 text-blue-500" />;
  };

  const getTrendingColor = (rank: number) => {
    if (rank <= 3) return 'bg-gradient-to-r from-orange-400 to-red-500 text-white';
    if (rank <= 5) return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
    return 'bg-gradient-to-r from-blue-400 to-purple-500 text-white';
  };

  const getTrendingLabel = (rank: number) => {
    if (rank === 1) return '🔥 HOT';
    if (rank === 2) return '⚡ TRENDING';
    if (rank === 3) return '🚀 RISING';
    if (rank <= 5) return '📈 POPULAR';
    return '📊 TRENDING';
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

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'This Week';
    }
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
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg shadow-sm p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Trending Posts</h1>
                <p className="text-gray-600 text-base">Most engaging content {getTimeFilterLabel().toLowerCase()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-orange-400 to-red-500 text-white border-0 px-4 py-2 text-sm font-medium shadow-sm">
                <Zap className="w-4 h-4 mr-2" />
                Hot Now
              </Badge>
            </div>
          </div>
        </div>

        {/* Time Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                timeFilter === 'today'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                timeFilter === 'week'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                timeFilter === 'month'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              This Month
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {trendingPosts.length === 0 ? (
            <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 shadow-sm">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Activity className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Trending Posts Yet</h3>
                <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                  Posts will appear here once they start getting engagement from the community. Create engaging content to get trending!
                </p>
                <Button 
                  onClick={() => router.push('/feed')}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-8 py-3 rounded-lg font-medium text-lg shadow-lg"
                >
                  Create Trending Content
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {trendingPosts.map((post, index) => (
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
                          <Badge className="bg-gradient-to-r from-green-400 to-green-600 text-white border-0 flex items-center gap-1 px-3 py-1 text-xs shadow-sm">
                            <Activity className="w-3 h-3" />
                            {post.engagement_score} pts
                          </Badge>
                          <div className={`px-3 py-1 rounded-full flex items-center gap-1 ${getTrendingColor(post.rank)} shadow-sm text-xs font-bold border-2 border-white`}>
                            {getTrendingIcon(post.rank)}
                            {getTrendingLabel(post.rank)}
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
                        {post.total_comments} comments • 0 shares
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
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-orange-900 text-lg mb-3">
                  How Trending Posts Work
                </h3>
                <p className="text-orange-800 text-base leading-relaxed mb-4">
                  Posts are ranked by engagement score (likes + comments × 2). Only approved posts from the selected time period are eligible. Higher engagement = higher ranking!
                </p>
                <div className="flex items-center gap-4 text-sm text-orange-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>🔥 Hot (1st-3rd)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>⚡ Trending (4th-5th)</span>
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