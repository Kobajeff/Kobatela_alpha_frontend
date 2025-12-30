'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useMutation } from '../../useMutation';
import { extractErrorMessage } from '@/lib/apiClient';
import { createAdminUser, createUser } from '@/lib/adminApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminUserCreateResponse, PayoutChannel, User } from '@/types/api';

type AdminAccountRole = 'admin' | 'advisor';
type StandardUserRole = 'sender' | 'provider' | 'both' | 'support';

const payoutChannelOptions: Array<{ value: PayoutChannel; label: string }> = [
  { value: 'off_platform', label: 'Off-platform' },
  { value: 'stripe_connect', label: 'Stripe Connect' }
];

export function AdminUserCreator() {
  const queryClient = useQueryClient();

  const [userEmail, setUserEmail] = useState('');
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState<StandardUserRole>('sender');
  const [payoutChannel, setPayoutChannel] = useState<PayoutChannel>('off_platform');
  const [isActive, setIsActive] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState<AdminAccountRole>('admin');
  const [issueApiKey, setIssueApiKey] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);

  const userMutation = useMutation(createUser, {
    onError: (err) => {
      setUserError(extractErrorMessage(err));
    },
    onSuccess: (data) => {
      setUserError(null);
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'admin-users'
      });
      if (data?.role === 'sender' || data?.role === 'both') {
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.senders() });
      }
    }
  });

  const adminMutation = useMutation(createAdminUser, {
    onError: (err) => {
      setAdminError(extractErrorMessage(err));
    },
    onSuccess: (data) => {
      setAdminError(null);
      if (data?.user?.role === 'advisor') {
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.advisors.overview() });
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.advisors.listBase() });
      }
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'admin-users'
      });
    }
  });

  const createdUser = userMutation.data as User | undefined;
  const createdAdmin = adminMutation.data as AdminUserCreateResponse | undefined;

  const handleUserSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setUserError(null);
    userMutation.mutate({
      email: userEmail,
      username,
      is_active: isActive,
      role: userRole,
      payout_channel: payoutChannel
    });
  };

  const handleAdminSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setAdminError(null);
    adminMutation.mutate({ email: adminEmail, role: adminRole, issue_api_key: issueApiKey });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-800">Create platform user</h2>
            <p className="text-sm text-slate-600">
              Create sender/provider/support users via /users (username + email required by the
              backend contract).
            </p>
          </div>
          <form onSubmit={handleUserSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700" htmlFor="platform-email">
                Email
              </label>
              <input
                id="platform-email"
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700" htmlFor="platform-username">
                Username
              </label>
              <input
                id="platform-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                placeholder="kobatela.user"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700" htmlFor="platform-role">
                Role
              </label>
              <select
                id="platform-role"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as StandardUserRole)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              >
                <option value="sender">Sender</option>
                <option value="provider">Provider</option>
                <option value="both">Both</option>
                <option value="support">Support</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700" htmlFor="platform-payout">
                Payout channel
              </label>
              <select
                id="platform-payout"
                value={payoutChannel}
                onChange={(e) => setPayoutChannel(e.target.value as PayoutChannel)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              >
                {payoutChannelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Active user
            </label>
            {userError && <p className="text-sm text-rose-600">{userError}</p>}
            <button
              type="submit"
              disabled={userMutation.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {userMutation.isPending ? 'Creating...' : 'Create user'}
            </button>
          </form>
          {createdUser && (
            <div className="space-y-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">User created</p>
              <p>{createdUser.email}</p>
              <p className="text-xs text-slate-500">Role: {createdUser.role}</p>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-800">Create admin or advisor</h2>
            <p className="text-sm text-slate-600">
              Create admin/advisor accounts via /admin/users. Advisor accounts will attempt to
              create an AdvisorProfile automatically.
            </p>
          </div>
          <form onSubmit={handleAdminSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700" htmlFor="admin-email">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700" htmlFor="admin-role">
                Role
              </label>
              <select
                id="admin-role"
                value={adminRole}
                onChange={(e) => setAdminRole(e.target.value as AdminAccountRole)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              >
                <option value="admin">Admin</option>
                <option value="advisor">Advisor</option>
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
            {adminError && <p className="text-sm text-rose-600">{adminError}</p>}
            <button
              type="submit"
              disabled={adminMutation.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {adminMutation.isPending ? 'Creating...' : 'Create admin/advisor'}
            </button>
          </form>
          {createdAdmin && (
            <div className="space-y-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <div>
                <p className="font-semibold text-slate-800">User created</p>
                <p>{createdAdmin.user.email}</p>
                <p className="text-xs text-slate-500">Role: {createdAdmin.user.role}</p>
              </div>
              {createdAdmin.token && (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">API key</p>
                  <code className="block rounded bg-white p-2 text-xs text-slate-800">
                    {createdAdmin.token}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
