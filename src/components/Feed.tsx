// src/components/Feed.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Post } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Spinner from '@/components/ui/Spinner';
import { useRouter } from 'next/navigation';
import { 
  MessageCircle, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Image, 
  Smile,
  MessageSquare,
  Share,
  Palette
} from 'lucide-react';
import CommentsSection from './CommentsSection';
import ColorPicker from './ColorPicker';
import Stories from './Stories';
import toast from 'react-hot-toast';

export default function Feed() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [userReactions, setUserReactions] = useState<Map<string, string>>(new Map());
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [showComments, setShowComments] = useState<Set<string>>(new Set());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState('white');
  const [selectedTextColor, setSelectedTextColor] = useState('black');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        // Fetch current user's profile
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', user.id)
                .single();
            setCurrentUserProfile(profile);
        }
    };
    
    const initializeData = async () => {
        await fetchUser();
        await fetchPosts();
    };
    
    initializeData();

    const channel = supabase.channel('realtime posts').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts'
    }, () => {
        fetchPosts();
    }).subscribe();

    // Real-time updates for likes
    const likesChannel = supabase.channel('realtime likes').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'likes'
    }, () => {
        fetchPosts();
    }).subscribe();

    // Real-time updates for profiles
    const profilesChannel = supabase.channel('realtime profiles').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
    }, () => {
        // Refresh user profile when profiles table changes
        if (user) {
            supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', user.id)
                .single()
                .then(({ data: profile }) => {
                    setCurrentUserProfile(profile);
                });
        }
    }).subscribe();

    return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(likesChannel);
        supabase.removeChannel(profilesChannel);
    }
}, []);

const fetchPosts = async () => {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching posts:', error);
        toast.error('Failed to fetch posts.');
    } else {
        // Get current user to filter posts
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get all user profiles with avatar_url
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url');
        
        const profilesMap = new Map(profiles?.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []);
        
        // Get reactions for each post
        const { data: reactionsData } = await supabase
            .from('likes')
            .select('post_id, reaction_type, user_id');

        // Get comment counts for each post
        const { data: commentsData } = await supabase
            .from('comments')
            .select('post_id')
            .is('parent_id', null); // Only count top-level comments

        const reactionsCountMap = new Map<string, { like: number; love: number; haha: number; wow: number; sad: number; angry: number; care: number }>();
        const userReactionsMap = new Map<string, string>();
        const commentCountMap = new Map<string, number>();

        if (reactionsData) {
            reactionsData.forEach(reaction => {
                // Count reactions
                const current = reactionsCountMap.get(reaction.post_id) || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0, care: 0 };
                if (reaction.reaction_type in current) {
                    current[reaction.reaction_type as keyof typeof current]++;
                }
                reactionsCountMap.set(reaction.post_id, current);

                // Track current user's reactions
                if (user && reaction.user_id === user.id) {
                    userReactionsMap.set(reaction.post_id, reaction.reaction_type);
                }
            });
        }

        // Count comments
        if (commentsData) {
            commentsData.forEach(comment => {
                const current = commentCountMap.get(comment.post_id) || 0;
                commentCountMap.set(comment.post_id, current + 1);
            });
        }

        setUserReactions(userReactionsMap);
        
        const postsWithAuthors = data.map((post) => {
            const profile = profilesMap.get(post.user_id);
            return {
                ...post,
                author: {
                    full_name: profile?.full_name || 'Unknown User',
                    avatar_url: profile?.avatar_url
                },
                user_reaction: userReactionsMap.get(post.id) as 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'care' | undefined,
                reactions_count: reactionsCountMap.get(post.id) || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0, care: 0 },
                comments_count: commentCountMap.get(post.id) || 0
            };
        });
        
        // Filter posts: show only approved posts (rejected posts are completely hidden)
        const filteredPosts = postsWithAuthors.filter(post => 
            post.status === 'approved'
        );
        
        setPosts(filteredPosts as Post[]);
    }
};

const handleLike = async (postId: string) => {
    if (!user) {
        toast.error('Please login to like posts');
        return;
    }

    const currentReaction = userReactions.get(postId);
    
    try {
        if (currentReaction) {
            // Remove any existing reaction
            const { error } = await supabase
                .from('likes')
                .delete()
                .eq('user_id', user.id)
                .eq('post_id', postId);

            if (error) throw error;

            setUserReactions(prev => {
                const newMap = new Map(prev);
                newMap.delete(postId);
                return newMap;
            });

            // Update posts
            setPosts(prev => prev.map(post => 
                post.id === postId 
                    ? { ...post, user_reaction: undefined }
                    : post
            ));

            // Reaction removed silently
        } else {
            // Add new like
            const { error } = await supabase
                .from('likes')
                .insert({
                    user_id: user.id,
                    post_id: postId,
                    reaction_type: 'like'
                });

            if (error) throw error;

            setUserReactions(prev => new Map(prev).set(postId, 'like'));

            // Update posts
            setPosts(prev => prev.map(post => 
                post.id === postId 
                    ? { ...post, user_reaction: 'like' as 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'care' }
                    : post
            ));

            // Like added silently
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        toast.error('Failed to update like');
    }
};

const handleReaction = async (postId: string, reactionType: string) => {
    if (!user) {
        toast.error('Please login to react to posts');
        return;
    }

    try {
        // Check if user already has a reaction
        const { data: existingReaction } = await supabase
            .from('likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('post_id', postId)
            .single();

        if (existingReaction) {
            // Update existing reaction
            const { error } = await supabase
                .from('likes')
                .update({ reaction_type: reactionType })
                .eq('user_id', user.id)
                .eq('post_id', postId);

            if (error) throw error;
        } else {
            // Insert new reaction
            const { error } = await supabase
                .from('likes')
                .insert({
                    user_id: user.id,
                    post_id: postId,
                    reaction_type: reactionType
                });

            if (error) throw error;
        }

        setUserReactions(prev => new Map(prev).set(postId, reactionType));

        // Update posts
        setPosts(prev => prev.map(post => 
            post.id === postId 
                ? { ...post, user_reaction: reactionType as 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'care' }
                : post
        ));

        // Reaction updated silently
        setShowReactionPicker(null);
    } catch (error) {
        console.error('Error updating reaction:', error);
        toast.error('Failed to update reaction');
    }
};

const handleLongPress = (postId: string) => {
    setShowReactionPicker(postId);
};

const handleMouseDown = (postId: string) => {
    const timer = setTimeout(() => {
        handleLongPress(postId);
    }, 500); // 500ms long press
    setLongPressTimer(timer);
};

const handleMouseUp = () => {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
    }
};

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error('Please select an image or video file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    setShowEmojiPicker(false);
  };

  const handleSubmitPost = async () => {
    if (!newPostContent.trim() && !selectedFile) {
      toast.error('Post cannot be empty.');
      return;
    }

    setLoading(true);
    
    let mediaUrl = '';
    if (selectedFile) {
      try {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `posts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        mediaUrl = publicUrl;
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error('Failed to upload media');
        setLoading(false);
        return;
      }
    }

    const postData = {
      content: newPostContent,
      title: postTitle,
      media_url: mediaUrl,
      media_type: selectedFile?.type.startsWith('image/') ? 'image' : 'video',
      feeling: selectedEmoji,
      background_color: selectedBackgroundColor,
      text_color: selectedTextColor
    };

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    });

    setLoading(false);

    if (res.ok) {
      const newPost = await res.json();
      
      // Add user profile information to the new post
      const postWithAuthor = {
        ...newPost,
        author: {
          full_name: currentUserProfile?.full_name || user?.email?.split('@')[0] || 'Unknown User',
          avatar_url: currentUserProfile?.avatar_url
        },
        user_reaction: undefined,
        reactions_count: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0, care: 0 },
        comments_count: 0
      };
      
      setPosts([postWithAuthor, ...posts]);
      setNewPostContent('');
      setPostTitle('');
      setSelectedFile(null);
      setFilePreview(null);
      setSelectedEmoji('');
      setSelectedBackgroundColor('white');
      setSelectedTextColor('black');
      
      // Show different messages based on post status
      if (newPost.status === 'approved') {
        toast.success('✅ Post published successfully!');
      } else if (newPost.status === 'rejected') {
        toast.error('🚫 Post was rejected due to inappropriate content.');
      }
    } else {
      try {
        const { error } = await res.json();
        toast.error(error || 'Failed to submit post.');
      } catch {
        toast.error('An unexpected error occurred.');
      }
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
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
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
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return postDate.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Stories Section */}
      <Stories />
      
      {/* Create Post Section - Facebook Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            {/* Post Input */}
            <div className="flex items-start space-x-3 mb-4">
              <div 
                className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => router.push(`/profile`)}
              >
                {currentUserProfile?.avatar_url ? (
                  <img
                    src={currentUserProfile.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div 
                  className="min-h-[60px] rounded-2xl px-4 py-3 text-base transition-all duration-200"
                  style={{ 
                    backgroundColor: selectedBackgroundColor,
                    color: selectedTextColor
                  }}
                >
                  <Textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder={`What's on your mind, ${currentUserProfile?.full_name}?`}
                    className="min-h-[60px] resize-none border-0 bg-transparent text-base focus:ring-0 focus:outline-none placeholder-gray-500"
                    style={{ color: selectedTextColor }}
                  />
                </div>
                
                {/* Title Input for Media Posts */}
                {selectedFile && (
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="Add a title for your post..."
                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}

                {/* File Preview */}
                {filePreview && (
                  <div className="mt-3 relative">
                    <div className="relative inline-block">
                      {selectedFile?.type.startsWith('image/') ? (
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="max-w-full max-h-48 rounded-lg"
                        />
                      ) : (
                        <video
                          src={filePreview}
                          controls
                          className="max-w-full max-h-48 rounded-lg"
                        />
                      )}
                      <button
                        onClick={removeFile}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {/* Selected Feeling */}
                {selectedEmoji && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-lg">{selectedEmoji}</span>
                    <span className="text-sm text-gray-600">feeling</span>
                    <button
                      onClick={() => setSelectedEmoji('')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Post Actions */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center space-x-2 text-gray-600 hover:bg-gray-100"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="w-5 h-5 text-green-500" />
                    <span>Photo/Video</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center space-x-2 text-gray-600 hover:bg-gray-100"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="w-5 h-5 text-yellow-500" />
                    <span>Feeling</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center space-x-2 text-gray-600 hover:bg-gray-100"
                    onClick={() => setShowColorPicker(true)}
                  >
                    <Palette className="w-5 h-5 text-purple-500" />
                    <span>Background</span>
                  </Button>
                </div>
                <Button 
                  onClick={handleSubmitPost} 
                  disabled={loading || (!newPostContent.trim() && !selectedFile)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 rounded-lg"
                >
                  {loading ? (
                    <Spinner />
                  ) : (
                    'Post'
                  )}
                </Button>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { emoji: '😊', name: 'Happy' },
                      { emoji: '😂', name: 'Amused' },
                      { emoji: '😍', name: 'Loved' },
                      { emoji: '🥰', name: 'Blessed' },
                      { emoji: '😎', name: 'Cool' },
                      { emoji: '🤔', name: 'Thoughtful' },
                      { emoji: '😢', name: 'Sad' },
                      { emoji: '😡', name: 'Angry' },
                      { emoji: '🎉', name: 'Celebratory' },
                      { emoji: '❤️', name: 'Loved' },
                      { emoji: '👍', name: 'Positive' },
                      { emoji: '👎', name: 'Negative' },
                      { emoji: '🔥', name: 'Excited' },
                      { emoji: '💯', name: 'Amazed' },
                      { emoji: '✨', name: 'Magical' },
                      { emoji: '🌟', name: 'Starstruck' }
                    ].map((item) => (
                      <button
                        key={item.emoji}
                        onClick={() => handleEmojiSelect(item.emoji)}
                        className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <span className="text-2xl">{item.emoji}</span>
                        <span className="text-xs text-gray-600">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Color Picker Modal */}
        {showColorPicker && (
          <ColorPicker
            selectedColor={selectedBackgroundColor}
            onColorSelect={(color) => {
              setSelectedBackgroundColor(color);
              setSelectedTextColor(color === 'white' || color.startsWith('#F') || color.startsWith('#E') ? 'black' : 'white');
            }}
            onClose={() => setShowColorPicker(false)}
          />
        )}
      </motion.div>

      {/* Feed Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AnimatePresence>
          {posts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No posts yet. Be the first to share something!</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 ${
                    post.status === 'rejected' ? 'border-red-200 bg-red-50' : ''
                  }`}
                >
                  {/* Post Header */}
                  <div className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => router.push(`/user/${post.user_id}`)}
                        >
                          {post.author?.avatar_url ? (
                            <img
                              src={post.author.avatar_url}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {post.author?.full_name}
                          </p>
                          <p className="text-xs text-gray-500">
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

                  {/* Feeling Display - Facebook Style */}
                  {post.feeling && (
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                      
                        <span>
                          <span className="font-semibold text-black text-lg">{post.author?.full_name}</span> <span className=" ml-1 text-black">is</span>   <span className="text-lg">{post.feeling}</span> <span className='text-black'> feeling </span>
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
                        {/* Content */}
                        <div className="flex items-center justify-center">
                        </div>
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
                                {post.comments_count || 0} comments • 0 shares
                              </span>
                            </div>
                          </div>

                      {/* Post Actions */}
                      <div className="px-4 py-2 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="relative flex-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleLike(post.id)}
                              onMouseDown={() => handleMouseDown(post.id)}
                              onMouseUp={handleMouseUp}
                              onMouseLeave={handleMouseUp}
                              className={`flex items-center space-x-2 w-full justify-center py-2 transition-colors ${
                                post.user_reaction 
                                  ? 'text-blue-600 hover:bg-blue-50 font-medium' 
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <span className="text-lg">
                                {post.user_reaction === 'like' && '👍'}
                                {post.user_reaction === 'love' && '❤️'}
                                {post.user_reaction === 'haha' && '😂'}
                                {post.user_reaction === 'wow' && '😮'}
                                {post.user_reaction === 'sad' && '😢'}
                                {post.user_reaction === 'angry' && '😡'}
                                {post.user_reaction === 'care' && '🤗'}
                                {!post.user_reaction && '👍'}
                              </span>
                              <span className="font-medium">{post.user_reaction ? post.user_reaction.charAt(0).toUpperCase() + post.user_reaction.slice(1) : 'Like'}</span>
                            </Button>
                            
                            {/* Reaction Picker */}
                            {showReactionPicker === post.id && (
                              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-full shadow-xl p-2 z-10">
                                <div className="flex space-x-1">
                                  {[
                                    { type: 'like', emoji: '👍', color: 'hover:bg-gray-100', label: 'Like' },
                                    { type: 'love', emoji: '❤️', color: 'hover:bg-red-50', label: 'Love' },
                                    { type: 'haha', emoji: '😂', color: 'hover:bg-orange-50', label: 'Haha' },
                                    { type: 'wow', emoji: '😮', color: 'hover:bg-purple-50', label: 'Wow' },
                                    { type: 'sad', emoji: '😢', color: 'hover:bg-blue-50', label: 'Sad' },
                                    { type: 'angry', emoji: '😡', color: 'hover:bg-red-50', label: 'Angry' },
                                    { type: 'care', emoji: '🤗', color: 'hover:bg-green-50', label: 'Care' }
                                  ].map((reaction) => (
                                    <button
                                      key={reaction.type}
                                      onClick={() => handleReaction(post.id, reaction.type)}
                                      className={`w-10 h-10 text-xl rounded-full transition-all transform hover:scale-125 ${reaction.color} ${
                                        post.user_reaction === reaction.type ? 'ring-2 ring-blue-500 scale-110' : ''
                                      }`}
                                      title={reaction.label}
                                    >
                                      {reaction.emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              const newShowComments = new Set(showComments);
                              if (newShowComments.has(post.id)) {
                                newShowComments.delete(post.id);
                              } else {
                                newShowComments.add(post.id);
                              }
                              setShowComments(newShowComments);
                            }}
                            className={`flex items-center space-x-2 flex-1 justify-center py-2 transition-colors duration-200 ${
                              showComments.has(post.id) 
                                ? 'text-blue-600 bg-blue-50 font-medium' 
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <MessageSquare className={`w-4 h-4 ${showComments.has(post.id) ? 'text-blue-600' : ''}`} />
                            <span>{showComments.has(post.id) ? 'Hide Comments' : 'Comment'}</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center space-x-2 flex-1 justify-center py-2 text-gray-600 hover:bg-gray-50">
                            <Share className="w-4 h-4" />
                            <span>Share</span>
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Comments Section */}
                  <AnimatePresence>
                    {showComments.has(post.id) && post.status === 'approved' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <CommentsSection 
                          postId={post.id} 
                          currentUserProfile={currentUserProfile}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Rejection Details */}
                  {post.status === 'rejected' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="px-4 pb-4"
                    >
                      <div className="p-3 bg-red-100 rounded-lg border border-red-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-red-800 text-sm mb-1">
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
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
