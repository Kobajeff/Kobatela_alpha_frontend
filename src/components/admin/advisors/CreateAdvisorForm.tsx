'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage } from '@/lib/apiClient';
import type { AdvisorProfileCreatePayload } from '@/types/api';

const fieldClasses =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

interface CreateAdvisorFormProps {
  onSubmit: (payload: AdvisorProfileCreatePayload) => void;
  isLoading?: boolean;
  error?: unknown;
  isSuccess?: boolean;
}

export function CreateAdvisorForm({ onSubmit, isLoading, error, isSuccess }: CreateAdvisorFormProps) {
  const [userId, setUserId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [advisorGrade, setAdvisorGrade] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isSuccess && !isLoading) {
      setUserId('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setCountry('');
      setLanguage('');
      setProfilePhoto('');
      setShortDescription('');
      setAdvisorGrade('');
      setIsActive(true);
      setBlocked(false);
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

    onSubmit({
      user_id: id,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      country: country || undefined,
      language: language || undefined,
      profile_photo: profilePhoto || undefined,
      short_description: shortDescription || undefined,
      advisor_grade: advisorGrade || undefined,
      is_active: isActive,
      blocked
    });
  };

  const submitError = localError ?? (error ? extractErrorMessage(error) : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create advisor</CardTitle>
        <p className="text-sm text-muted-foreground">
          Attach an advisor profile to an existing advisor user (user_id required). Missing name/email
          will default to the user record.
        </p>
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
            <label className="text-xs font-semibold text-slate-700">First name</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Fatou" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Last name</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Kouadio" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="advisor@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2250102030405" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Country</label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="CI" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Language</label>
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="fr" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Advisor grade</label>
            <Input value={advisorGrade} onChange={(e) => setAdvisorGrade(e.target.value)} placeholder="Senior" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Profile photo URL</label>
            <Input
              value={profilePhoto}
              onChange={(e) => setProfilePhoto(e.target.value)}
              placeholder="https://cdn.example.com/avatar.jpg"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Short description</label>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Advisor background and focus areas."
              className={fieldClasses}
              rows={3}
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Active advisor
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={blocked}
              onChange={(e) => setBlocked(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Blocked
          </label>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating advisor...' : 'Create advisor'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
