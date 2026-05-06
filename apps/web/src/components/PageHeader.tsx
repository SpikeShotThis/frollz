import type { ReactNode } from 'react';

export function PageHeader({
  heading,
  subtitle,
  action
}: {
  heading: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-heading">{heading}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </div>
  );
}
