import type { ExternalEscrowSummary, ExternalProofStatus } from '@/types/api-external';
import {
  redactExternalEscrowSummary,
  redactExternalProofResponse
} from './external/externalRedaction';

export function sanitizeExternalEscrowSummary(summary: ExternalEscrowSummary): ExternalEscrowSummary {
  return redactExternalEscrowSummary(summary);
}

export function sanitizeExternalProofStatus(status: ExternalProofStatus): ExternalProofStatus {
  return redactExternalProofResponse(status) as ExternalProofStatus;
}
