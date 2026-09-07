import { FriendsHero } from "@/components/brand/FriendsHero";
import { Logo } from "@/components/brand/Logo";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex h-dvh min-h-dvh flex-col bg-splits-red">
      <main className="relative mx-auto flex h-full w-full max-w-[430px] flex-col items-center px-6 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))] text-white">
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <FriendsHero />
          <Logo light className="mt-1 text-[52px] leading-none" />
          <p className="mt-3 text-center text-[15px] font-normal tracking-wide text-white">
            Making every bill splitting simple
          </p>
        </div>
        <Link
          href="/sign-up"
          className="mb-8 inline-flex h-[52px] w-[78%] max-w-[280px] items-center justify-center rounded-full bg-[#f4f4f4] text-[17px] font-semibold text-splits-red"
        >
          Get Started
        </Link>
      </main>
    </div>
  );
}
