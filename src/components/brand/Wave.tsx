export function Wave({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`block w-full ${className}`}
      viewBox="0 0 390 140"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 22C48 20 86 24 124 38c48 18 86 48 132 74 32 18 64 30 134 36V140H0V22Z"
        fill="white"
      />
    </svg>
  );
}
