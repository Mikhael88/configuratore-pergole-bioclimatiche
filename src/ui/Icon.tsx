import type { LucideIcon, LucideProps } from 'lucide-react'

type IconProps = {
  icon: LucideIcon
  size?: number
  className?: string
  strokeWidth?: LucideProps['strokeWidth']
}

export function Icon({
  icon: Lucide,
  size = 16,
  className,
  strokeWidth = 1.75
}: IconProps) {
  return (
    <Lucide
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden
    />
  )
}
