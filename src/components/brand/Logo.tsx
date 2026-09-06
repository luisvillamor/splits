import type { CSSProperties } from "react";

export function Logo({
  className = "",
  light = false,
  style,
}: {
  className?: string;
  light?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      style={style}
      className={`font-extrabold tracking-[-0.04em] ${light ? "text-white" : "text-splits-red"} ${className}`}
    >
      splits.
    </span>
  );
}
