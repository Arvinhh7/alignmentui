'use client'

import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
}

export default function Logo({
  size = 'md',
  className = '',
}: LogoProps) {
  const sizeMap = {
    sm: { width: 120, height: 40 },
    md: { width: 160, height: 53 },
    lg: { width: 200, height: 67 },
    xl: { width: 280, height: 93 },
  }

  const { width, height } = sizeMap[size]

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/logo-white.svg"
        alt="Alignment AI"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
    </div>
  )
}

interface LogoIconProps {
  size?: number
  className?: string
}

export function LogoIcon({ size = 40, className = '' }: LogoIconProps) {
  return (
    <Image
      src="/logo-icon.png"
      alt="Alignment AI"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      priority
    />
  )
}

interface LogoFullProps {
  width?: number
  height?: number
  className?: string
}

export function LogoFull({ width = 180, height = 120, className = '' }: LogoFullProps) {
  return (
    <Image
      src="/logo-white.svg"
      alt="Alignment AI"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority
    />
  )
}
