'use client'

interface PlatformCardProps {
  icon: React.ReactNode
  name: string
  users: string
  description: string
  features: string[]
  accentColor?: string
}

export default function PlatformCard({
  icon,
  name,
  users,
  description,
  features,
  accentColor = 'red',
}: PlatformCardProps) {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6 hover:shadow-lg hover:border-divider transition-all relative group">
      {/* Accent dot */}
      <div className="absolute top-4 right-4 w-2 h-2 bg-ink/20 rounded-full" />

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-ink">{name}</h3>
          <p className="text-xs text-ink-3">{users}</p>
        </div>
      </div>

      <p className="text-sm text-ink-2 mb-4">{description}</p>

      <div className="space-y-2">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-ink-2">
            <svg className="w-4 h-4 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </div>
        ))}
      </div>
    </div>
  )
}
