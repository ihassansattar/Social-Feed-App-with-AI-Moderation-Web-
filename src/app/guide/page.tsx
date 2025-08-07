"use client";

import { motion } from 'framer-motion';
import AppLayout from "@/components/AppLayout";
import DemoGuide from "@/components/DemoGuide";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Lightbulb, Shield, Zap, Users, Globe, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function GuidePage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header - Facebook Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
        >
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                AI Moderation Guide
              </h1>
              <p className="text-gray-600 mb-3">
                Learn how our AI moderation system works and test it with example content. 
                Understand what content gets approved, rejected, or flagged.
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Globe className="w-4 h-4" />
                  <span>Public Guide</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>For Everyone</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Demo Guide Component */}
        <DemoGuide />

        {/* Features Section - Facebook Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span>How AI Moderation Works</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Content Safety</h3>
                  <p className="text-sm text-gray-600">
                    Our AI analyzes posts for harmful content, hate speech, and inappropriate language to keep the community safe.
                  </p>
                </div>
                
                <div className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Real-time Analysis</h3>
                  <p className="text-sm text-gray-600">
                    Posts are analyzed instantly using advanced AI models to detect toxicity, spam, and profanity.
                  </p>
                </div>
                
                <div className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                    <Lightbulb className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Smart Decisions</h3>
                  <p className="text-sm text-gray-600">
                    The system makes intelligent decisions about content approval while maintaining freedom of expression.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Guidelines Section - Facebook Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Community Guidelines</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-800 mb-2 flex items-center space-x-2">
                      <span>✅ Approved Content</span>
                    </h4>
                    <p className="text-sm text-green-700 mb-2">
                      Friendly conversations, helpful information, positive discussions, and constructive feedback.
                    </p>
                    <div className="text-xs text-green-600">
                      • Respectful communication • Helpful information • Positive discussions • Constructive feedback
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-800 mb-2 flex items-center space-x-2">
                      <span>❌ Rejected Content</span>
                    </h4>
                    <p className="text-sm text-red-700 mb-2">
                      Hate speech, toxicity, spam, profanity, harassment, and inappropriate content.
                    </p>
                    <div className="text-xs text-red-600">
                      • Hate speech • Toxicity • Spam content • Profanity • Harassment • Inappropriate content
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA Section - Facebook Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Ready to Test the System?
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Go to the feed page and try posting some content to see how our AI moderation works in real-time!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => window.location.href = '/feed'}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium"
                  >
                    Go to Feed
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/dashboard'}
                    className="border-gray-300 hover:bg-gray-50 px-8 py-3 rounded-lg font-medium"
                  >
                    Back to Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
} 