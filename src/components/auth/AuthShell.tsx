import { Logo } from "@/components/brand/Logo";
import { LVMark } from "@/components/brand/LVMark";
import { Wave } from "@/components/brand/Wave";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-white">
      <main className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-white">
        <div className="relative h-[32dvh] min-h-[200px] max-h-[280px] shrink-0 bg-splits-red">
          <Logo
            light
            className="absolute right-3 top-[40%] text-[72px] leading-none"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          />
          <Wave className="absolute inset-x-0 bottom-0 h-[72px]" />
        </div>
        <section className="relative flex flex-1 flex-col bg-white px-8 pb-8 pt-0">
          <h1 className="text-[30px] font-extrabold leading-none text-splits-red">
            {title}
          </h1>
          <div className="mt-6">{children}</div>
          <LVMark />
        </section>
      </main>
    </div>
  );
}
