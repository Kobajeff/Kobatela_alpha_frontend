import { isDemoMode } from '@/lib/config';

export function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div className="w-full bg-yellow-100 text-yellow-900 text-center py-2 text-sm">
      Demo mode – sample data only, no real payments are processed.
    </div>
  );
}
