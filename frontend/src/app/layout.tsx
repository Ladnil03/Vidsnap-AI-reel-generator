import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { I18nProvider } from '../context/I18nContext';
import { ToastProvider } from '../components/Toast';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { MobileNav } from '../components/MobileNav';
import { CompanionWidget } from '../components/CompanionWidget';

export const metadata: Metadata = {
  title: 'VidSnap.AI — Next-Gen AI Social Reel Generator',
  description: 'Turn photos and creative stories into high-impact 720p vertical reels using free-tier AI speech synthesis and cloud video rendering.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
  keywords: ['AI Reels', 'Video Generator', 'Short Video', 'Edge-TTS', 'FFmpeg', 'Social Entertainment'],
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
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
    <html lang="en" data-theme="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <AuthProvider>
          <I18nProvider>
            <ToastProvider>
              <Navbar />
              <main className="page-container">
                {children}
              </main>
              <Footer />
              <MobileNav />
              <CompanionWidget />
            </ToastProvider>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
