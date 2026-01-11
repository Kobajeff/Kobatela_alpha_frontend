import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const SOON_HELPER_TEXT =
  'La gestion complète des autorisations (liste, filtres, statuts) arrive prochainement.';

export default function SenderMandatesPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Envois à usage verrouillé</h1>
      </div>

      <Card className="border-amber-200 bg-amber-50/60">
        <CardContent className="flex items-start gap-3 py-4">
          <span className="text-xl" aria-hidden>
            💡
          </span>
          <p className="text-sm text-amber-900">
            Autorisation permettant de définir comment un envoi pourra être utilisé, avant tout
            paiement.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  aria-hidden
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <Input
                disabled
                className="pl-9"
                placeholder="Rechercher une autorisation…"
                aria-label="Rechercher une autorisation"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button disabled className="whitespace-nowrap">
                + Créer une autorisation
              </Button>
              <Badge variant="muted">Disponible bientôt</Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-600">Filtrer par :</span>
            <div className="flex items-center gap-2">
              <Select disabled className="min-w-[200px]">
                <option>Tous les statuts</option>
              </Select>
              <Badge variant="muted">Disponible bientôt</Badge>
            </div>
          </div>

          <p className="text-xs text-slate-500">{SOON_HELPER_TEXT}</p>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Autorisation</th>
                  <th className="px-4 py-3">Compte</th>
                  <th className="px-4 py-3">État</th>
                  <th className="px-4 py-3">Date d&apos;expiration</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={5}>
                    <div className="flex flex-col items-center gap-2">
                      <Badge variant="muted">Disponible bientôt</Badge>
                      <p>Cette fonctionnalité sera disponible dans une prochaine version.</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">0 autorisation</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Précédent
              </Button>
              <Button variant="outline" size="sm" disabled>
                Suivant
              </Button>
              <Badge variant="muted">Disponible bientôt</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-slate-600">
        Besoin d&apos;aide ?{' '}
        <Link className="font-medium text-indigo-600 hover:text-indigo-500" href="mailto:support@kobatela.com">
          Contactez notre support
        </Link>
      </div>
    </div>
  );
}
