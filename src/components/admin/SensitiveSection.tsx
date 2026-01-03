import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

type SensitiveSectionProps = {
  title: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
};

export function SensitiveSection({
  title,
  defaultCollapsed = true,
  children
}: SensitiveSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {collapsed ? 'Afficher' : 'Masquer'} {title}
        </Button>
        <p className="text-xs text-slate-600">
          Les données sensibles sont masquées par défaut. Ne pas exporter ni partager.
        </p>
      </div>
      {!collapsed && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">{children}</div>
      )}
    </div>
  );
}
