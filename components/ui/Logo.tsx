import React from "react"
import Image from "next/image"
import Link from "next/link"

type LogoProps = {
  href?: string
  size?: number
  showWordmark?: boolean
  className?: string
}

export default function Logo({
  href = "/",
  size = 32,
  showWordmark = true,
  className = "",
}: LogoProps) {
  return (
    <Link href={href} className={`flex items-center gap-2.5 shrink-0 group ${className}`.trim()}>
      <span className="relative block transition-transform duration-300 group-hover:scale-110">
        <Image
          src="/logo-dark.png"
          alt="Termimal Logo"
          width={size}
          height={size}
          className="object-contain"
          style={{ display: "var(--logo-light-theme-display)" as React.CSSProperties["display"] }}
        />
        <Image
          src="/logo-light.png"
          alt="Termimal Logo"
          width={size}
          height={size}
          className="object-contain"
          style={{ display: "var(--logo-dark-theme-display)" as React.CSSProperties["display"] }}
        />
      </span>

      {showWordmark && (
        <span
          className="text-sm font-bold transition-colors duration-200 group-hover:text-white"
          style={{ letterSpacing: "-0.02em", color: "var(--t1)" }}
        >
          Termimal
        </span>
      )}
    </Link>
  )
}
