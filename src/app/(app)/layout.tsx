import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="text-3xl font-extrabold text-splits-red">splits.</p>
        <h1 className="mt-4 text-xl font-bold">Supabase is not configured yet</h1>
        <p className="mt-2 max-w-sm text-sm text-splits-muted">
          Copy <code>.env.example</code> to <code>.env.local</code> and add your
          project URL and anon key. See the README for the database migration.
        </p>
        <Link href="/" className="mt-6 font-semibold text-splits-red">
          Back to landing
        </Link>
      </div>
    );
  }

  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/sign-in");

  return (
    <AppShell
      name={profile?.full_name ?? "Friend"}
      userId={user.id}
      avatarUrl={profile?.avatar_url}
    >
      {children}
    </AppShell>
  );
}
