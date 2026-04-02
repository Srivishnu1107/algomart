'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * Reusable section header for homepage sections.
 * @param {string}  title      – Section title
 * @param {string}  [subtitle] – Optional subtitle / description
 * @param {*}       [icon]     – Optional emoji or icon after title
 * @param {string}  [href]     – If set, renders a ">" arrow link next to the title
 * @param {boolean} [alignRight]
 */
export default function SectionTitle({
  title,
  subtitle,
  icon,
  href,
  alignRight = false,
}) {
  return (
    <div className={alignRight ? 'w-full' : ''}>
      <div className={alignRight ? 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3' : ''}>
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-100 tracking-tight">
              {title}
              {icon != null && (
                <span className="inline-block ml-2 text-2xl align-middle" aria-hidden>
                  {icon}
                </span>
              )}
            </h2>
            {href && (
              <Link
                href={href}
                className="text-zinc-500 hover:text-white transition-colors ml-1"
                aria-label={`View all ${title}`}
              >
                <ChevronRight size={24} strokeWidth={2.5} />
              </Link>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-zinc-500 max-w-xl">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}
