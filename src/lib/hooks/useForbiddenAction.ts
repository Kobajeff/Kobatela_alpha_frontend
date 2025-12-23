import { useCallback, useState } from 'react';
import { normalizeApiError } from '@/lib/apiError';

type ForbiddenState = {
  forbidden: boolean;
  message?: string;
  code?: string;
};

export function useForbiddenAction() {
  const [state, setState] = useState<ForbiddenState>({ forbidden: false });

  const forbidWith = useCallback((error: unknown) => {
    const normalized = normalizeApiError(error);
    if (normalized.code === 'INSUFFICIENT_SCOPE') {
      setState({ forbidden: true, message: normalized.message, code: normalized.code });
    }
    return normalized;
  }, []);

  const resetForbidden = useCallback(() => {
    setState({ forbidden: false });
  }, []);

  return {
    forbidden: state.forbidden,
    forbiddenMessage: state.message,
    forbiddenCode: state.code,
    forbidWith,
    resetForbidden
  };
}
