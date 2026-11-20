'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminLogoutButton() {
  const router = useRouter();
  const [error, setError] = useState('');

  async function logout() {
    setError('');
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout failed');
      router.replace('/admin/login');
      router.refresh();
    } catch {
      setError('Unable to sign out. Please try again.');
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span role="alert" className="text-sm text-red-800">{error}</span>}
      <button
        type="button"
        onClick={logout}
        className="min-h-11 rounded-full border border-chai-300 bg-white px-5 text-sm font-bold text-chai-900 hover:bg-cream-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chai-700"
      >
        Sign out
      </button>
    </div>
  );
}
