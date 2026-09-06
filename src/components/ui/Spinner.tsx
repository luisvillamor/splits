export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-splits-red" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-splits-red/20 border-t-splits-red" />
      <span className="text-sm font-medium">{label}…</span>
    </div>
  );
}
