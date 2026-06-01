import type { ReactNode } from "react";
import clsx from "@/lib/clsx";

interface Props {
  iconText: string;
  name: string;
  subtitle: string;
  meta?: ReactNode;
  status?: string;
  statusClass?: "ok" | "hold" | "danger";
  action?: ReactNode;
}

export function ProviderStatusRow({ iconText, name, subtitle, meta, status, statusClass = "hold", action }: Props) {
  return (
    <article className="int-tile-mini" style={{ gridTemplateColumns: "1.2fr 1fr auto" }}>
      <div className="logo">{iconText}</div>
      <div>
        <div className="name">{name}</div>
        <div className="last">{subtitle}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {meta && <div style={{ fontSize: 12.5, color: "var(--plum-500)" }}>{meta}</div>}
        {status && <span className={clsx("dbadge", statusClass)}><span className="dot" />{status}</span>}
        {action}
      </div>
    </article>
  );
}
