import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface HomeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonText: string;
  to: string;
}

export function HomeCard({ icon: Icon, title, description, buttonText, to }: HomeCardProps) {
  return (
    <article className="home-card">
      <div className="home-card__icon">
        <Icon aria-hidden="true" size={28} />
      </div>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <Link className="button button--full" to={to}>
        {buttonText}
      </Link>
    </article>
  );
}
