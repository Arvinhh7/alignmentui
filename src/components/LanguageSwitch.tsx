'use client'

import { useLanguage } from '@/lib/LanguageContext'

export default function LanguageSwitch() {
  const { lang, setLang } = useLanguage()

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-all"
      title={lang === 'en' ? 'Switch to Chinese' : '切换到英文'}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      {lang === 'en' ? 'Language' : '中文'}
    </button>
  )
}
