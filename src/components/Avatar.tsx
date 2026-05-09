import { useMemo, useState } from "react";

type Props = {
  name: string;
  image?: string | null;
  className?: string;
};

function getInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function Avatar({ name, image, className = "w-10 h-10" }: Props) {
  const [hasImageError, setHasImageError] = useState(false);
  const initials = useMemo(() => getInitials(name), [name]);
  const showImage = Boolean(image) && !hasImageError;

  if (showImage) {
    return (
      <img
        src={image ?? undefined}
        alt={name}
        className={`${className} rounded-full object-cover border border-[#d1d5db]`}
        onError={() => setHasImageError(true)}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${className} rounded-full bg-[#e5e7eb] text-[#374151] border border-[#d1d5db] flex items-center justify-center text-sm font-semibold`}
    >
      {initials}
    </div>
  );
}
