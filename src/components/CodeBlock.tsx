'use client'

import { useState } from 'react'

interface CodeBlockProps {
  code: string
  label?: string
  className?: string
}

export function CodeBlock({ code, label, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`relative group ${className || ''}`}>
      {label && (
        <div className="text-xs font-semibold text-[var(--text-3)] mb-1 uppercase">{label}</div>
      )}
      <div className="relative">
        <pre className="bg-gray-900 text-[#c9d1d9] rounded-lg p-3 text-xs overflow-x-auto font-mono pr-10">
          {code}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 6,
            padding: '4px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            fontFamily: 'var(--mono)',
            color: copied ? '#22c55e' : '#9ca3af',
          }}
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  )
}
