'use client';

import React, { useState, useEffect } from 'react';
import 'design-tokens/css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lang, setLang] = useState<'ar' | 'en'>('en');

  useEffect(() => {
    // Check local storage for language selection
    const savedLang = localStorage.getItem('max_tasks_lang') as 'ar' | 'en';
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('max_tasks_lang', lang);
  }, [lang]);

  // Hook global language toggle to window so components can trigger changes easily
  useEffect(() => {
    const handleLangToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail === 'ar' || customEvent.detail === 'en') {
        setLang(customEvent.detail);
      }
    };
    window.addEventListener('toggle-language', handleLangToggle);
    return () => window.removeEventListener('toggle-language', handleLangToggle);
  }, []);

  return (
    <html lang={lang} className="premium-grain">
      <head>
        <title>MaX Tasks — Personal Productivity Command Center</title>
        <meta name="description" content="A premium, dark themed scheduling and planner workspace for tasks, projects, calendar events, habits and markdown notes." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0B0C0F" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
