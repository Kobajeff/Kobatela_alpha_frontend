'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage } from '@/lib/apiClient';

const selectClasses =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

interface CreateAdvisorFormProps {
  onSubmit: (payload: {
    user_id: number;
    display_name?: string;
    country?: string;
    languages?: string[];
    grade?: string;
  }) => void;
  isLoading?: boolean;
  error?: unknown;
  isSuccess?: boolean;
}

export function CreateAdvisorForm({ onSubmit, isLoading, error, isSuccess }: CreateAdvisorFormProps) {
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('');
  const [languages, setLanguages] = useState('');
  const [grade, setGrade] = useState('JUNIOR');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isSuccess && !isLoading) {
      setUserId('');
      setDisplayName('');
      setCountry('');
      setLanguages('');
      setGrade('JUNIOR');
    }
  }, [isSuccess, isLoading]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    const id = Number(userId);
    if (!Number.isFinite(id)) {
      setLocalError('Please provide a valid numeric user ID.');
      return;
    }

    const normalizedLanguages = languages
      .split(',')
      .map((lang) => lang.trim())
      .filter(Boolean);

    onSubmit({
      user_id: id,
      display_name: displayName || undefined,
      country: country || undefined,
      languages: normalizedLanguages.length ? normalizedLanguages : undefined,
      grade: grade || undefined
    });
  };

  const submitError = localError ?? (error ? extractErrorMessage(error) : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create advisor</CardTitle>
        <p className="text-sm text-muted-foreground">Attach an admin user to the concierge team.</p>
      </CardHeader>
      <CardContent>
        {submitError && <ErrorAlert message={submitError} />}
        {isSuccess && !submitError && (
          <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Advisor created successfully.
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">User ID</label>
            <Input
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="123"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Display name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Fatou K."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Country</label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="CI"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Languages</label>
            <Input
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="fr, en"
            />
            <p className="text-xs text-muted-foreground">Comma-separated list, e.g., "fr, en".</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Grade</label>
            <select className={selectClasses} value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="JUNIOR">Junior</option>
              <option value="SENIOR">Senior</option>
              <option value="LEAD">Lead</option>
            </select>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating advisor...' : 'Create advisor'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
