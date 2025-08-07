"use client";

import { useState, useEffect } from 'react';

const loadingMessages = [
  "Analyzing your requirements...",
  "Drafting legal clauses...",
  "Reviewing contract terms...", 
  "Ensuring legal compliance...",
  "Finalizing your contract...",
  "Almost ready..."
];

export function AnimatedLoading() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        setFade(true);
      }, 300);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Main Loading Animation */}
      <div className="relative">
        {/* Pulsing Circle */}
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        
        {/* Inner Dot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
      </div>
      
      {/* Animated Text */}
      <div className="mt-8 text-center">
        <div 
          className={`text-lg font-medium text-gray-700 transition-opacity duration-300 ${
            fade ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {loadingMessages[currentMessageIndex]}
        </div>
        
        {/* Progress Dots */}
        <div className="flex justify-center space-x-1 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 200}ms`,
                animationDuration: '1.4s'
              }}
            ></div>
          ))}
        </div>
      </div>
      
      {/* Subtitle */}
      <div className="mt-4 text-sm text-gray-500 text-center max-w-md">
        We're generating your custom contract using AI. This usually takes just a moment.
      </div>
    </div>
  );
}