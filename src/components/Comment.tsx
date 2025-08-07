// src/components/Comment.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CommentWithAuthor } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { User, Reply, MoreHorizontal, Edit, Trash2, Send, Heart, Smile } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface CommentProps {
  comment: CommentWithAuthor;
  postId: string;
  onCommentUpdate: () => void;
  level?: number;
}

export default function Comment({ comment, postId, onCommentUpdate, level = 0 }: CommentProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState(comment.content);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchLikeStatus(comment.id, user.id);
      }
    };
    fetchUser();
  }, [comment.id]);

  const fetchLikeStatus = async (commentId: string, userId: string) => {
    try {
      const response = await fetch(`/api/comment-likes?commentId=${commentId}&userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.isLiked);
        setLikeCount(data.likeCount);
      }
    } catch (error) {
      console.error('Error fetching like status:', error);
    }
  };

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [isEditing, editContent]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return commentDate.toLocaleDateString();
  };

  const handleReply = async () => {
    if (!replyContent.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          content: replyContent,
          parentId: comment.id
        }),
      });

      if (response.ok) {
        setReplyContent('');
        setIsReplying(false);
        onCommentUpdate();
        toast.success('Reply posted successfully!');
      } else {
        const { error } = await response.json();
        toast.error(error || 'Failed to post reply');
      }
    } catch (error) {
      toast.error('Failed to post reply');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.id,
          content: editContent
        }),
      });

      if (response.ok) {
        setIsEditing(false);
        onCommentUpdate();
        toast.success('Comment updated successfully!');
      } else {
        const { error } = await response.json();
        toast.error(error || 'Failed to update comment');
      }
    } catch (error) {
      toast.error('Failed to update comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/comments?id=${comment.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onCommentUpdate();
        toast.success('Comment deleted successfully!');
      } else {
        const { error } = await response.json();
        toast.error(error || 'Failed to delete comment');
      }
    } catch (error) {
      toast.error('Failed to delete comment');
    } finally {
      setLoading(false);
      setShowOptions(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please login to like comments');
      return;
    }

    if (likeLoading) return;

    setLikeLoading(true);
    try {
      const response = await fetch('/api/comment-likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.action === 'liked');
        setLikeCount(prev => data.action === 'liked' ? prev + 1 : prev - 1);
        
        if (data.action === 'liked') {
          toast.success('Comment liked!');
        }
      } else {
        const { error } = await response.json();
        toast.error(error || 'Failed to like comment');
      }
    } catch (error) {
      toast.error('Failed to like comment');
    } finally {
      setLikeLoading(false);
    }
  };

  const isOwnComment = user?.id === comment.user_id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group hover:bg-gray-50 rounded-lg transition-colors duration-200 ${
        level > 0 ? 'ml-8 border-l border-gray-200 pl-4' : ''
      }`}
    >
      <div className="flex space-x-3 py-3 px-2">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center overflow-hidden shadow-sm">
            {comment.author?.avatar_url ? (
              <img
                src={comment.author.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
          </div>
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl px-3 py-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm text-gray-900 hover:underline cursor-pointer">
                  {comment.author?.full_name || 'Unknown User'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(comment.created_at)}
                </span>
                {comment.updated_at !== comment.created_at && (
                  <span className="text-xs text-gray-400">(edited)</span>
                )}
              </div>
              
              {isOwnComment && (
                <div className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOptions(!showOptions)}
                    className="h-6 w-6 p-0 hover:bg-gray-200 rounded-full"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                  
                  <AnimatePresence>
                    {showOptions && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditing(true);
                            setShowOptions(false);
                          }}
                          className="w-full justify-start text-sm hover:bg-gray-50"
                        >
                          <Edit className="w-3 h-3 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDelete}
                          className="w-full justify-start text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Delete
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] resize-none border border-gray-300 rounded-lg text-sm"
                  placeholder="Edit your comment..."
                />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleEdit}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-900 leading-relaxed">
                {comment.content}
              </p>
            )}
          </div>

          {/* Comment Actions */}
          {!isEditing && (
            <div className="flex items-center space-x-4 mt-2 px-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={likeLoading}
                className={`text-xs hover:bg-gray-100 rounded-full px-2 py-1 transition-colors ${
                  isLiked ? 'text-blue-600 font-medium' : 'text-gray-600'
                } ${likeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {likeLoading ? (
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                ) : (
                  <Heart className={`w-3 h-3 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                )}
                {likeCount > 0 ? likeCount : 'Like'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(!isReplying)}
                className="text-xs text-gray-600 hover:bg-gray-100 rounded-full px-2 py-1 transition-colors"
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>
              <span className="text-xs text-gray-400">
                {comment.replies_count || 0} replies
              </span>
            </div>
          )}

          {/* Reply Input */}
          <AnimatePresence>
            {isReplying && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2"
              >
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center overflow-hidden shadow-sm">
                    {comment.author?.avatar_url ? (
                      <img
                        src={comment.author.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[44px] max-h-32 resize-none border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Reply to ${comment.author?.full_name}...`}
                    />
                    <div className="flex space-x-2 mt-2">
                      <Button
                        size="sm"
                        onClick={handleReply}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                      >
                        {loading ? 'Posting...' : 'Reply'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsReplying(false);
                          setReplyContent('');
                        }}
                        className="text-xs px-3 py-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-1">
          {comment.replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              postId={postId}
              onCommentUpdate={onCommentUpdate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
} 