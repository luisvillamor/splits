import type { ReactNode } from "react";

type Props = {
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ title, body, action }: Props) {
  return (
    <div className="rounded-[28px] border border-dashed border-splits-line bg-splits-soft/40 px-6 py-10 text-center">
      <p className="text-lg font-semibold text-splits-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-splits-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
