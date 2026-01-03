import { Button } from '@/components/ui/Button';

type OpsPaginationProps = {
  limit: number;
  offset: number;
  total?: number | null;
  onPrev: () => void;
  onNext: () => void;
  pageItemCount?: number;
};

export function OpsPagination({
  limit,
  offset,
  total,
  pageItemCount,
  onPrev,
  onNext
}: OpsPaginationProps) {
  const safeTotal = typeof total === 'number' && total >= 0 ? total : undefined;
  const start = offset + 1;
  const end = safeTotal ? Math.min(offset + limit, safeTotal) : offset + limit;
  const canGoPrev = offset > 0;
  const hasNextByTotal = safeTotal ? offset + limit < safeTotal : false;
  const hasNextByCount =
    !safeTotal && typeof pageItemCount === 'number' ? pageItemCount === limit : false;
  const canGoNext = hasNextByTotal || hasNextByCount;

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span>
        Affichage {start}-{end}
        {safeTotal ? ` sur ${safeTotal}` : ''}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onPrev} disabled={!canGoPrev}>
          Précédent
        </Button>
        <Button variant="secondary" size="sm" onClick={onNext} disabled={!canGoNext}>
          Suivant
        </Button>
      </div>
    </div>
  );
}
