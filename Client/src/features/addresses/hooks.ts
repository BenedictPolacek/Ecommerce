import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAddress, deleteAddress, getAddresses, updateAddress } from './api';

export const addressKeys = {
  all: ['addresses'] as const,
};

export function useAddresses() {
  return useQuery({ queryKey: addressKeys.all, queryFn: getAddresses });
}

/**
 * Every change reloads the whole list: a new default address also changes is_default
 * of the previous one, and the server decides the order (default first).
 */
function useAddressMutation<TInput, TData>(mutationFn: (input: TInput) => Promise<TData>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressKeys.all }),
  });
}

export const useCreateAddress = () => useAddressMutation(createAddress);

export const useUpdateAddress = () => useAddressMutation(updateAddress);

export const useDeleteAddress = () => useAddressMutation(deleteAddress);
