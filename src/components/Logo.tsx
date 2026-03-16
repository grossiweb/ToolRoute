import Link from 'next/link'

interface LogoProps {
  href?: string | null
  className?: string
}

export function Logo({ href = '/', className = '' }: LogoProps) {
  // "toolroute.io" with purple dot on the period before "io"
  // Matches the brand logo: bold black text, purple accent dot
  const wordmark = (
    <span
      className={`inline-block text-xl font-[800] tracking-tight lowercase text-gray-900 ${className}`}
      aria-label="toolroute.io"
    >
      toolroute
      <span className="text-[#6C47D8]">.</span>
      io
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
