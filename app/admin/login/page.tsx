import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Administrator sign in | Kadak Chai Co.',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { expired?: string };
}) {
  const session = verifyAdminSession(
    cookies().get(ADMIN_SESSION_COOKIE)?.value
  );
  if (session) redirect('/admin/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-chai-200 bg-white p-7 shadow-lg shadow-chai-950/5 sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-saffron-700">
          Kadak Chai Co.
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-chai-950">
          Administrator sign in
        </h1>
        <p className="mt-2 text-sm leading-6 text-chai-700">
          Sign in to review #MyChaiBreak submissions.
        </p>
        <AdminLoginForm sessionExpired={searchParams?.expired === '1'} />
      </section>
    </main>
  );
}
