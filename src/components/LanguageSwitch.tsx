'use client'

import { useLanguage } from '@/lib/LanguageContext'

export default function LanguageSwitch() {
  const { lang, setLang } = useLanguage()

  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
      aria-label={lang === 'en' ? 'Switch to Chinese' : 'Switch to English'}
      className="flex items-center gap-1.5 border border-[#2c2c2c] bg-[#111] px-3 py-2 text-[12px] font-black uppercase text-[#b7b7b7] transition-[background-color,border-color,color] duration-200 hover:border-[#444] hover:bg-[#181818] hover:text-white"
      title={lang === 'en' ? 'Switch to Chinese' : 'Switch to English'}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      {lang === 'en' ? 'Language' : 'Chinese'}
    </button>
  )
}
