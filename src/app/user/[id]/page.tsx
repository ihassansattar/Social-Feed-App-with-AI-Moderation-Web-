"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Post } from '@/lib/types';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Users, 
  UserPlus, 
  UserCheck, 
  MessageCircle,
  MoreHorizontal,
  Heart,
  Share,
  MessageSquare,
  ThumbsUp,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast.error('User not found');
        return;
      }

      setProfile(profileData);

      // Check if this is the current user's own profile
      setIsOwnProfile(user?.id === userId);

      // Get user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
      } else {
        // Get all user profiles for author names
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url');
        
        const profilesMap = new Map(profiles?.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []);
        
        // Get likes count for each post
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id');

        const likesCountMap = new Map<string, number>();
        if (likesData) {
          likesData.forEach(like => {
            likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1);
          });
        }

        const postsWithAuthors = postsData.map((post) => {
          const profile = profilesMap.get(post.user_id);
          return {
            ...post,
            author: {
              full_name: profile?.full_name || 'Unknown User',
              avatar_url: profile?.avatar_url
            },
            likes_count: likesCountMap.get(post.id) || 0
          };
        });

        // Show only approved posts (rejected posts are completely hidden)
        const filteredPosts = postsWithAuthors.filter(post => post.status === 'approved');

        setPosts(filteredPosts as Post[]);
        setPostsCount(filteredPosts.length);
      }

      // Check if current user is following this user
      if (user && user.id !== userId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .single();

        setIsFollowing(!!followData);
      }

      // Get followers and following counts
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      setFollowersCount(followersCount || 0);
      setFollowingCount(followingCount || 0);

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !profile) return;

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId);

        if (error) throw error;

        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
        toast.success(`Unfollowed ${profile.full_name}`);
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId
          });

        if (error) throw error;

        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast.success(`Started following ${profile.full_name}`);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return postDate.toLocaleDateString();
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

  if (!profile) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">User Not Found</h2>
          <p className="text-gray-600">The user you're looking for doesn't exist.</p>
        </div>
      </AppLayout>
    );
  }

  // isOwnProfile is already defined as state variable

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Profile Header - Facebook Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-start space-x-6">
                {/* Profile Picture */}
                <div className="relative">
                  <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-white" />
                    )}
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        {profile.full_name}
                      </h1>
                      <p className="text-gray-600 mb-2 text-sm">
                        {profile.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        Member since {(() => {
                          const date = profile.created_at || currentUser?.created_at;
                          if (date) {
                            try {
                              return new Date(date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            } catch (error) {
                              return 'Unknown';
                            }
                          }
                          return 'Unknown';
                        })()}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!isOwnProfile && (
                        <>
                          <Button
                            onClick={handleFollow}
                            variant={isFollowing ? "outline" : "default"}
                            className={`flex items-center space-x-2 ${
                              isFollowing 
                                ? 'border-gray-300 hover:bg-gray-50' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {isFollowing ? (
                              <>
                                <UserCheck className="w-4 h-4" />
                                <span>Following</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4" />
                                <span>Follow</span>
                              </>
                            )}
                          </Button>
                          <Button variant="outline" size="icon">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center space-x-8 mt-4 pt-4 border-t border-gray-200">
                    <div className="text-center cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors">
                      <div className="text-xl font-bold text-gray-900">{followersCount}</div>
                      <div className="text-xs text-gray-600 font-medium">Followers</div>
                    </div>
                    <div className="text-center cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors">
                      <div className="text-xl font-bold text-gray-900">{followingCount}</div>
                      <div className="text-xs text-gray-600 font-medium">Following</div>
                    </div>
                    <div className="text-center cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors">
                      <div className="text-xl font-bold text-gray-900">{postsCount}</div>
                      <div className="text-xs text-gray-600 font-medium">Posts</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Posts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Posts by {profile.full_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence>
                {posts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No posts yet.</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-lg border border-gray-200"
                      >
                        {/* Post Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                              {post.author?.avatar_url ? (
                                <img
                                  src={post.author.avatar_url}
                                  alt="Profile"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {post.author?.full_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatTimeAgo(post.created_at)} • <span className="text-blue-600">🌍</span>
                              </p>
                            </div>
                          </div>
                          {/* Status badges removed - only approved posts show */}
                        </div>

                        {/* Post Content */}
                        <div className="mb-3">
                          <p className="text-gray-900 text-sm leading-relaxed">
                            {post.content}
                          </p>
                        </div>

                        {/* Post Stats */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                              <ThumbsUp className="w-1.5 h-1.5 text-white" />
                            </div>
                            <span>{post.likes_count || 0}</span>
                          </div>
                          <span>0 comments • 0 shares</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
} 