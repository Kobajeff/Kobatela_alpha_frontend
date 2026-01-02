'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { RequireScope } from '@/components/system/RequireScope';
import { isAdminKctPublicEnabled } from '@/lib/featureFlags';
import { useKctPublicProjects, type KctPublicProjectsParams } from '@/lib/queries/kctPublic';
import type { GovProjectRead } from '@/types/api';

const DOMAIN_OPTIONS: Array<{ value: '' | 'public' | 'aid'; label: string }> = [
  { value: '', label: 'Tous les domaines' },
  { value: 'public', label: 'Public' },
  { value: 'aid', label: 'Aid' }
];

function Filters({
  filters,
  onChange,
  onSubmit
}: {
  filters: KctPublicProjectsParams;
  onChange: (next: KctPublicProjectsParams) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form className="grid gap-4 sm:grid-cols-3" onSubmit={onSubmit}>
      <label className="flex flex-col gap-2 text-sm text-slate-700">
        Domaine
        <Select
          value={filters.domain ?? ''}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onChange({ ...filters, domain: (event.target.value as 'public' | 'aid' | '') || undefined })
          }
        >
          {DOMAIN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        Pays (ISO 2)
        <Input
          placeholder="Ex: RW"
          value={filters.country ?? ''}
          onChange={(event) =>
            onChange({
              ...filters,
              country: event.target.value.toUpperCase()
            })
          }
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        Statut
        <Input
          placeholder="Ex: active"
          value={filters.status ?? ''}
          onChange={(event) => onChange({ ...filters, status: event.target.value })}
        />
      </label>

      <div className="sm:col-span-3">
        <Button type="submit">Appliquer les filtres</Button>
      </div>
    </form>
  );
}

function ProjectsTable({ projects }: { projects: GovProjectRead[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Label
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Domaine
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pays / Ville
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Statut
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Montant total
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Débloqué
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Restant
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Milestone courant
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Risque (escrows exclus / montant)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {projects.map((project) => (
            <tr key={project.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm font-medium text-slate-800">{project.id}</td>
              <td className="px-4 py-3 text-sm text-slate-800">
                <div className="flex flex-col">
                  <span className="font-semibold">{project.label}</span>
                  <span className="text-xs text-slate-500">{project.project_type}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">{project.domain}</td>
              <td className="px-4 py-3 text-sm text-slate-700">
                {project.country}
                {project.city ? ` · ${project.city}` : ''}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">{project.status}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{project.total_amount}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{project.released_amount}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{project.remaining_amount}</td>
              <td className="px-4 py-3 text-sm text-slate-700">
                {project.current_milestone ?? '—'}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">
                {project.risk_excluded_escrows} / {project.risk_excluded_amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminKctPublicContent() {
  const [formFilters, setFormFilters] = useState<KctPublicProjectsParams>({});
  const [appliedFilters, setAppliedFilters] = useState<KctPublicProjectsParams>({});
  const flagEnabled = isAdminKctPublicEnabled();

  const projectsQuery = useKctPublicProjects(appliedFilters, { enabled: flagEnabled });
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setAppliedFilters(formFilters);
  };

  if (!flagEnabled) {
    return (
      <Card>
        <CardContent className="space-y-2">
          <CardTitle>Disabled (feature flag off)</CardTitle>
          <p className="text-sm text-slate-600">
            The KCT Public view is gated by NEXT_PUBLIC_FF_ADMIN_KCT_PUBLIC. When disabled, no API
            requests are issued to /kct_public/projects.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (projectsQuery.isLoading) {
    return <LoadingState label="Chargement des projets KCT Public..." />;
  }

  if (projectsQuery.isError) {
    const status = isAxiosError(projectsQuery.error)
      ? projectsQuery.error.response?.status
      : null;
    const message =
      status === 401 || status === 403
        ? 'Accès refusé : une clé API admin (ou sender) liée à un utilisateur GOV/ONG est requise pour lire /kct_public/projects.'
        : 'Erreur lors du chargement des projets KCT Public.';
    return (
      <div className="p-4">
        <ErrorAlert message={message} />
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">KCT Public</h1>
          <p className="text-sm text-slate-500">
            Lecture seule de /kct_public/projects (scopes admin/sender + utilisateur GOV/ONG).
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <Filters filters={formFilters} onChange={setFormFilters} onSubmit={handleSubmit} />
        </div>
        <EmptyState
          title="Aucun projet"
          message="Aucun projet KCT Public n’est disponible pour ces filtres."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">KCT Public</h1>
          <p className="text-sm text-slate-500">
            Vue en lecture seule exploitant GET /kct_public/projects (domain, country, status).
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">
          Accès requis: scope admin ou sender + utilisateur GOV/ONG.
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <Filters filters={formFilters} onChange={setFormFilters} onSubmit={handleSubmit} />
      </div>

      <ProjectsTable projects={projects} />
    </div>
  );
}

export default function AdminKctPublicPage() {
  return (
    <RequireScope
      anyScopes={['ADMIN']}
      allowRoles={['admin', 'both']}
      unauthorizedMessage="Accès refusé : cette page est réservée aux administrateurs disposant de la portée admin."
      loadingLabel="Vérification de l'accès administrateur..."
    >
      <AdminKctPublicContent />
    </RequireScope>
  );
}
