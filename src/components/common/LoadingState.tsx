'use client';

export function LoadingState({
  label = 'Chargement...',
  fullHeight = true
}: {
  label?: string;
  fullHeight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-center py-6 ${fullHeight ? 'h-full' : ''}`}>
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
        <span>{label}</span>
      </div>
    </div>
  );
}
