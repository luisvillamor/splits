import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-3xl font-extrabold text-splits-red">splits.</p>
      <h1 className="mt-4 text-2xl font-bold">We couldn&apos;t find that.</h1>
      <p className="mt-2 max-w-sm text-sm text-splits-muted">
        It may have been removed, or you might not have access.
      </p>
      <Link href="/dashboard" className="mt-6 w-full max-w-xs">
        <Button>Back home</Button>
      </Link>
    </div>
  );
}
