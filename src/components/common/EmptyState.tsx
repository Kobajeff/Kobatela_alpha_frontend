'use client';

interface EmptyStateProps {
  title?: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-muted-foreground">
      {title && <p className="mb-1 text-base font-semibold text-slate-700">{title}</p>}
      <p>{message}</p>
    </div>
  );
}
