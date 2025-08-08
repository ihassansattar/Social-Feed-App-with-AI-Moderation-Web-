"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Home,
  LogOut,
  Menu,
  Search,
  User,
  Feather,
  Users,
  TrendingUp,
  Activity,
  BookOpen,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Array<{
    id: string;
    full_name: string;
    avatar_url?: string;
    online?: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    full_name?: string;
    avatar_url?: string;
  } | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully!");
    router.push("/login");
  };

  // Fetch following users and keep it fresh across the app
  useEffect(() => {
    // Cache helpers
    const setAndCacheFollowing = (users: Array<{ id: string; full_name: string; avatar_url?: string; online?: boolean }>) => {
      setFollowingUsers(users);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('sf_following', JSON.stringify(users));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__SF_FOLLOWING__ = users;
        }
      } catch {
        // ignore storage errors
      }
    };

    const tryLoadFromCache = (): boolean => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const globalVal = typeof window !== 'undefined' ? (window as any).__SF_FOLLOWING__ : null;
        if (globalVal && Array.isArray(globalVal)) {
          setFollowingUsers(globalVal);
          setLoading(false);
          return true;
        }
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('sf_following');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setFollowingUsers(parsed);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window as any).__SF_FOLLOWING__ = parsed;
              setLoading(false);
              return true;
            }
          }
        }
      } catch {
        // ignore cache errors
      }
      return false;
    };

    const fetchFollowingUsers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAndCacheFollowing([]);
          return;
        }

        // Get users that current user is following
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followsData && followsData.length > 0) {
          const followingIds = followsData.map(f => f.following_id);

          // Get profile data for following users
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', followingIds);

          if (profilesData) {
            const usersWithOnlineStatus = profilesData.map(profile => ({
              id: profile.id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              online: Math.random() > 0.5
            }));
            setAndCacheFollowing(usersWithOnlineStatus);
          } else {
            setAndCacheFollowing([]);
          }
        } else {
          setAndCacheFollowing([]);
        }
      } catch (error) {
        console.error('Error fetching following users:', error);
      } finally {
        setLoading(false);
      }
    };

    // Load from cache first; fall back to fetch
    const loadedFromCache = tryLoadFromCache();
    if (!loadedFromCache) void fetchFollowingUsers();

    // Listen for auth state changes (login/logout) and refresh following list
    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      void fetchFollowingUsers();
    });

    // Listen for cross-tab/local invalidation of following cache
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'sf_following_invalidate') {
        void fetchFollowingUsers();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
    }

    // Real-time subscription for follows - set up only once globally per app load
    let createdHere = false;
    try {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        if (!w.__SF_FOLLOWING_SUB__) {
          const channel = supabase.channel('following_users').on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'follows'
          }, () => {
            // Refetch and refresh cache when follows change
            void fetchFollowingUsers();
          }).subscribe();
          w.__SF_FOLLOWING_SUB__ = channel;
          createdHere = true;
        }
      }
    } catch {
      // ignore subscription errors
    }

    // Do not remove global subscription on unmount so it persists across page changes
    return () => {
      if (createdHere) {
        // keep realtime channel alive
      }
      authSub?.subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage);
      }
    };
  }, []);

  // Load current user's profile once per app load and cache it to avoid reloading on page changes
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Prefer in-memory cache if available (persists across client-side navigations)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const globalProfile = (typeof window !== 'undefined' && (window as any).__SF_PROFILE__) || null;
        if (globalProfile) {
          setCurrentUserProfile(globalProfile);
          return;
        }

        // Fallback to localStorage cache
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('sf_profile');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setCurrentUserProfile(parsed);
              // Also set global for quicker subsequent mounts
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window as any).__SF_PROFILE__ = parsed;
              return;
            } catch {
              // Ignore JSON errors and refetch
            }
          }
        }

        // Fetch from Supabase once
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile) {
          setCurrentUserProfile(profile);
          if (typeof window !== 'undefined') {
            localStorage.setItem('sf_profile', JSON.stringify(profile));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__SF_PROFILE__ = profile;
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();
  }, []);

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/feed", icon: Feather, label: "Feed" },
    { href: "/guide", icon: BookOpen, label: "Guide" },
    { href: "/rejected-posts", icon: XCircle, label: "Rejected Posts" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  const shortcuts = [
    { name: "Recent Posts", icon: Feather, href: "/recent-posts" },
    { name: "Popular", icon: TrendingUp, href: "/popular" },
    { name: "Trending", icon: Activity, href: "/trending" },
  ];

  // Use following users instead of static contacts

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation Bar - Facebook Style */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="w-full px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo and Search */}
            <div className="flex items-center space-x-4 flex-1">
              {/* Social Feed Logo */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Feather className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-blue-600 hidden lg:block">Social Feed</span>
              </div>

              {/* Search Bar */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search Social Feed"
                  className="pl-10 bg-gray-100 border-0 rounded-full w-64 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Center: Navigation Icons - Perfectly Centered */}
            <div className="absolute left-1/2 transform -translate-x-1/2 hidden lg:flex items-center space-x-1">
              <Link href="/dashboard">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`w-12 h-12 rounded-full hover:bg-gray-10 cursor-pointer ${
                    pathname === '/dashboard' ? 'bg-blue-50' : ''
                  }`}
                >
                  <Home className={`w-6 h-6 ${pathname === '/dashboard' ? 'text-blue-600' : ''}`} />
                </Button>
              </Link>
              <Link href="/feed">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`w-12 h-12 rounded-full hover:bg-gray-100 cursor-pointer   ${
                    pathname === '/feed' ? 'bg-blue-50' : ''
                  }`}
                >
                  <Feather className={`w-6 h-6 ${pathname === '/feed' ? 'text-blue-600' : ''}`} />
                </Button>
              </Link>
              <Link href="/guide">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`w-12 h-12 rounded-full hover:bg-gray-100 cursor-pointer ${
                    pathname === '/guide' ? 'bg-blue-50' : ''
                  }`}
                >
                  <BookOpen className={`w-6 h-6 ${pathname === '/guide' ? 'text-blue-600' : ''}`} />
                </Button>
              </Link>
              <Link href="/rejected-posts">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`w-12 h-12 rounded-full hover:bg-gray-100 cursor-pointer ${
                    pathname === '/rejected-posts' ? 'bg-blue-50' : ''
                  }`}
                >
                  <XCircle className={`w-6 h-6 ${pathname === '/rejected-posts' ? 'text-blue-600' : ''}`} />
                </Button>
              </Link>
              <Link href="/trending">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`w-12 h-12 rounded-full hover:bg-gray-100  cursor-pointer ${
                    pathname === '/trending' ? 'bg-blue-50' : ''
                  }`}
                >
                  <Activity className={`w-6 h-6 ${pathname === '/trending' ? 'text-blue-600' : ''}`} />
                </Button>
              </Link>
            </div>

            {/* Right: Profile and Actions */}
            <div className="flex items-center space-x-2 flex-1 justify-end">
              {/* Desktop: Show all icons except dropdown */}
              <div className="hidden lg:flex items-center space-x-2">
                {/* <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200">
                  <MessageCircle className="w-5 h-5" />
                </Button> */}
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200">
                  <Bell className="w-5 h-5" />
                </Button>
                <Link href="/profile">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 hover:opacity-90 cursor-pointer">
                    {currentUserProfile?.avatar_url ? (
                      <img src={currentUserProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </div>
                </Link>
              </div>

              {/* Mobile: Show dropdown and profile only */}
              <div className="flex lg:hidden items-center space-x-2">
                <div className="relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200"
                    onClick={() => setSidebarOpen(!isSidebarOpen)}
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                  
                  {/* Mobile Dropdown Menu */}
                  {isSidebarOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="py-2">
                        {navItems.map((item) => (
                          <Link href={item.href} key={item.href} onClick={() => setSidebarOpen(false)}>
                            <div className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                              <item.icon className="w-4 h-4 mr-3" />
                              {item.label}
                            </div>
                          </Link>
                        ))}
                        <div className="border-t border-gray-200 mt-2 pt-2">
                          <div 
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            onClick={handleLogout}
                          >
                            <LogOut className="w-4 h-4 mr-3" />
                            Logout
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Link href="/profile">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 hover:opacity-90 cursor-pointer">
                    {currentUserProfile?.avatar_url ? (
                      <img src={currentUserProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full px-4 py-4">
        <div className="mx-auto max-w-[1400px] flex gap-6 justify-center">
          {/* Left Sidebar */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide">
              {/* Navigation Menu */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <nav className="space-y-2">
                  {navItems.map((item) => (
                    <Link href={item.href} key={item.href}>
                      <Button
                        variant={pathname === item.href ? "secondary" : "ghost"}
                        className="w-full justify-start h-12"
                      >
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Shortcuts */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Your Shortcuts</h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut) => (
                    <Link href={shortcut.href} key={shortcut.name}>
                      <Button variant="ghost" className="w-full justify-start h-10">
                        <shortcut.icon className="w-5 h-5 mr-3" />
                        {shortcut.name}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Logout Button at the end of sidebar */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full justify-start h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="w-full max-w-2xl">
            {children}
          </main>

          {/* Right Sidebar */}
          <aside className="hidden xl:block w-80 flex-shrink-0">
            <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide">
              {/* Following Users */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Following</h3>
                <div className="space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : followingUsers.length === 0 ? (
                    <div className="text-center py-4">
                      <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No following yet</p>
                      <p className="text-xs text-gray-400">Follow users to see them here</p>
                    </div>
                  ) : (
                    followingUsers.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/user/${user.id}`)}
                      >
                        <div className="relative">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-white" />
                            )}
                          </div>
                          {user.online && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate block">
                            {user.full_name}
                          </span>
                          {user.online && (
                            <span className="text-xs text-green-600">Online</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Footer Links */}
              <div className="text-xs text-gray-500 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span>Privacy</span>
                  <span>•</span>
                  <span>Terms</span>
                  <span>•</span>
                  <span>Help</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span>About</span>
                  <span>•</span>
                  <span>Contact</span>
                  <span>•</span>
                  <span>Social Feed © 2025</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
} 