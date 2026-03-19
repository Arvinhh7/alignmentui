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
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-red-200 transition-all relative group">
      {/* Accent dot */}
      <div className={`absolute top-4 right-4 w-2 h-2 bg-${accentColor}-400 rounded-full`} />
      
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{name}</h3>
          <p className="text-xs text-gray-500">{users}</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">{description}</p>

      <div className="space-y-2">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </div>
        ))}
      </div>
    </div>
  )
}
