import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAddress, getAddresses } from './api';

export const addressKeys = {
  all: ['addresses'] as const,
};

export function useAddresses() {
  return useQuery({ queryKey: addressKeys.all, queryFn: getAddresses });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAddress,
    // A new default address changes is_default of the others: reload the whole list
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressKeys.all }),
  });
}
