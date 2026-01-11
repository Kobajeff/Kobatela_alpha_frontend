import { Suspense } from 'react';
import { LoadingState } from '@/components/common/LoadingState';
import SenderCreateEscrowClient from './SenderCreateEscrowClient';

export default function SenderCreateEscrowPage() {
  return (
    <Suspense fallback={<LoadingState label="Chargement du formulaire..." fullHeight={false} />}>
      <SenderCreateEscrowClient />
    </Suspense>
  );
}
