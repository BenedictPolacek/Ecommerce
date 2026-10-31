import { Outlet } from 'react-router';
import { Footer } from './Footer';
import { Header } from './Header';

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
