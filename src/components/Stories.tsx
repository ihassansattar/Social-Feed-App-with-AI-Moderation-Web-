/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { User, Plus, Image, Video, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ColorPicker from './ColorPicker';
import StoryViewer from './StoryViewer';

interface Story {
  id: string;
  user_id: string;
  content?: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  background_color: string;
  text_color: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export default function Stories() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [storyContent, setStoryContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState('#424242');
  const [selectedTextColor, setSelectedTextColor] = useState('white');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
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
      await fetchStories();
    };
    
    initializeData();

    const channel = supabase.channel('realtime stories').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'stories'
    }, () => {
      fetchStories();
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStories = async () => {
    try {
      // First get stories with user_id
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
  
      if (storiesError) {
        console.error('Error fetching stories:', storiesError);
        return;
      }
  
      if (!storiesData || storiesData.length === 0) {
        setStories([]);
        return;
      }
  
      // Then get user profiles for these stories
      const userIds = storiesData.map(story => story.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
  
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Return stories without profile data
        setStories(storiesData);
        return;
      }
  
      // Combine the data
      const storiesWithProfiles = storiesData.map(story => {
        const profile = profilesData?.find(p => p.id === story.user_id);
        return {
          ...story,
          profiles: profile || null
        };
      });
  
      setStories(storiesWithProfiles || []);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error('Please select an image or video file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      
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

  const handleCreateStory = async () => {
    if (!storyContent.trim() && !selectedFile) {
      toast.error('Story cannot be empty.');
      return;
    }

    setLoading(true);
    
    let mediaUrl = '';
    if (selectedFile) {
      try {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `stories/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(filePath);

        mediaUrl = publicUrl;
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error('Failed to upload media');
        setLoading(false);
        return;
      }
    }

    const storyData = {
      content: storyContent,
      media_url: mediaUrl,
      media_type: selectedFile?.type.startsWith('image/') ? 'image' : 'video',
      background_color: selectedBackgroundColor,
      text_color: selectedTextColor
    };

    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storyData),
    });

    setLoading(false);

    if (res.ok) {
      toast.success('Story created successfully!');
      setShowStoryCreator(false);
      setStoryContent('');
      setSelectedFile(null);
      setFilePreview(null);
      setSelectedBackgroundColor('#424242');
      setSelectedTextColor('white');
      await fetchStories();
    } else {
      try {
        const { error } = await res.json();
        toast.error(error || 'Failed to create story.');
      } catch {
        toast.error('An unexpected error occurred.');
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const storyDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - storyDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return storyDate.toLocaleDateString();
  };

  return (
    <div className="mb-6 bg-white rounded-lg p-4 shadow-sm">
      {/* Stories Container */}
      <div className="flex gap-2 max-w-[600px] overflow-x-auto pb-2 scrollbar-hide">
        {/* Add Story Button - Facebook Style */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-shrink-0 relative"
        >
          <div 
            className="w-28 h-48 rounded-lg cursor-pointer overflow-hidden bg-gray-100 relative"
            onClick={() => setShowStoryCreator(true)}
          >
            {/* User profile image */}
            <div className="h-full w-full">
              {currentUserProfile?.avatar_url ? (
                <img
                  src={currentUserProfile.avatar_url}
                  alt="Your profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-500" />
                </div>
              )}
            </div>
            
            {/* Add story button */}
            <div className="absolute bottom-0 left-0 right-0 bg-white p-2 flex flex-col items-center">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <p className="text-xs font-semibold mt-4 text-center">Create Story</p>
            </div>
          </div>
        </motion.div>

        {/* Existing Stories */}
        <AnimatePresence>
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0 relative"
            >
              <div 
                className="w-28 h-48 rounded-lg cursor-pointer overflow-hidden relative"
                onClick={() => {
                  setSelectedStoryIndex(index);
                  setShowStoryViewer(true);
                }}
              >
                {/* Story content (image/video/text) */}
                {story.media_url ? (
                  story.media_type === 'image' ? (
                    <img
                      src={story.media_url}
                      alt="Story"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={story.media_url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  )
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center p-2"
                    style={{ 
                      backgroundColor: story.background_color,
                      color: story.text_color
                    }}
                  >
                    <p className="text-xs text-center font-medium line-clamp-4">
                      {story.content}
                    </p>
                  </div>
                )}
                
                {/* Gradient overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent"></div>
                
                {/* User profile image */}
                <div className="absolute top-2 left-2 w-8 h-8 rounded-full overflow-hidden border-2 border-blue-500">
                  {story.profiles?.avatar_url ? (
                    <img
                      src={story.profiles.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </div>
                
                {/* User name */}
                <p className="absolute bottom-2 left-2 right-2 text-xs font-semibold text-white truncate">
                  {story.profiles?.full_name || 'Unknown'}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Story Creator Modal */}
      <AnimatePresence>
        {showStoryCreator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowStoryCreator(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center space-x-2">
                  <X 
                    className="w-5 h-5 text-gray-500 cursor-pointer" 
                    onClick={() => setShowStoryCreator(false)}
                  />
                  <h3 className="text-lg font-semibold">Create Story</h3>
                </div>
                <Button
                  onClick={handleCreateStory}
                  disabled={loading || (!storyContent.trim() && !selectedFile)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded-md"
                >
                  {loading ? 'Posting...' : 'Share'}
                </Button>
              </div>

              {/* Story Content */}
              <div className="relative">
                <div 
                  className="min-h-[400px] flex items-center justify-center"
                  style={{ 
                    backgroundColor: selectedBackgroundColor,
                    color: selectedTextColor
                  }}
                >
                  {filePreview ? (
                    <div className="relative w-full h-full">
                      {selectedFile?.type.startsWith('image/') ? (
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <video
                          src={filePreview}
                          controls
                          className="w-full h-full object-contain"
                        />
                      )}
                      <button
                        onClick={removeFile}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <textarea
                      value={storyContent}
                      onChange={(e) => setStoryContent(e.target.value)}
                      placeholder="What's on your mind?"
                      className="w-full h-full p-4 resize-none border-0 bg-transparent text-center text-xl font-medium focus:ring-0 focus:outline-none placeholder-gray-500"
                      style={{ color: selectedTextColor }}
                    />
                  )}
                </div>

                {/* Story Actions - Bottom Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-3 border-t">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-2 text-gray-700"
                    >
                      {selectedFile?.type.startsWith('image/') ? (
                        <Image className="w-5 h-5" />
                      ) : (
                        <Video className="w-5 h-5" />
                      )}
                      <span>Media</span>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowColorPicker(true)}
                      className="flex items-center space-x-2 text-gray-700"
                    >
                      <div 
                        className="w-5 h-5 rounded-full border"
                        style={{ backgroundColor: selectedBackgroundColor }}
                      />
                      <span>Background</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Story Viewer */}
      <AnimatePresence>
        {showStoryViewer && (
          <StoryViewer
            stories={stories}
            initialIndex={selectedStoryIndex}
            onClose={() => setShowStoryViewer(false)}
            // currentUserId={user?.id || ''}
          />
        )}
      </AnimatePresence>
    </div>
  );
}