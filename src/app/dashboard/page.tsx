"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  MessageCircle, 
  Heart, 
  Shield, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Zap,
  Home,

} from 'lucide-react';
import { Post } from '@/lib/types';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalPosts: number;
  approvedPosts: number;
  rejectedPosts: number;
  totalLikes: number;
  totalLikesGiven: number;
  memberSince: string;
  lastPostDate: string | null;
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name?: string } | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    approvedPosts: 0,
    rejectedPosts: 0,
    totalLikes: 0,
    totalLikesGiven: 0,
    memberSince: '',
    lastPostDate: null
  });
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not found');
        return;
      }
      setUser(user);

      // Get user profile for full name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      setUserProfile(profile);

      // Get user posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
      }

      // Get user likes given
      const { data: likesGiven, error: likesGivenError } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', user.id);

      if (likesGivenError) {
        console.error('Error fetching likes given:', likesGivenError);
      }

      // Get likes received on user's posts
      let totalLikesReceived = 0;
      if (posts) {
        const postIds = posts.map(p => p.id);
        if (postIds.length > 0) {
          const { data: likesReceived, error: likesReceivedError } = await supabase
            .from('likes')
            .select('*')
            .in('post_id', postIds);

          if (!likesReceivedError && likesReceived) {
            totalLikesReceived = likesReceived.length;
          }
        }
      }

      // Calculate stats
      const totalPosts = posts?.length || 0;
      const approvedPosts = posts?.filter(p => p.status === 'approved').length || 0;
      const rejectedPosts = posts?.filter(p => p.status === 'rejected').length || 0;
      const totalLikesGiven = likesGiven?.length || 0;
      const lastPostDate = posts && posts.length > 0 ? posts[0].created_at : null;

      setStats({
        totalPosts,
        approvedPosts,
        rejectedPosts,
        totalLikes: totalLikesReceived,
        totalLikesGiven,
        memberSince: user.created_at,
        lastPostDate
      });

      // Set recent posts (last 5) - only approved posts
      if (posts) {
        const approvedPosts = posts.filter(p => p.status === 'approved');
        setRecentPosts(approvedPosts.slice(0, 5));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
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
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
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
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-sm p-4"
        >
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Welcome back, {userProfile?.full_name || user?.email?.split('@')[0]?.replace(/[0-9]/g, '') || 'User'}! 👋
          </h1>
          <p className="text-gray-600">
            Here&apos;s what&apos;s happening with your Social Feed activity
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {/* Total Posts */}
          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.totalPosts}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Posts</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approved Posts */}
          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.approvedPosts}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Approved</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Likes Received */}
          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.totalLikes}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Likes</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <Heart className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Likes Given */}
          {/* <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.totalLikesGiven}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">Given</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card> */}
        </motion.div>

        {/* Quick Actions & Recent Posts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Link href="/feed">
                  <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-medium">
                    <MessageCircle className="w-5 h-5 mr-3" />
                    Create New Post
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="outline" className="w-full justify-start h-12 text-base font-medium border-gray-200 hover:bg-gray-50">
                    <User className="w-5 h-5 mr-3" />
                    View Profile
                  </Button>
                </Link>
                <Link href="/feed">
                  <Button variant="outline" className="w-full justify-start h-12 text-base font-medium border-gray-200 hover:bg-gray-50">
                    <Home className="w-5 h-5 mr-3" />
                    Browse Feed
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Account Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Account Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Member Since</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.memberSince ? new Date(stats.memberSince).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Last Post</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.lastPostDate ? new Date(stats.lastPostDate).toLocaleDateString() : 'No posts yet'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-gray-700">Rejected Posts</span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {stats.rejectedPosts}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Posts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Recent Posts
                </CardTitle>
                <Link href="/feed">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentPosts.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No posts yet</p>
                  <Link href="/feed">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Create Your First Post
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium mb-1">
                          {post.content.length > 50 ? `${post.content.substring(0, 50)}...` : post.content}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(post.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={`ml-4 ${getStatusColor(post.status)}`}>
                        {getStatusIcon(post.status)}
                        {post.status === 'approved' ? 'Published' : 
                         post.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
