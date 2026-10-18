import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export const SpinIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 4v5h-5" />
  </svg>
)

export const StopIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
  </svg>
)

export const SkipIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m5 5 7 7-7 7" />
    <path d="m13 5 7 7-7 7" />
  </svg>
)

export const BoltIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </svg>
)

export const AutoIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
)

export const InfoIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
)

export const SoundOnIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
)

export const SoundOffIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="m22 9-6 6" />
    <path d="m16 9 6 6" />
  </svg>
)

export const FullscreenIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
)

export const CloseIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)
