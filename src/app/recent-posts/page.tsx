"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, MessageCircle, ThumbsUp, MessageSquare, Share, CheckCircle, Clock, ArrowLeft, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Post, ExtendedUserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RecentPostsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not found');
        router.push('/login');
        return;
      }
      setUser(user);

      // Get user profile from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
        toast.error('Failed to fetch profile');
      }

      // Fetch profile statistics
      const stats = await fetchProfileStats(user.id);

      if (profileData) {
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name || 'Not set',
          phone: profileData.phone || 'Not set',
          email: user.email || 'Not set',
          avatar_url: profileData.avatar_url,
          created_at: profileData.created_at,
          stats
        });
      } else {
        // Fallback to user metadata
        setProfile({
          id: user.id,
          full_name: user.user_metadata?.full_name || 'Not set',
          phone: user.user_metadata?.phone || 'Not set',
          email: user.email || 'Not set',
          avatar_url: user.user_metadata?.avatar_url,
          created_at: user.created_at,
          stats
        });
      }

      // Fetch user posts
      await fetchUserPosts(user.id);

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileStats = async (userId: string) => {
    try {
      // Get posts count - only count posts created by user (not rejected)
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('status', 'rejected');

      // Get followers count
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      // Get following count
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      return {
        posts_count: postsCount || 0,
        followers_count: followersCount || 0,
        following_count: followingCount || 0
      };
    } catch (error) {
      console.error('Error fetching profile stats:', error);
      return {
        posts_count: 0,
        followers_count: 0,
        following_count: 0
      };
    }
  };

  const fetchUserPosts = async (userId: string) => {
    try {
      console.log('Fetching posts for user:', userId);
      
      // Get all posts by user except rejected ones
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'rejected')
        .order('created_at', { ascending: false });

      console.log('Posts found:', posts?.length || 0);
      
      if (error) {
        console.error('Error fetching user posts:', error);
        return;
      }

      if (!posts || posts.length === 0) {
        console.log('No posts found for user');
        setUserPosts([]);
        return;
      }

      // Get likes and reactions for each post
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

          const userReaction = likes?.find(like => like.user_id === userId)?.reaction_type;

          return {
            ...post,
            likes_count: likes?.length || 0,
            reactions_count: reactionsCount,
            user_reaction: userReaction,
            is_liked: !!userReaction,
            author: {
              full_name: profile?.full_name || 'Unknown User',
              avatar_url: profile?.avatar_url
            }
          };
        })
      );

      console.log('Posts with likes processed:', postsWithLikes.length);
      setUserPosts(postsWithLikes);
    } catch (error) {
      console.error('Error fetching user posts:', error);
      setUserPosts([]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'approved': return <CheckCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const filteredPosts = userPosts.filter(post => {
    if (filter === 'all') return true;
    return post.status === filter;
  });

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
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Recent Posts</h1>
              <p className="text-gray-600 text-sm">Your posts that are visible to others</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">
                {filteredPosts.length} posts
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              All Posts
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Pending
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {filter === 'all' ? 'No Posts Yet' : `No ${filter} Posts`}
                </h3>
                <p className="text-gray-600 mb-6">
                  {filter === 'all' 
                    ? "Start sharing your thoughts with the world!" 
                    : `You don't have any ${filter} posts yet.`
                  }
                </p>
                <Button 
                  onClick={() => router.push('/feed')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Create Your First Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post, index) => (
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
                          onClick={() => router.push(`/profile`)}
                        >
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {profile?.full_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimeAgo(post.created_at)} • <span className="text-blue-600">🌍</span>
                          </p>
                        </div>
                      </div>
                      <Badge className={`flex items-center gap-1 px-2 py-1 text-xs ${getStatusColor(post.status)}`}>
                        {getStatusIcon(post.status)}
                        {post.status === 'pending' ? 'Pending Review' : 'Approved'}
                      </Badge>
                    </div>
                  </div>

                  {/* Feeling Display - Facebook Style */}
                  {post.feeling && (
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>
                          <span className="font-semibold text-black text-lg">{profile?.full_name}</span> <span className=" ml-1 text-black">is</span>   <span className="text-lg">{post.feeling}</span> <span className='text-black'> feeling </span>
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
                  {post.status === 'approved' && (
                    <>
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
                    </>
                  )}

                  {/* Pending Status Info */}
                  {post.status === 'pending' && (
                    <div className="px-4 pb-4">
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-yellow-800 text-sm mb-1">
                              Post Under Review
                            </p>
                            <p className="text-yellow-700 text-xs">
                              Your post is being reviewed by our moderation team. It will be visible to others once approved.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
} 