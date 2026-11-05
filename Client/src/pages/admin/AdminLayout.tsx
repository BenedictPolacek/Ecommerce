import { SideNavLayout, type SideNavSection } from '@/components/layout/SideNavLayout';

// Customers follow in the next PRs
const sections: SideNavSection[] = [
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
];

/** Shared frame of all admin pages (behind RequireAuth role="admin"), add new sections here */
export function AdminLayout() {
  return <SideNavLayout title="Admin" navLabel="Admin" sections={sections} />;
}
