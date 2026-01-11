import type { ReactNode } from 'react';
import { OpsPagination } from '@/components/admin/OpsPagination';

type PaginatedTableProps = {
  title?: string;
  description?: string;
  toolbar?: ReactNode;
  limit: number;
  offset: number;
  total?: number | null;
  pageItemCount: number;
  onPrev: () => void;
  onNext: () => void;
  children: ReactNode;
};

export function PaginatedTable({
  title,
  description,
  toolbar,
  limit,
  offset,
  total,
  pageItemCount,
  onPrev,
  onNext,
  children
}: PaginatedTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {title && <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>}
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {toolbar}
          <OpsPagination
            limit={limit}
            offset={offset}
            total={total}
            pageItemCount={pageItemCount}
            onPrev={onPrev}
            onNext={onNext}
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">{children}</div>
    </div>
  );
}
