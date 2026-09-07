export function FriendsHero({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/friends-blob.png"
      alt="Friends splitting a bill around a cafe table"
      className={`h-auto w-[90%] max-w-[340px] select-none ${className}`}
    />
  );
}
