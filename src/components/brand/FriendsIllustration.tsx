export function FriendsIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 220"
      className={className}
      role="img"
      aria-label="Three friends splitting a bill around a table"
    >
      <ellipse cx="140" cy="200" rx="92" ry="14" fill="#f3d7c4" />
      <rect x="58" y="132" width="164" height="58" rx="16" fill="#e8c7a8" />
      <rect x="70" y="122" width="140" height="18" rx="8" fill="#d9b08c" />
      <rect x="118" y="138" width="44" height="56" rx="6" fill="#fff7ea" />
      <path d="M124 146h32M124 154h28M124 162h24" stroke="#c9b8a4" strokeWidth="2" />
      <circle cx="86" cy="78" r="22" fill="#2b2b2b" />
      <circle cx="86" cy="76" r="18" fill="#f0c7a4" />
      <rect x="68" y="96" width="36" height="40" rx="12" fill="#1c1c1c" />
      <rect x="58" y="108" width="22" height="28" rx="8" fill="#dc1f2e" />
      <text x="62" y="127" fill="white" fontSize="12" fontFamily="Outfit, sans-serif">
        ₱
      </text>
      <circle cx="140" cy="64" r="24" fill="#f4c4c8" />
      <circle cx="140" cy="62" r="19" fill="#f3c09a" />
      <path d="M122 58c8-16 28-16 36 0" fill="#2a2a2a" />
      <rect x="122" y="88" width="36" height="42" rx="12" fill="#dc1f2e" />
      <rect x="150" y="102" width="22" height="28" rx="8" fill="#fff" stroke="#dc1f2e" />
      <text x="155" y="121" fill="#dc1f2e" fontSize="12" fontFamily="Outfit, sans-serif">
        ₱
      </text>
      <circle cx="196" cy="80" r="22" fill="#3a2a22" />
      <circle cx="196" cy="78" r="18" fill="#e0ae86" />
      <rect x="178" y="98" width="36" height="40" rx="12" fill="#f4f0ea" />
      <rect x="200" y="110" width="22" height="28" rx="8" fill="#dc1f2e" />
      <text x="204" y="129" fill="white" fontSize="12" fontFamily="Outfit, sans-serif">
        ₱
      </text>
    </svg>
  );
}
