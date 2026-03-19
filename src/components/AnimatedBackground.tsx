'use client'

import { useEffect, useState } from 'react'

interface Dot {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  delay: number
}

export default function AnimatedBackground() {
  const [dots, setDots] = useState<Dot[]>([])

  useEffect(() => {
    // Generate random dots
    const generatedDots: Dot[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 8 + 4,
      opacity: Math.random() * 0.5 + 0.2,
      delay: Math.random() * 5,
    }))
    setDots(generatedDots)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-red-50/30 to-white" />
      
      {/* Animated dots */}
      {dots.map((dot) => (
        <div
          key={dot.id}
          className="absolute rounded-full bg-red-400 animate-pulse"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            opacity: dot.opacity,
            animationDelay: `${dot.delay}s`,
            animationDuration: '3s',
          }}
        />
      ))}

      {/* Connection lines (decorative) */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="10%" y1="20%" x2="30%" y2="40%" stroke="url(#lineGradient)" strokeWidth="1" />
        <line x1="70%" y1="10%" x2="90%" y2="30%" stroke="url(#lineGradient)" strokeWidth="1" />
        <line x1="20%" y1="60%" x2="40%" y2="80%" stroke="url(#lineGradient)" strokeWidth="1" />
        <line x1="60%" y1="50%" x2="80%" y2="70%" stroke="url(#lineGradient)" strokeWidth="1" />
      </svg>
    </div>
  )
}
