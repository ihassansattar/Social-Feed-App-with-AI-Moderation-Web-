"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function TestAuthPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Client-side user:", user);
      setUser(user);
      setLoading(false);
    } catch (error) {
      console.error("Auth error:", error);
      setLoading(false);
    }
  };

  const testApiAuth = async () => {
    try {
      const response = await fetch('/api/test-auth');
      const data = await response.json();
      console.log("API test result:", data);
      setTestResult(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("API test error:", error);
      setTestResult("Error: " + error);
    }
  };

  const testStoriesApi = async () => {
    try {
      const response = await fetch('/api/stories');
      const data = await response.json();
      console.log("Stories API result:", data);
      setTestResult(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Stories API error:", error);
      setTestResult("Error: " + error);
    }
  };

  const testDatabase = async () => {
    try {
      const response = await fetch('/api/test-db');
      const data = await response.json();
      console.log("Database test result:", data);
      setTestResult(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Database test error:", error);
      setTestResult("Error: " + error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Client-side Auth:</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {user ? `User ID: ${user.id}\nEmail: ${user.email}` : 'No user found'}
        </pre>
      </div>

      <div className="space-y-4">
        <Button onClick={testApiAuth} className="mr-4">
          Test API Authentication
        </Button>
        
        <Button onClick={testStoriesApi} className="mr-4">
          Test Stories API
        </Button>

        <Button onClick={testDatabase}>
          Test Database
        </Button>
      </div>

      {testResult && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">API Test Result:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
} 