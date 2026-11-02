import { api } from '@/lib/api-client';
import type { AddressInput } from './schemas';
import type { Address } from './types';

export const getAddresses = () =>
  api.get<{ addresses: Address[] }>('/addresses').then(({ addresses }) => addresses);

export const createAddress = (input: AddressInput & { is_default?: boolean }) =>
  api.post<{ address: Address }>('/addresses', input).then(({ address }) => address);

export const updateAddress = ({
  id,
  ...input
}: Partial<AddressInput> & { id: string; is_default?: boolean }) =>
  api.put<{ address: Address }>(`/addresses/${id}`, input).then(({ address }) => address);

/** Orders keep a copy of their address, so deleting it does not change past orders */
export const deleteAddress = (id: string) => api.delete<void>(`/addresses/${id}`);
