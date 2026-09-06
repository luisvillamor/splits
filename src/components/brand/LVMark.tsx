export function LVMark({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`pointer-events-none absolute bottom-3 right-4 text-[11px] font-medium tracking-[0.18em] ${
        light ? "text-white/35" : "text-black/25"
      }`}
    >
      LV
    </span>
  );
}
