"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Copy, TestTube, Sparkles, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DemoGuide() {
  const [showExamples, setShowExamples] = useState(false);

  const testPhrases = [
    {
      content: "Hello everyone! How are you doing today?",
      type: "Clean",
      description: "Normal, friendly message",
      status: "✅ Approved",
      icon: CheckCircle,
      color: "bg-green-500",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-green-200 dark:border-green-700"
    },
    {
      content: "I hate everyone and everything in this world!",
      type: "Toxic",
      description: "Hate speech and toxicity",
      status: "❌ Rejected",
      icon: AlertTriangle,
      color: "bg-red-500",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      borderColor: "border-red-200 dark:border-red-700"
    },
    {
      content: "Buy now! Limited time offer! Click here!",
      type: "Spam",
      description: "Promotional/spam content",
      status: "❌ Rejected",
      icon: XCircle,
      color: "bg-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      borderColor: "border-orange-200 dark:border-orange-700"
    },
    {
      content: "This is f***ing amazing!",
      type: "Profane",
      description: "Contains profanity",
      status: "❌ Rejected",
      icon: XCircle,
      color: "bg-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      borderColor: "border-purple-200 dark:border-purple-700"
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="mb-8 border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <TestTube className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  AI Moderation Demo Guide
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Test the AI moderation system with these example phrases
                </CardDescription>
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowExamples(!showExamples)}
                className="border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              >
                {showExamples ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Hide Examples
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Show Examples
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {showExamples && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-0">
                <div className="grid gap-4">
                  {testPhrases.map((phrase, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-all duration-200`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${phrase.color}`}>
                            <phrase.icon className="w-4 h-4 text-white" />
                          </div>
                          <Badge 
                            variant={phrase.type === 'Clean' ? 'default' : 'destructive'}
                            className="font-medium"
                          >
                            {phrase.type}
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {phrase.status}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm font-mono bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2">
                          &ldquo;{phrase.content}&rdquo;
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {phrase.description}
                        </p>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(phrase.content)}
                        className="text-xs hover:bg-gray-50"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy to clipboard
                      </Button>
                    </motion.div>
                  ))}
                </div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                        💡 Pro Tip
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Copy any of these phrases and paste them in the post form below to test the AI moderation system in real-time!
                      </p>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
} 