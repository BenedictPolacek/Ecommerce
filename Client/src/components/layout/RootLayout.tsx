import { Outlet, ScrollRestoration } from 'react-router';
import { VerifyEmailBanner } from '@/features/auth/components/VerifyEmailBanner';
import { Footer } from './Footer';
import { Header } from './Header';

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <VerifyEmailBanner />
      <main className="container mx-auto flex-1 px-4">
        <Outlet />
      </main>
      <Footer />
      {/* New page: scroll to top; back/forward: restore the previous position */}
      <ScrollRestoration />
    </div>
  );
}
