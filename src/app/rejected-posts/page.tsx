/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Post } from '@/lib/types';
import { 
  User, 
  AlertTriangle, 
  XCircle, 
  Trash2,
  Edit,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function RejectedPostsPage() {
  const [rejectedPosts, setRejectedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    fetchRejectedPosts();
  }, []);

  const fetchRejectedPosts = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to view rejected posts');
        return;
      }
      setUser(user);

      // Get user's rejected posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching rejected posts:', postsError);
        toast.error('Failed to fetch rejected posts');
        return;
      }

      // Get user profile for author info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      const postsWithAuthor = postsData.map((post) => ({
        ...post,
        author: {
          full_name: profile?.full_name || 'You',
          avatar_url: profile?.avatar_url
        }
      }));

      setRejectedPosts(postsWithAuthor as Post[]);
    } catch (error) {
      console.error('Error fetching rejected posts:', error);
      toast.error('Failed to load rejected posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        throw error;
      }

      setRejectedPosts(prev => prev.filter(post => post.id !== postId));
      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const getRejectionReason = (post: Post) => {
    const reasons = [];
    if (post.moderation_result?.isToxic) reasons.push('Toxicity or hate speech');
    if (post.moderation_result?.isSpam) reasons.push('Spam or promotional content');
    if (post.moderation_result?.isProfane) reasons.push('Profanity or inappropriate language');
    return reasons;
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

  return (
    <AppLayout>
      <div className="flex gap-6 w-full">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="space-y-6">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-24 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        Rejected Posts
                      </h1>
                      <p className="text-gray-600">
                        Posts that were rejected due to content policy violations
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Rejected Posts List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <AnimatePresence>
                {rejectedPosts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No Rejected Posts</h2>
                    <p className="text-gray-600">You don&apos;t have any rejected posts.</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {rejectedPosts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-lg shadow-sm border border-red-200"
                      >
                        {/* Post Header */}
                        <div className="p-4 pb-2">
                          <div className="flex items-center justify-between">
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
                                  {formatTimeAgo(post.created_at)} • <span className="text-red-600">Rejected</span>
                                </p>
                              </div>
                            </div>
                            <Badge className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-800 border-red-200">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </Badge>
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="px-4 pb-4">
                          {/* Title */}
                          {post.title && (
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {post.title}
                            </h3>
                          )}
                          
                          {/* Content with Feeling */}
                          <div className="flex items-start space-x-2 mb-3">
                            {post.feeling && (
                              <span className="text-2xl">{post.feeling}</span>
                            )}
                            <p className="text-gray-900 text-sm leading-relaxed">
                              {post.content}
                            </p>
                          </div>

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

                          {/* Rejection Details */}
                          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-red-800 text-sm mb-1">
                                  Content Policy Violation
                                </p>
                                <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                                  {getRejectionReason(post).map((reason, idx) => (
                                    <li key={idx}>{reason}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-4 flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePost(post.id)}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-gray-600 border-gray-200 hover:bg-gray-50"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit & Resubmit
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 flex-shrink-0 hidden xl:block">
          <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide">
            {/* Info Card */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span>About Rejected Posts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>
                    Posts are rejected when they violate our community guidelines.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Toxicity or hate speech</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Spam or promotional content</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Profanity or inappropriate language</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Rejected Posts</span>
                    <span className="font-semibold text-red-600">{rejectedPosts.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span className="font-semibold text-gray-900">
                      {rejectedPosts.filter(post => {
                        const postDate = new Date(post.created_at);
                        const now = new Date();
                        return postDate.getMonth() === now.getMonth() && 
                               postDate.getFullYear() === now.getFullYear();
                      }).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Tips for Better Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Be respectful and kind to others</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Avoid promotional or spam content</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Use appropriate language</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Share meaningful content</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
} 