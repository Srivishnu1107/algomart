'use client'

import React from 'react'

/**
 * Horizontal scroll container with snap behavior. Used for Picked For You and similar strips.
 * @param {{ children: React.ReactNode, className?: string }} props
 */
export default function HorizontalScroller({ children, className = '' }) {
  return (
    <div
      className={`flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-2 scroll-smooth snap-x snap-mandatory ${className}`}
      style={{ scrollbarWidth: 'none' }}
    >
      {children}
    </div>
  )
}
