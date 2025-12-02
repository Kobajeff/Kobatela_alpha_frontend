'use client';

import { useState } from 'react';
import { useMutation } from '../../useMutation';
import { extractErrorMessage } from '@/lib/apiClient';
import { adminCreateUser } from '@/lib/services/admin';
import type { AdminUserCreatePayload, AdminUserCreateResponse } from '@/types/api';

export function AdminUserCreator() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminUserCreatePayload['role']>('sender');
  const [issueApiKey, setIssueApiKey] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation(adminCreateUser, {
    onError: (err) => {
      setError(extractErrorMessage(err));
    },
    onSuccess: () => setError(null)
  });

  const created = mutation.data as AdminUserCreateResponse | undefined;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    mutation.mutate({ email, role, issue_api_key: issueApiKey });
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-800">Create test user</h2>
        <p className="text-sm text-slate-600">
          Generate sender, admin, or hybrid accounts and optionally fetch their API key.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700" htmlFor="user-email">
            Email
          </label>
          <input
            id="user-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            placeholder="user@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700" htmlFor="user-role">
            Role
          </label>
          <select
            id="user-role"
            value={role}
            onChange={(e) => setRole(e.target.value as AdminUserCreatePayload['role'])}
            className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          >
            <option value="sender">Sender</option>
            <option value="admin">Admin</option>
            <option value="both">Both</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={issueApiKey}
            onChange={(e) => setIssueApiKey(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Issue API key immediately
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {mutation.isPending ? 'Creating...' : 'Create user'}
        </button>
      </form>
      {created && (
        <div className="space-y-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          <div>
            <p className="font-semibold text-slate-800">User created</p>
            <p>{created.user.email}</p>
            <p className="text-xs text-slate-500">Role: {created.user.role}</p>
          </div>
          {created.token && (
            <div className="space-y-1">
              <p className="font-semibold text-slate-800">API key</p>
              <code className="block rounded bg-white p-2 text-xs text-slate-800">
                {created.token}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
