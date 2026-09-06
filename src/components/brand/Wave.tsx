export function Wave({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`block w-full ${className}`}
      viewBox="0 0 390 120"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 8C46 10 92 18 138 36c52 20 88 48 150 72 28 11 54 16 102 20V120H0V8Z"
        fill="white"
      />
    </svg>
  );
}
