interface StatusBadgeProps {
  children: string;
  tone?: "neutral" | "good" | "warning" | "soft";
}

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}
