import type { Metadata, Viewport } from 'next';
import { Outfit, Plus_Jakarta_Sans, Noto_Sans_Devanagari, Noto_Sans_Gujarati } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { I18nProvider } from '../context/I18nContext';
import { ToastProvider } from '../components/Toast';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { MobileNav } from '../components/MobileNav';
import { CompanionWidget } from '../components/CompanionWidget';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  variable: '--font-noto-devanagari',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const notoGujarati = Noto_Sans_Gujarati({
  subsets: ['gujarati', 'latin'],
  variable: '--font-noto-gujarati',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'VidSnap.AI — Nature-Inspired AI Social Reel Platform',
  description: 'Craft beautiful high-impact 720p vertical reels with AI speech synthesis, calm organic aesthetics, and card-free cloud rendering.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
  keywords: ['AI Reels', 'Video Generator', 'Short Video', 'Edge-TTS', 'FFmpeg', 'Social Entertainment'],
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F4EB' },
    { media: '(prefers-color-scheme: dark)', color: '#0E2012' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${outfit.variable} ${plusJakarta.variable} ${notoDevanagari.variable} ${notoGujarati.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('vidsnap_theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);var m=document.querySelector('meta[name="theme-color"]');if(m){m.setAttribute('content',t==='dark'?'#0E2012':'#F7F4EB');}}catch(e){}})();`,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <ThemeProvider>
          <AuthProvider>
            <I18nProvider>
              <ToastProvider>
                <Navbar />
                <main id="main-content" className="page-container">
                  {children}
                </main>
                <Footer />
                <MobileNav />
                <CompanionWidget />
              </ToastProvider>
            </I18nProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
