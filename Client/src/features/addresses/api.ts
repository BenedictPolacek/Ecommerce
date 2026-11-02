import { api } from '@/lib/api-client';
import type { AddressInput } from './schemas';
import type { Address } from './types';

export const getAddresses = () =>
  api.get<{ addresses: Address[] }>('/addresses').then(({ addresses }) => addresses);

export const createAddress = (input: AddressInput & { is_default?: boolean }) =>
  api.post<{ address: Address }>('/addresses', input).then(({ address }) => address);
