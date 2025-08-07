/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Calendar, Edit, Save, X, Camera, Users, MessageCircle, Heart, Share2, Image, Video, Smile, MapPin, ThumbsUp, MessageSquare, Share, AlertTriangle, CheckCircle, XCircle, Clock, MoreHorizontal, Settings, BookOpen, UserPlus, Bell, Search, Menu, LogOut, Home, Feather, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Post, ProfileStats, ExtendedUserProfile } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';

interface Follower {
  id: string;
  full_name: string;
  avatar_url?: string;
  is_following_back: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'friends'>('posts');
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Form state for editing
  const [formData, setFormData] = useState({
    full_name: '',
    phone: ''
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not found');
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
        console.log('Profile data loaded:', profileData);
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name || 'Not set',
          phone: profileData.phone || 'Not set',
          email: user.email || 'Not set',
          avatar_url: profileData.avatar_url,
          cover_image_url: profileData.cover_image_url,
          created_at: profileData.created_at,
          stats
        });
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || ''
        });
      } else {
        // Fallback to user metadata
        setProfile({
          id: user.id,
          full_name: user.user_metadata?.full_name || 'Not set',
          phone: user.user_metadata?.phone || 'Not set',
          email: user.email || 'Not set',
          avatar_url: user.user_metadata?.avatar_url,
          cover_image_url: user.user_metadata?.cover_image_url,
          created_at: user.created_at,
          stats
        });
        setFormData({
          full_name: user.user_metadata?.full_name || '',
          phone: user.user_metadata?.phone || ''
        });
      }

      // Fetch user posts
      await fetchUserPosts(user.id);

      // Fetch followers
      await fetchFollowers(user.id);

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileStats = async (userId: string): Promise<ProfileStats> => {
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

  const fetchFollowers = async (userId: string) => {
    try {
      // Get all followers
      const { data: followsData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);

      if (followsData && followsData.length > 0) {
        const followerIds = followsData.map(f => f.follower_id);
        
        // Get profile data for followers
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', followerIds);

        if (profilesData) {
          // Check if current user is following back each follower
          const followersWithFollowStatus = await Promise.all(
            profilesData.map(async (follower) => {
              const { data: isFollowingBack } = await supabase
                .from('follows')
                .select('id')
                .eq('follower_id', userId)
                .eq('following_id', follower.id)
                .single();

              return {
                id: follower.id,
                full_name: follower.full_name,
                avatar_url: follower.avatar_url,
                is_following_back: !!isFollowingBack
              };
            })
          );

          setFollowers(followersWithFollowStatus);
        }
      } else {
        setFollowers([]);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
      setFollowers([]);
    }
  };

  const handleFollowBack = async (followerId: string) => {
    if (!user) return;

    setFollowLoading(followerId);
    try {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: followerId
        });

      if (error) {
        throw error;
      }

      // Update local state
      setFollowers(prev => prev.map(follower => 
        follower.id === followerId 
          ? { ...follower, is_following_back: true }
          : follower
      ));

      // Update stats
      const stats = await fetchProfileStats(user.id);
      setProfile(prev => prev ? { ...prev, stats } : null);

      toast.success('Followed back successfully!');
    } catch (error) {
      console.error('Error following back:', error);
      toast.error('Failed to follow back');
    } finally {
      setFollowLoading(null);
    }
  };

  const handleUnfollow = async (followerId: string) => {
    if (!user) return;

    setFollowLoading(followerId);
    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', followerId);

      if (error) {
        throw error;
      }

      // Update local state
      setFollowers(prev => prev.map(follower => 
        follower.id === followerId 
          ? { ...follower, is_following_back: false }
          : follower
      ));

      // Update stats
      const stats = await fetchProfileStats(user.id);
      setProfile(prev => prev ? { ...prev, stats } : null);

      toast.success('Unfollowed successfully!');
    } catch (error) {
      console.error('Error unfollowing:', error);
      toast.error('Failed to unfollow');
    } finally {
      setFollowLoading(null);
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
      console.log('Posts data:', posts);
      
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        avatar_url: publicUrl
      } : null);

      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB for cover images)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cover-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update profile with new cover image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          cover_image_url: publicUrl,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        cover_image_url: publicUrl
      } : null);

      console.log('Cover image uploaded successfully:', publicUrl);
      toast.success('Cover image updated successfully!');
    } catch (error) {
      console.error('Error uploading cover image:', error);
      toast.error('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
      // Reset file input
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        throw profileError;
      }

      // Update user metadata
      const { error: userError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.full_name,
          phone: formData.phone
        }
      });

      if (userError) {
        throw userError;
      }

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        full_name: formData.full_name,
        phone: formData.phone
      } : null);

      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      phone: profile?.phone || ''
    });
    setEditing(false);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerCoverImageUpload = () => {
    coverFileInputRef.current?.click();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'approved': return <CheckCircle className="w-3 h-3" />;
      case 'rejected': return <XCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
      <div className="min-h-screen bg-gray-100">
        {/* Facebook-style Profile Header */}
        <div className="relative">
          {/* Cover Photo */}
          <div className="h-64 relative overflow-hidden">
            {profile?.cover_image_url ? (
              <img
                src={profile.cover_image_url}
                alt="Cover"
                className="w-full h-full object-cover"
                onError={(e) => console.error('Cover image failed to load:', e)}
                onLoad={() => console.log('Cover image loaded successfully')}
              />
            ) : (
              <div className="h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"></div>
            )}
            {/* Subtle overlay for better text readability - only show when no cover image */}
            {!profile?.cover_image_url && (
              <div className="absolute inset-0 bg-black bg-opacity-5"></div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent"></div>
            
            {/* Cover Photo Edit Icon */}
            <button 
              onClick={triggerCoverImageUpload}
              disabled={uploadingCover}
              className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md text-gray-800 rounded-full hover:bg-white hover:shadow-lg transition-all duration-300 flex items-center justify-center shadow-md border border-white/20 hover:scale-110"
            >
              {uploadingCover ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              ) : (
                <Edit className="w-5 h-5 text-blue-600" />
              )}
            </button>
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverImageUpload}
              className="hidden"
            />
          </div>

          {/* Profile Picture */}
          <div className="absolute -bottom-16 left-8">
            <div className="relative">
              <div className="w-40 h-40 bg-white rounded-full p-2 shadow-xl">
                <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-20 h-20 text-gray-400" />
                  )}
                </div>
              </div>
              
              {/* Profile Picture Upload Button */}
              <button
                onClick={triggerFileUpload}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Profile Actions */}
          <div className="absolute bottom-4 right-8 flex items-center gap-3">
            <Button 
              onClick={() => router.push('/feed')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Story
            </Button>
            <Button 
              onClick={() => setShowEditModal(true)}
              variant="outline" 
              className="bg-white/90 backdrop-blur-sm hover:bg-white px-6 py-2 rounded-lg font-medium shadow-lg"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button variant="outline" className="bg-white/90 backdrop-blur-sm hover:bg-white p-2 rounded-lg shadow-lg">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="pt-20 pb-6 px-8">
          <div className="max-w-4xl mx-auto">
            {/* Name and Basic Info */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {profile?.full_name || 'Your Profile'}
              </h1>
              <p className="text-gray-600 text-lg mb-4">
                {profile?.email}
              </p>
              
              {/* Stats Row */}
              <div className="flex items-center gap-8 text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">{profile?.stats.followers_count || 0} followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span className="font-medium">{profile?.stats.posts_count || 0} posts</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  <span className="font-medium">{profile?.stats.following_count || 0} following</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-300">
              <div className="flex items-center space-x-8">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                    activeTab === 'posts'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Posts
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                    activeTab === 'about'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  About
                </button>
                <button
                  onClick={() => setActiveTab('friends')}
                  className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                    activeTab === 'friends'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Friends
                </button>
          
                {/* <button className="py-4 px-2 border-b-2 border-transparent text-gray-600 hover:text-gray-900 font-medium">
                  Photos
                </button>
                <button className="py-4 px-2 border-b-2 border-transparent text-gray-600 hover:text-gray-900 font-medium">
                  Videos
                </button> */}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-8 pb-8">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'posts' ? (
              <div className="max-w-2xl mx-auto">
                {userPosts.length === 0 ? (
                  <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <CardContent className="p-8 text-center">
                      <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Posts Yet</h3>
                      <p className="text-gray-600 mb-6">Start sharing your thoughts with the world!</p>
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
                    {userPosts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                      >
                        {/* Post Header */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
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
                                <p className="text-sm text-gray-500">
                                  {formatTimeAgo(post.created_at)} • <span className="text-blue-600">🌍</span>
                                </p>
                              </div>
                            </div>
                            {post.status !== 'approved' && (
                              <Badge className={`flex items-center gap-1 px-2 py-1 text-xs ${getStatusColor(post.status)}`}>
                                {getStatusIcon(post.status)}
                                {post.status === 'rejected' ? 'Rejected' : 'Pending'}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="p-4">
                          {/* Title */}
                          {post.title && (
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                              {post.title}
                            </h3>
                          )}
                          
                          {/* Content with Feeling */}
                          <div className="flex items-start gap-3 mb-4">
                            {post.feeling && (
                              <span className="text-2xl">{post.feeling}</span>
                            )}
                            <p className="text-gray-900 text-base leading-relaxed flex-1">
                              {post.content}
                            </p>
                          </div>

                          {/* Media */}
                          {post.media_url && (
                            <div className="mb-4">
                              {post.media_type === 'image' ? (
                                <img
                                  src={post.media_url}
                                  alt="Post media"
                                  className="w-full rounded-lg max-h-96 object-cover"
                                />
                              ) : post.media_type === 'video' ? (
                                <video
                                  src={post.media_url}
                                  controls
                                  className="w-full rounded-lg max-h-96"
                                />
                              ) : null}
                            </div>
                          )}
                        </div>

                        {/* Post Stats */}
                        {post.status === 'approved' && (
                          <>
                            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  {post.reactions_count && Object.values(post.reactions_count).some(count => count > 0) && (
                                    <div className="flex items-center gap-1">
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
                                <span className="text-gray-600">0 comments • 0 shares</span>
                              </div>
                            </div>

                            {/* Post Actions */}
                            <div className="px-4 py-2 border-t border-gray-100">
                              <div className="flex items-center justify-between">
                                <Button variant="ghost" size="sm" className="flex items-center gap-2 flex-1 justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                                  <ThumbsUp className="w-4 h-4" />
                                  <span>Like</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="flex items-center gap-2 flex-1 justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                                  <MessageSquare className="w-4 h-4" />
                                  <span>Comment</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="flex items-center gap-2 flex-1 justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                                  <Share className="w-4 h-4" />
                                  <span>Share</span>
                                </Button>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Rejection Details */}
                        {post.status === 'rejected' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="px-4 pb-4"
                          >
                            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-semibold text-red-800 text-sm mb-2">
                                    Content Policy Violation
                                  </p>
                                  <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                                    {post.moderation_result?.isToxic && <li>Toxicity or hate speech detected</li>}
                                    {post.moderation_result?.isSpam && <li>Spam or promotional content</li>}
                                    {post.moderation_result?.isProfane && <li>Profanity or inappropriate language</li>}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'friends' ? (
              <div className="max-w-2xl mx-auto">
                <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-900">Friends</CardTitle>
                    <p className="text-gray-600">People who follow you</p>
                  </CardHeader>
                  <CardContent>
                    {followers.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Followers Yet</h3>
                        <p className="text-gray-600">When people follow you, they&apos;ll appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {followers.map((follower) => (
                          <div key={follower.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                                {follower.avatar_url ? (
                                  <img
                                    src={follower.avatar_url}
                                    alt={follower.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-6 h-6 text-white" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{follower.full_name}</h4>
                                <p className="text-sm text-gray-600">Follower</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {follower.is_following_back ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnfollow(follower.id)}
                                  disabled={followLoading === follower.id}
                                  className="text-gray-600 hover:text-red-600 hover:border-red-600"
                                >
                                  {followLoading === follower.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                  ) : (
                                    'Unfollow'
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleFollowBack(follower.id)}
                                  disabled={followLoading === follower.id}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  {followLoading === follower.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  ) : (
                                    'Follow Back'
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-900">About</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Full Name
                          </Label>
                          {editing ? (
                            <Input
                              value={formData.full_name}
                              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                              placeholder="Enter your full name"
                              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-900">
                                {profile?.full_name || 'Not set'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Email
                          </Label>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-900">
                              {profile?.email}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Phone Number
                          </Label>
                          {editing ? (
                            <Input
                              value={formData.phone}
                              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="Enter your phone number"
                              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-900">
                                {profile?.phone || 'Not set'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Member Since
                          </Label>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-900">
                              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              }) : 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Edit Actions */}
                    {editing ? (
                      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                        <Button
                          onClick={handleSave}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                          disabled={loading}
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setEditing(true)}
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Edit Profile</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-blue-100 mt-1">Update your profile information</p>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Profile Picture Section */}
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-gray-200 rounded-full overflow-hidden mx-auto mb-4">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-gray-400 mx-auto mt-6" />
                    )}
                  </div>
                  <button
                    onClick={triggerFileUpload}
                    disabled={uploading}
                    className="absolute top-17 -right-1 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 border-2 border-white"
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-600">Click camera to change profile picture</p>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                    className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                    className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-300">
                    <span className="text-gray-900">{profile?.email}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center gap-3">
              <Button
                onClick={() => setShowEditModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await handleSave();
                  setShowEditModal(false);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AppLayout>
  );
} 