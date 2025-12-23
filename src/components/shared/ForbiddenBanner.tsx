import { Card, CardContent } from '@/components/ui/Card';

interface ForbiddenBannerProps {
  title?: string;
  subtitle?: string;
  code?: string;
}

export function ForbiddenBanner({
  title = 'Action non autorisée',
  subtitle,
  code
}: ForbiddenBannerProps) {
  return (
    <Card className="border-rose-200 bg-rose-50">
      <CardContent className="space-y-1 p-4 text-rose-700">
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-sm text-rose-600">{subtitle}</p>}
        {code && <p className="text-xs uppercase tracking-wide text-rose-500">{code}</p>}
      </CardContent>
    </Card>
  );
}
