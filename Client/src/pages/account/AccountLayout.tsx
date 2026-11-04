import { SideNavLayout, type SideNavSection } from '@/components/layout/SideNavLayout';

const sections: SideNavSection[] = [
  { to: '/account', label: 'Profile', end: true },
  { to: '/account/addresses', label: 'Addresses' },
  { to: '/account/security', label: 'Security' },
  { to: '/orders', label: 'Orders' },
];

/** Shared frame of all account pages, add new sections here */
export function AccountLayout() {
  return (
    <SideNavLayout
      title="My account"
      navLabel="Account"
      sections={sections}
      contentClassName="max-w-2xl"
    />
  );
}
