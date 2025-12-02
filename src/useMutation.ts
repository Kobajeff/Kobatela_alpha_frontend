"use client";

import {
  useMutation as rqUseMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";

/**
 * Wrapper maison autour de useMutation pour garder la vieille signature :
 *
 *   const mutation = useMutation(mutationFn, { onError, onSuccess, ... })
 *
 * tout en utilisant l’API v5 de TanStack Query.
 */
export function useMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationFn">
): UseMutationResult<TData, TError, TVariables, TContext> {
  return rqUseMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    ...(options ?? {}),
  });
}
