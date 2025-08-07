// src/components/ColorPicker.tsx
"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  onClose: () => void;
}

const colors = [
  { name: 'Light Blue', value: '#E3F2FD', bg: 'bg-blue-50', border: 'border-blue-200' },
  { name: 'Light Green', value: '#E8F5E8', bg: 'bg-green-50', border: 'border-green-200' },
  { name: 'Light Yellow', value: '#FFF8E1', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { name: 'Light Pink', value: '#FCE4EC', bg: 'bg-pink-50', border: 'border-pink-200' },
  { name: 'Light Purple', value: '#F3E5F5', bg: 'bg-purple-50', border: 'border-purple-200' },
  { name: 'Light Orange', value: '#FFF3E0', bg: 'bg-orange-50', border: 'border-orange-200' },
  { name: 'Light Red', value: '#FFEBEE', bg: 'bg-red-50', border: 'border-red-200' },
  { name: 'Light Gray', value: '#F5F5F5', bg: 'bg-gray-50', border: 'border-gray-200' },
  { name: 'Dark Blue', value: '#1976D2', bg: 'bg-blue-600', border: 'border-blue-700' },
  { name: 'Dark Green', value: '#388E3C', bg: 'bg-green-600', border: 'border-green-700' },
  { name: 'Dark Purple', value: '#7B1FA2', bg: 'bg-purple-600', border: 'border-purple-700' },
  { name: 'Dark Red', value: '#D32F2F', bg: 'bg-red-600', border: 'border-red-700' },
  { name: 'Dark Orange', value: '#F57C00', bg: 'bg-orange-600', border: 'border-orange-700' },
  { name: 'Dark Gray', value: '#424242', bg: 'bg-gray-600', border: 'border-gray-700' },
  { name: 'Black', value: '#000000', bg: 'bg-black', border: 'border-gray-800' },
];

export default function ColorPicker({ selectedColor, onColorSelect, onClose }: ColorPickerProps) {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  const getTextColor = (bgColor: string) => {
    if (bgColor === 'white' || bgColor.startsWith('#F') || bgColor.startsWith('#E')) {
      return 'text-black';
    }
    return 'text-white';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Palette className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Choose Background Color</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Color Grid */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {colors.map((color) => (
              <motion.button
                key={color.value}
                onClick={() => onColorSelect(color.value)}
                onMouseEnter={() => setHoveredColor(color.value)}
                onMouseLeave={() => setHoveredColor(null)}
                className={`relative w-12 h-12 rounded-lg border-2 transition-all duration-200 ${
                  color.border
                } ${
                  selectedColor === color.value 
                    ? 'ring-2 ring-blue-500 ring-offset-2' 
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color.value }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {selectedColor === color.value && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-blue-600 rounded-full" />
                    </div>
                  </motion.div>
                )}
                
                {/* Tooltip */}
                <AnimatePresence>
                  {hoveredColor === color.value && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10"
                    >
                      {color.name}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>

          {/* Preview */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
            <div 
              className="p-4 rounded-lg border border-gray-200 min-h-[80px] flex items-center justify-center"
              style={{ 
                backgroundColor: selectedColor,
                color: getTextColor(selectedColor) === 'text-white' ? 'white' : 'black'
              }}
            >
              <p className="text-center font-medium">
                Your post will look like this
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 mt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Apply Color
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 