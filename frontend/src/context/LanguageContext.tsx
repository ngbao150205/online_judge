import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'vi' | 'en';

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
  t: (viText: string, enText: string) => string; // Hàm dịch nhanh
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'vi';
  });

  const toggleLang = () => {
    const nextLang = lang === 'vi' ? 'en' : 'vi';
    setLang(nextLang);
    localStorage.setItem('lang', nextLang);
  };

  // Hàm t() giúp viết mã ngắn gọn: t('Trang chủ', 'Home')
  const t = (viText: string, enText: string) => (lang === 'vi' ? viText : enText);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage phải được sử dụng bên trong LanguageProvider');
  }
  return context;
};