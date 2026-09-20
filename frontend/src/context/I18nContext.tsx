'use client';

/**
 * VidSnap.AI Lightweight Multi-Language (i18n) Provider
 * Supports English (en), Hindi (hi - हिन्दी), and Spanish (es - Español).
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Locale = 'en' | 'hi' | 'es';

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
    es: string;
  };
}

export const translations: Translations = {
  // Navigation
  navHome: { en: 'Home', hi: 'होम', es: 'Inicio' },
  navCreate: { en: 'Create Reel', hi: 'रील बनाएं', es: 'Crear Reel' },
  navGallery: { en: 'My Gallery', hi: 'मेरी गैलरी', es: 'Mi Galería' },
  navFeedback: { en: 'Feedback', hi: 'फीडबैक', es: 'Comentarios' },
  navAdmin: { en: 'Admin Portal', hi: 'एडमिन पोर्टल', es: 'Panel Admin' },
  navLogin: { en: 'Login', hi: 'लॉग इन', es: 'Iniciar Sesión' },
  navSignUp: { en: 'Sign Up Free', hi: 'साइन अप करें', es: 'Registrarse Gratis' },
  navLogout: { en: 'Logout', hi: 'लॉगआउट', es: 'Cerrar Sesión' },
  navProfile: { en: 'Profile', hi: 'प्रोफ़ाइल', es: 'Perfil' },
  tokensLeft: { en: 'tokens', hi: 'टोकन', es: 'tokens' },

  // Hero / Landing
  heroBadge: { en: 'Free-Tier AI Social Studio', hi: 'फ्री-टियर एआई सोशल स्टूडियो', es: 'Estudio Social de IA Gratuito' },
  heroTitle: { en: 'Turn Images & Stories into Viral Reels', hi: 'फ़ोटो और कहानियों को वायरल रील्स में बदलें', es: 'Convierte Imágenes e Historias en Reels Virales' },
  heroSubtitle: {
    en: 'Supercharged with AI voiceovers, blurred 9:16 vertical canvas, and instant export. 100% free infrastructure.',
    hi: 'एआई वॉयसओवर, धुंधले 9:16 कैनवास और तत्काल निर्यात के साथ संचालित। 100% मुफ़्त इंफ्रास्ट्रक्चर।',
    es: 'Potenciado con doblajes de IA, lienzo vertical 9:16 difuminado y exportación instantánea. Infraestructura 100% gratuita.',
  },
  ctaCreateNow: { en: 'Create a Reel (Free)', hi: 'रील बनाएं (मुफ़्त)', es: 'Crear un Reel (Gratis)' },
  ctaExploreGallery: { en: 'Explore Gallery', hi: 'गैलरी देखें', es: 'Explorar Galería' },

  // Studio / Create
  studioTitle: { en: 'AI Reel Studio', hi: 'एआई रील स्टूडियो', es: 'Estudio de Reels IA' },
  studioSubtitle: { en: 'Select 1 to 5 images, craft your narrative, and let our media worker render a 720p reel.', hi: '1 से 5 फ़ोटो चुनें, अपनी कहानी लिखें, और रील तैयार करें।', es: 'Elige de 1 a 5 imágenes, escribe tu historia y genera tu reel en 720p.' },
  uploadImagesHeading: { en: '1. Upload Images (1 to 5)', hi: '1. तस्वीरें अपलोड करें (1 से 5)', es: '1. Subir Imágenes (1 a 5)' },
  dragDropText: { en: 'Drag and drop images here, or click to browse', hi: 'यहाँ फ़ोटो खींचें या चुनने के लिए क्लिक करें', es: 'Arrastra imágenes aquí o haz clic para buscar' },
  scriptHeading: { en: '2. Voiceover Script', hi: '2. वॉयसओवर स्क्रिप्ट', es: '2. Guion de Doblaje' },
  scriptPlaceholder: { en: 'Write a punchy script for your vertical reel (up to 900 characters)...', hi: 'अपनी रील के लिए एक आकर्षक कहानी लिखें (900 अक्षरों तक)...', es: 'Escribe un guion dinámico para tu reel (hasta 900 caracteres)...' },
  voiceHeading: { en: '3. Voice & Timing', hi: '3. आवाज़ और समय', es: '3. Voz y Tiempo' },
  durationLabel: { en: 'Seconds per slide', hi: 'प्रति स्लाइड सेकंड', es: 'Segundos por diapositiva' },
  generateButton: { en: 'Generate AI Reel (Costs 1 Token)', hi: 'एआई रील बनाएं (1 टोकन)', es: 'Generar Reel IA (Cuesta 1 Token)' },

  // Gallery
  galleryTitle: { en: 'Your Created Reels', hi: 'आपकी बनाई गई रील्स', es: 'Tus Reels Creados' },
  galleryEmpty: { en: 'No reels yet. Jump into the studio to create your first viral video!', hi: 'अभी तक कोई रील नहीं है। अपनी पहली वीडियो बनाने के लिए स्टूडियो में जाएं!', es: 'Aún no hay reels. ¡Entra al estudio para crear tu primer video viral!' },
  downloadReel: { en: 'Download MP4', hi: 'MP4 डाउनलोड करें', es: 'Descargar MP4' },
  deleteReel: { en: 'Delete', hi: 'हटाएं', es: 'Eliminar' },

  // Feedback
  feedbackTitle: { en: 'We Value Your Feedback', hi: 'हम आपकी राय को महत्व देते हैं', es: 'Valoramos tus Comentarios' },
  feedbackSubtitle: { en: 'Help us improve the VidSnap.AI experience.', hi: 'VidSnap.AI को बेहतर बनाने में हमारी सहायता करें।', es: 'Ayúdanos a mejorar la experiencia de VidSnap.AI.' },
  feedbackPlaceholder: { en: 'Tell us what you love or what we should build next...', hi: 'हमें बताएं कि आपको क्या पसंद आया या हमें आगे क्या बनाना चाहिए...', es: 'Cuéntanos qué te gusta o qué deberíamos construir a continuación...' },
  submitFeedback: { en: 'Send Feedback', hi: 'फीडबैक भेजें', es: 'Enviar Comentarios' },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof typeof translations) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('vidsnap_locale') as Locale;
    if (saved && (saved === 'en' || saved === 'hi' || saved === 'es')) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('vidsnap_locale', newLocale);
  };

  const t = (key: keyof typeof translations): string => {
    const item = translations[key];
    if (!item) return String(key);
    return item[locale] || item.en;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
