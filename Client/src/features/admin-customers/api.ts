import { api } from '@/lib/api-client';
import type { Customer, CustomerList, CustomerListParams } from './types';

/** Active accounts, newest first (deleted ones are left out by the server) */
export function getCustomers({ search, role, page, limit }: CustomerListParams) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) query.set('search', search);
  if (role) query.set('role', role);
  return api.get<CustomerList>(`/users?${query}`);
}

export const getCustomer = async (id: string) =>
  (await api.get<{ user: Customer }>(`/users/${id}`)).user;

/**
 * Deleted customers with orders keep a placeholder row (deleted-<id>@deleted.invalid,
 * see the server's userRepository.anonymize): there is no customer page for them
 */
export const isAnonymized = ({ email }: { email: string }) => email.endsWith('@deleted.invalid');

/** GDPR deletion: anonymized when there are orders, otherwise really deleted */
export const deleteCustomer = (id: string) => api.delete<void>(`/users/${id}`);
