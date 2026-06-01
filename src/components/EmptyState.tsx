import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Inbox aria-hidden="true" size={28} />
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
