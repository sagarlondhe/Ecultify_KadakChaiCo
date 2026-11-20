'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ModerationActions({
  entryId,
  currentStatus,
}: {
  entryId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function moderate(status: 'approved' | 'rejected') {
    if (submitting) return;
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/admin/entries/${encodeURIComponent(entryId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, adminNotes: notes }),
        }
      );
      if (response.status === 401) {
        router.replace('/admin/login?expired=1');
        return;
      }
      if (!response.ok) {
        setMessage('This moderation action could not be completed.');
        return;
      }

      setNotes('');
      setMessage(`Submission ${status}.`);
      router.refresh();
    } catch {
      setMessage('Unable to connect. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canApprove = currentStatus !== 'approved';
  const canReject = currentStatus !== 'rejected';

  return (
    <div className="mt-5 border-t border-chai-100 pt-4">
      <label htmlFor={`notes-${entryId}`} className="text-sm font-semibold text-chai-900">
        Optional administrator note
      </label>
      <textarea
        id={`notes-${entryId}`}
        value={notes}
        maxLength={1000}
        rows={2}
        onChange={(event) => setNotes(event.target.value)}
        className="mt-2 block w-full rounded-xl border border-chai-300 bg-white px-3 py-2 text-sm text-chai-950 outline-none focus:border-chai-700 focus:ring-2 focus:ring-chai-200"
        disabled={submitting}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canApprove && (
          <button
            type="button"
            onClick={() => moderate('approved')}
            disabled={submitting}
            className="min-h-10 rounded-full bg-green-800 px-4 text-sm font-bold text-white hover:bg-green-900 disabled:opacity-60"
          >
            Approve
          </button>
        )}
        {canReject && (
          <button
            type="button"
            onClick={() => moderate('rejected')}
            disabled={submitting}
            className="min-h-10 rounded-full bg-red-800 px-4 text-sm font-bold text-white hover:bg-red-900 disabled:opacity-60"
          >
            Reject
          </button>
        )}
        {message && <p role="status" className="text-sm text-chai-800">{message}</p>}
      </div>
    </div>
  );
}
