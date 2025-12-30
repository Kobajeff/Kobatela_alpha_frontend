'use client';

import { type FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatDateTime } from '@/lib/format';
import {
  useAdminAdvisorDetail,
  useAdminAdvisorSenders,
  useAdminAssignSender,
  useAdminUpdateAdvisor
} from '@/lib/queries/admin';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';

export default function AdminAdvisorDetailPage() {
  const params = useParams<{ id: string }>();
  const advisorId = Number(params?.id);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

  const {
    data: advisor,
    isLoading,
    isError,
    error
  } = useAdminAdvisorDetail(Number.isFinite(advisorId) ? advisorId : 0);
  const { data: senders } = useAdminAdvisorSenders(Number.isFinite(advisorId) ? advisorId : 0);
  const updateAdvisor = useAdminUpdateAdvisor();
  const assignSender = useAdminAssignSender();

  if (!Number.isFinite(advisorId)) {
    return <ErrorAlert message="Identifiant conseiller invalide." />;
  }

  if (isLoading) {
    return <LoadingState label="Chargement du conseiller..." />;
  }

  if (isError) {
    return (
      <div className="p-4">
        <ErrorAlert message={extractErrorMessage(error)} />
      </div>
    );
  }

  if (!advisor) {
    return null;
  }

  const handleToggleActive = () => {
    updateAdvisor.mutate({ advisorId, data: { is_active: !advisor.is_active } });
  };

  const handleToggleBlocked = () => {
    updateAdvisor.mutate({ advisorId, data: { blocked: !advisor.blocked } });
  };

  const handleAssignSender = (event: FormEvent) => {
    event.preventDefault();
    setAssignError(null);
    assignSender.mutate(
      { advisorId, sender_email: assignEmail },
      {
        onSuccess: () => {
          setAssignEmail('');
        },
        onError: (err) => {
          setAssignError((err as Error).message);
        }
      }
    );
  };

  const fullname = `${advisor.first_name ?? ''} ${advisor.last_name ?? ''}`.trim();
  const displayName = fullname || advisor.email || advisor.advisor_id || 'Advisor';

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{displayName}</h1>
          <p className="text-sm text-muted-foreground">Advisor profile and workload overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={advisor.is_active ? 'success' : 'default'}>
            {advisor.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant={advisor.blocked ? 'danger' : 'default'}>
            {advisor.blocked ? 'Blocked' : 'Unblocked'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Profile</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={updateAdvisor.isPending}
                onClick={handleToggleActive}
              >
                {advisor.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={updateAdvisor.isPending}
                onClick={handleToggleBlocked}
              >
                {advisor.blocked ? 'Unblock' : 'Block'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-semibold">Advisor ID:</span> {advisor.advisor_id ?? '—'}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {advisor.email ?? '—'}
            </p>
            <p>
              <span className="font-semibold">Phone:</span> {advisor.phone ?? '—'}
            </p>
            <p>
              <span className="font-semibold">Country:</span> {advisor.country ?? '—'}
            </p>
            <p>
              <span className="font-semibold">Language:</span> {advisor.language ?? '—'}
            </p>
            <p>
              <span className="font-semibold">Advisor grade:</span> {advisor.advisor_grade ?? '—'}
            </p>
            <p>
              <span className="font-semibold">Short description:</span>{' '}
              {advisor.short_description ?? '—'}
            </p>
            <p>
              <span className="font-semibold">Review score:</span>{' '}
              {advisor.advisor_review !== null && advisor.advisor_review !== undefined
                ? advisor.advisor_review
                : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              Subscribed since {new Date(advisor.subscribe_date).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Senders managed</p>
              <p className="text-xl font-semibold">{advisor.sender_managed}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Total cases</p>
              <p className="text-xl font-semibold">{advisor.total_number_of_case_managed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Assigned senders</CardTitle>
          <span className="text-xs text-muted-foreground">{senders?.length ?? 0} sender(s)</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded border">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {(senders ?? []).map((sender) => (
                  <tr key={sender.sender_id} className="border-b last:border-0">
                    <td className="px-3 py-2 text-sm">{sender.sender_email}</td>
                    <td className="px-3 py-2">
                      <Badge variant={sender.active ? 'success' : 'default'}>
                        {sender.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatDateTime(sender.assigned_at)}
                    </td>
                  </tr>
                ))}
                {(senders ?? []).length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-sm text-muted-foreground" colSpan={3}>
                      No senders assigned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form onSubmit={handleAssignSender} className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              type="email"
              placeholder="Sender email"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              required
              className="md:flex-1"
            />
            <div className="flex flex-col gap-2 md:w-48">
              <Button type="submit" disabled={assignSender.isPending}>
                Assign
              </Button>
              {assignError && <p className="text-xs text-red-600">{assignError}</p>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
