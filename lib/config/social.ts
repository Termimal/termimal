/**
 * Single source of truth for the brand's social-media presence.
 *
 * Add or remove a platform here and every UI surface that renders
 * <SocialIcons /> updates automatically. Never hardcode these URLs in
 * JSX — always read from this array.
 *
 * `icon` is the Simple Icons slug
 * (https://simpleicons.org/?q=instagram). It maps to
 * https://cdn.simpleicons.org/<slug>.
 */
export type SocialPlatform = {
  /** Display name (also used for the title attribute on the link). */
  name: string
  /** Outbound URL — opened in a new tab. */
  href: string
  /** Simple Icons slug. */
  icon: 'instagram' | 'facebook' | 'tiktok' | 'discord'
  /** Screen-reader label. Should describe the action, not the platform. */
  ariaLabel: string
}

export const socialLinks: ReadonlyArray<SocialPlatform> = [
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/termimal_official/',
    icon: 'instagram',
    ariaLabel: 'Follow Termimal on Instagram (opens in a new tab)',
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61568062130179',
    icon: 'facebook',
    ariaLabel: 'Follow Termimal on Facebook (opens in a new tab)',
  },
  {
    name: 'TikTok',
    href: 'https://www.tiktok.com/@termimal_official',
    icon: 'tiktok',
    ariaLabel: 'Follow Termimal on TikTok (opens in a new tab)',
  },
  {
    name: 'Discord',
    href: 'https://discord.gg/eURFDTw7yv',
    icon: 'discord',
    ariaLabel: 'Join the Termimal Discord server (opens in a new tab)',
  },
] as const
