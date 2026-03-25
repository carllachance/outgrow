import { AppWordmark } from './AppWordmark';

type BrandHeaderProps = {
  title: string;
  subtitle: string;
  note?: string;
  compactMark?: boolean;
};

export const BrandHeader = ({ title, subtitle, note, compactMark = false }: BrandHeaderProps) => (
  <header className="brand-header">
    <AppWordmark compact={compactMark} />
    <h1>{title}</h1>
    <p className="muted">{subtitle}</p>
    {note ? <p className="header-note">{note}</p> : null}
  </header>
);
