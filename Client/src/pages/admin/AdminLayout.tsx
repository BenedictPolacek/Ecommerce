import { SideNavLayout, type SideNavSection } from '@/components/layout/SideNavLayout';

// Products, categories and customers follow in the next PRs
const sections: SideNavSection[] = [{ to: '/admin/orders', label: 'Orders' }];

/** Shared frame of all admin pages (behind RequireAuth role="admin"), add new sections here */
export function AdminLayout() {
  return <SideNavLayout title="Admin" navLabel="Admin" sections={sections} />;
}
