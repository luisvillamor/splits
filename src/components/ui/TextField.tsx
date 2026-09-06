import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  underline?: boolean;
};

export function TextField({
  label,
  error,
  hint,
  underline,
  id,
  className = "",
  ...props
}: Props) {
  const fieldId = id ?? props.name;
  const describedBy = error ? `${fieldId}-error` : undefined;

  return (
    <label className={`block ${className}`} htmlFor={fieldId}>
      {underline ? (
        <>
          <span className="sr-only">{label}</span>
          <input
            id={fieldId}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            placeholder={label}
            className={`w-full border-0 border-b bg-transparent py-2.5 text-[16px] text-splits-ink outline-none placeholder:text-[#9a9a9a] ${
              error ? "border-splits-red" : "border-[#c8c8c8] focus:border-splits-red"
            }`}
            {...props}
          />
        </>
      ) : (
        <>
          <span className="mb-1.5 block text-sm font-medium text-splits-ink">
            {label}
          </span>
          <input
            id={fieldId}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`min-h-12 w-full rounded-2xl border bg-white px-4 text-base outline-none ${
              error
                ? "border-splits-red"
                : "border-splits-line focus:border-splits-red"
            }`}
            {...props}
          />
        </>
      )}
      {hint && !error ? (
        <span className="mt-1 block text-right text-sm text-splits-red">{hint}</span>
      ) : null}
      {error ? (
        <span id={describedBy} className="mt-1 block text-sm text-splits-red">
          {error}
        </span>
      ) : null}
    </label>
  );
}
