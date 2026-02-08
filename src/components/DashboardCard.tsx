import React, { memo } from 'react';
import '../styles/DashboardCard.css';

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  count: number;
  icon: string;
  onClick: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, subtitle, count, icon, onClick }) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <article
      className="dashboard-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`Abrir modulo ${title}`}
    >
      <div className="dashboard-card-icon">
        <img src={icon} alt={title} loading="lazy" />
      </div>
      <div className="dashboard-card-content">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
        <div className="dashboard-card-count">{count}</div>
      </div>
    </article>
  );
};

export default memo(DashboardCard);
