import { Badge } from "@/ui/controls/Badge";

interface Props {
  published: boolean;
  degraded?: boolean;
  size?: "sm" | "md";
}

export function PublishedStateBadge({ published, degraded = false, size = "sm" }: Props) {
  if (!published) {
    return <Badge tone="neutral" size={size}>Draft</Badge>;
  }
  if (degraded) {
    return <Badge tone="warning" size={size}>Live · Degraded</Badge>;
  }
  return <Badge tone="success" size={size}>Live</Badge>;
}
