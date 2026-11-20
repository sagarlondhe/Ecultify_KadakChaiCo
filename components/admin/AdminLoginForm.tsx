'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function AdminLoginForm({
  sessionExpired,
}: {
  sessionExpired: boolean;
}) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    sessionExpired ? 'Your session expired. Please sign in again.' : ''
  );
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        setError(
          response.status === 401
            ? 'Invalid username or password.'
            : 'Sign in is temporarily unavailable. Please try again.'
        );
        return;
      }

      setPassword('');
      router.replace('/admin/dashboard');
      router.refresh();
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={submit}>
      <div>
        <label htmlFor="admin-username" className="text-sm font-semibold text-chai-950">
          Username
        </label>
        <input
          id="admin-username"
          name="username"
          type="text"
          autoComplete="username"
          required
          maxLength={128}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-chai-300 bg-white px-4 text-base text-chai-950 outline-none focus:border-chai-700 focus:ring-2 focus:ring-chai-200"
          disabled={submitting}
        />
      </div>
      <div>
        <label htmlFor="admin-password" className="text-sm font-semibold text-chai-950">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-chai-300 bg-white px-4 text-base text-chai-950 outline-none focus:border-chai-700 focus:ring-2 focus:ring-chai-200"
          disabled={submitting}
        />
      </div>
      {error && <p role="alert" className="text-sm font-medium text-red-800">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="min-h-12 w-full rounded-full bg-chai-900 px-5 text-sm font-bold text-white hover:bg-chai-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-chai-700 disabled:opacity-70"
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
