import React from 'react';
// import { motion, AnimatePresence } from 'framer-motion';

export default function AIChatDrawer() {
  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg border-l transform translate-x-full transition-transform">
      {/* Dual-Mode AI Operator Assistant */}
      <div className="p-4 border-b">
        <h3 className="font-bold">Gemini AI Assistant</h3>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {/* Chat messages */}
      </div>
    </div>
  );
}
