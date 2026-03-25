export const Card = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <section className="card">
    {title ? <h2>{title}</h2> : null}
    {children}
  </section>
);
