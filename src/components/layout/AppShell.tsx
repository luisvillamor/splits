"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/Avatar";

const nav = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/groups", label: "Groups", icon: GroupsIcon },
  { href: "/join", label: "Join", icon: JoinIcon },
];

export function AppShell({
  name,
  userId,
  avatarUrl,
  children,
}: {
  name: string;
  userId: string;
  avatarUrl?: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const focusMode = pathname.startsWith("/splits/");
  const onProfile = pathname.startsWith("/profile");

  return (
    <div className="min-h-dvh bg-[#fff8f8]">
      <div className="mx-auto flex min-h-dvh max-w-6xl">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-splits-line bg-white px-5 py-6 md:flex">
          <Logo className="text-2xl" />
          <nav className="mt-8 space-y-1">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold ${
                    active ? "bg-splits-soft text-splits-red" : "text-splits-ink"
                  }`}
                >
                  <item.icon />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/profile"
            className={`mt-auto flex items-center gap-3 rounded-2xl p-2 ${
              onProfile ? "bg-splits-soft" : "hover:bg-black/5"
            }`}
          >
            <Avatar name={name} id={userId} src={avatarUrl} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{name}</span>
              <span className="text-xs font-medium text-splits-muted">Profile</span>
            </span>
          </Link>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={`flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] md:hidden ${focusMode ? "hidden" : ""}`}
          >
            <Logo className="text-xl" />
            <Link href="/profile" aria-label="Open profile" className="rounded-full">
              <Avatar name={name} id={userId} src={avatarUrl} size="sm" />
            </Link>
          </header>
          <main
            className={`flex-1 ${focusMode ? "px-0 pb-0 pt-0 md:px-8 md:pb-10 md:pt-8" : "px-4 pb-28 pt-2 md:px-8 md:pb-10 md:pt-8"}`}
          >
            {children}
          </main>
          <nav
            className={`fixed inset-x-0 bottom-0 z-40 border-t border-splits-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden ${focusMode ? "hidden" : ""}`}
          >
            <ul className="mx-auto grid max-w-lg grid-cols-3">
              {nav.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                        active ? "text-splits-red" : "text-splits-muted"
                      }`}
                    >
                      <item.icon />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 4 4 10.5V20h6v-6h4v6h6v-9.5L12 4Z" />
    </svg>
  );
}

function GroupsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 18c0-2.7 2.7-5 6-5s6 2.3 6 5v1H4v-1Zm10.1-.2c.6-1.8 2.4-3.3 4.9-3.7.9.8 1.5 1.9 1.5 3.2V19h-6.4v-1.2Z" />
    </svg>
  );
}

function JoinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
    </svg>
  );
}
