type BrandHeaderProps = {
  title: string;
  subtitle: string;
  note?: string;
  kicker?: string;
};

export const BrandHeader = ({ title, subtitle, note, kicker }: BrandHeaderProps) => (
  <header className="brand-header">
    {kicker ? <p className="header-kicker">{kicker}</p> : null}
    <h1>{title}</h1>
    <p className="muted serif">{subtitle}</p>
    {note ? <p className="header-note">{note}</p> : null}
  </header>
);
