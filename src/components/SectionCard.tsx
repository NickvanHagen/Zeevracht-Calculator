import type { PropsWithChildren, ReactNode } from 'react';

type SectionCardProps = PropsWithChildren<{
  title: string;
  description?: string;
  headerContent?: ReactNode;
  icon?: ReactNode;
}>;

export function SectionCard({ title, description, headerContent, icon, children }: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-heading">
        <div className="section-title-wrap">
          {icon ? <span className="section-title-icon" aria-hidden="true">{icon}</span> : null}
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
        </div>
        {headerContent ? <div className="section-heading-content">{headerContent}</div> : null}
      </div>
      {children}
    </section>
  );
}
