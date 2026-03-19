import Link from 'next/link'

interface LogoProps {
  href?: string | null
  className?: string
}

export function Logo({ href = '/', className = '' }: LogoProps) {
  // "toolroute." with brand purple dot — matches the official logo
  const wordmark = (
    <span
      className={`inline-block text-xl font-[800] tracking-tight lowercase text-gray-900 ${className}`}
      aria-label="toolroute"
    >
      toolroute
      <span className="text-brand">.</span>
    </span>
  )

  if (href) {
    return (
      <Link href={href} className="flex items-center gap-2">
        {wordmark}
      </Link>
    )
  }

  return wordmark
}
