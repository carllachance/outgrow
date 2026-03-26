import { AppWordmark } from './AppWordmark';

type BrandHeaderProps = {
  title: string;
  subtitle: string;
  note?: string;
  compactMark?: boolean;
  kicker?: string;
};

export const BrandHeader = ({ title, subtitle, note, compactMark = false, kicker = 'Outgrow' }: BrandHeaderProps) => (
  <header className="brand-header">
    <AppWordmark compact={compactMark} />
    <p className="header-kicker">{kicker}</p>
    <h1>{title}</h1>
    <p className="muted serif">{subtitle}</p>
    {note ? <p className="header-note">{note}</p> : null}
  </header>
);
