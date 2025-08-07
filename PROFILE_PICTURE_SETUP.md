# Profile Picture Setup Guide

## Overview
This guide explains how to set up profile picture upload functionality using Supabase Storage.

## Prerequisites
- Supabase project with Storage enabled
- Supabase client configured in your Next.js app

## Setup Steps

### 1. Run Database Setup
Execute the SQL commands in `database_setup.sql` in your Supabase SQL editor:

```sql
-- This will create:
-- - profiles table with avatar_url column
-- - profiles storage bucket
-- - RLS policies for security
```

### 2. Enable Storage in Supabase
1. Go to your Supabase dashboard
2. Navigate to Storage section
3. Ensure the `profiles` bucket is created and public access is enabled

### 3. Configure Storage Policies
The SQL script automatically creates the necessary storage policies:
- Public read access to profile images
- Users can only upload/update/delete their own images
- Images are stored in `avatars/` folder with user ID prefix

## Features Implemented

### Profile Picture Upload
- Click the camera icon on the profile picture to upload
- Supports common image formats (JPEG, PNG, GIF, etc.)
- File size limit: 5MB
- Automatic file naming with user ID and timestamp

### Profile Picture Display
- Shows uploaded image if available
- Falls back to default user icon if no image
- Responsive design with proper aspect ratio

### Security
- Row Level Security (RLS) enabled
- Users can only modify their own profile data
- Storage policies prevent unauthorized access

## File Structure
```
src/
├── app/profile/page.tsx          # Profile page with upload functionality
├── lib/types.ts                  # UserProfile interface with avatar_url
└── lib/supabase.ts              # Supabase client configuration

database_setup.sql               # Database and storage setup
```

## Usage
1. Navigate to the profile page
2. Click the camera icon on your profile picture
3. Select an image file (max 5MB)
4. The image will be uploaded and displayed immediately

## Troubleshooting
- Ensure Supabase Storage is enabled in your project
- Check that the `profiles` bucket exists and is public
- Verify RLS policies are properly configured
- Check browser console for any upload errors 