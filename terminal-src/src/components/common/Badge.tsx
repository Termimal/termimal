// components/common/Badge.tsx
import { clsx } from 'clsx'
import type { SignalColor } from '@/types'

interface Props {
  color:    SignalColor | 'cyan' | 'orange'
  children: React.ReactNode
  title?:   string
  size?:    'sm' | 'md'
}

const colorMap: Record<string, string> = {
  green:  'badge-green',
  yellow: 'badge-yellow',
  red:    'badge-red',
  gray:   'badge-gray',
  cyan:   'badge-cyan',
  orange: 'badge-orange',
}

export function Badge({ color, children, title, size = 'sm' }: Props) {
  return (
    <span
      className={clsx('badge', colorMap[color], size === 'md' && 'text-xs px-2 py-1')}
      title={title}
    >
      {children}
    </span>
  )
}
