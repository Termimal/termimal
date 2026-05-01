import Image from 'next/image'
import { socialLinks } from '@/lib/config/social'

interface SocialIconsProps {
  /** Icon size in px. Default 20. */
  size?: number
  /** Extra classes on the wrapping <ul>. */
  className?: string
  /** Extra classes on each <li> link wrapper. */
  iconClassName?: string
}

/**
 * Horizontal row of brand-accurate social-media icons.
 *
 * Icons come from the Simple Icons CDN (cdn.simpleicons.org) — single,
 * monochrome SVGs that we tint via CSS filters so they read on both
 * light and dark themes without per-theme assets.
 *
 * Each link:
 *   - opens in a new tab (target="_blank")
 *   - sets rel="noopener noreferrer" (security)
 *   - has an aria-label describing the action (a11y)
 *   - has a 44×44 minimum touch target via padding (a11y / mobile)
 *   - has a visible focus-visible ring
 *   - hovers up slightly (scale 1.1, 150 ms)
 *
 * The list of platforms is read from `lib/config/social.ts` — this
 * component never mentions any URL itself.
 */
export default function SocialIcons({
  size = 20,
  className = '',
  iconClassName = '',
}: SocialIconsProps) {
  return (
    <ul
      className={`flex flex-wrap items-center gap-1 ${className}`}
      // gap-1 (4px) on the <ul> + 10px padding inside each <a> gives
      // ~24px visual space between icons while keeping the entire
      // padded box the focusable / tap target.
    >
      {socialLinks.map((s) => (
        <li key={s.name} className="flex">
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.ariaLabel}
            title={s.name}
            className={`social-icon-link inline-flex items-center justify-center rounded-md transition-transform duration-150 ease-out hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${iconClassName}`}
            style={{
              // 10px padding on every side: 20 (icon) + 20 (padding) = 40,
              // raised to 44 by the min-w/min-h below so we hit the WCAG
              // tap-target floor on mobile.
              padding: 10,
              minWidth: 44,
              minHeight: 44,
              outlineColor: 'var(--acc)',
            }}
          >
            <Image
              src={`https://cdn.simpleicons.org/${s.icon}`}
              alt=""
              width={size}
              height={size}
              unoptimized
              // alt="" because the surrounding <a> already carries an
              // aria-label — exposing the icon as a separate text
              // alternative would announce it twice.
              className="social-icon"
              style={{
                width: size,
                height: size,
              }}
            />
          </a>
        </li>
      ))}
    </ul>
  )
}
