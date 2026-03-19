'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Language, getTranslation } from './i18n'

type LanguageContextType = {
  lang: Language
  setLang: (lang: Language) => void
  t: ReturnType<typeof getTranslation>
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('en')

  useEffect(() => {
    // Load saved language preference
    const saved = localStorage.getItem('lang') as Language
    if (saved && (saved === 'en' || saved === 'zh')) {
      setLang(saved)
    }
  }, [])

  const handleSetLang = (newLang: Language) => {
    setLang(newLang)
    localStorage.setItem('lang', newLang)
  }

  const t = getTranslation(lang)

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
