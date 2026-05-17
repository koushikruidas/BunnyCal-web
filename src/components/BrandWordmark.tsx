import type { CSSProperties } from "react";

interface BrandWordmarkProps {
  className?: string;
  style?: CSSProperties;
}

export function BrandWordmark({ className, style }: BrandWordmarkProps) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "baseline", lineHeight: 1, ...style }}>
      <span style={{ color: "var(--plum-500, #5E4E99)" }}>Bunny</span>
      <span style={{ color: "var(--plum-900, #1F1530)" }}>Cal</span>
    </span>
  );
}
