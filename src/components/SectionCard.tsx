import type { PropsWithChildren, ReactNode } from 'react';

type SectionCardProps = PropsWithChildren<{
  title: string;
  description?: string;
  headerContent?: ReactNode;
}>;

export function SectionCard({ title, description, headerContent, children }: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {headerContent ? <div className="section-heading-content">{headerContent}</div> : null}
      </div>
      {children}
    </section>
  );
}
