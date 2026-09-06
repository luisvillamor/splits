import { LVMark } from "@/components/brand/LVMark";
import { Logo } from "@/components/brand/Logo";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-splits-red">
      <main className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center px-6 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))] text-white">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/friends.png"
          alt="Friends splitting a bill around a cafe table"
          className="w-[92%] max-w-[340px] select-none"
        />
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
      <LVMark light />
    </main>
    </div>
  );
}
