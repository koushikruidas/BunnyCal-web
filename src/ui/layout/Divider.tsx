import clsx from "@/lib/clsx";

interface DividerProps {
  /**
   * Visual weight. "subtle" uses the lightest border token (default);
   * "default" uses the standard border token.
   */
  weight?: "subtle" | "default";
  /**
   * Orientation. "horizontal" (default) renders a full-width line; "vertical"
   * renders a 1px column suitable for use inside an Inline row.
   */
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Divider({
  weight = "subtle",
  orientation = "horizontal",
  className,
}: DividerProps) {
  const color = weight === "subtle" ? "border-border-subtle" : "border-border-default";
  if (orientation === "vertical") {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={clsx("inline-block w-px self-stretch border-l", color, className)}
      />
    );
  }
  return (
    <hr
      role="separator"
      aria-orientation="horizontal"
      className={clsx("w-full border-t", color, className)}
    />
  );
}
