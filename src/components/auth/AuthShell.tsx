import { Logo } from "@/components/brand/Logo";
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
        <div className="relative h-[44dvh] min-h-[300px] max-h-[390px] shrink-0 overflow-hidden bg-splits-red">
          <div className="absolute right-0 top-[60%] h-20 w-20 -translate-y-1/2">
            <Logo
              light
              className="absolute left-1/2 top-1/2 whitespace-nowrap text-[80px] leading-none tracking-[-0.04em]"
              style={{ transform: "translate(-50%, -50%) rotate(270deg)" }}
            />
          </div>
          <Wave className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[108px]" />
        </div>
        <section className="relative z-10 flex flex-1 flex-col bg-white px-8 pb-8 pt-1">
          <h1 className="text-[30px] font-extrabold leading-none text-splits-red">
            {title}
          </h1>
          <div className="mt-6">{children}</div>
        </section>
      </main>
    </div>
  );
}
