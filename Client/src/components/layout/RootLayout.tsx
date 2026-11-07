import { Outlet, ScrollRestoration } from 'react-router';
import { VerifyEmailBanner } from '@/features/auth/components/VerifyEmailBanner';
import { Footer } from './Footer';
import { Header } from './Header';

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* First stop for keyboard users: jump over the header straight to the page content.
          Invisible until it gets focus. */}
      <a
        href="#main"
        className="bg-background sr-only rounded-md px-4 py-2 font-medium shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to content
      </a>
      <Header />
      <VerifyEmailBanner />
      {/* tabIndex -1: the skip link can move the focus here (main is not focusable otherwise) */}
      <main id="main" tabIndex={-1} className="container mx-auto flex-1 px-4 outline-none">
        <Outlet />
      </main>
      <Footer />
      {/* New page: scroll to top; back/forward: restore the previous position */}
      <ScrollRestoration />
    </div>
  );
}
