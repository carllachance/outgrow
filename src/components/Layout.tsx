import { NavLink, Outlet } from 'react-router-dom';
import { AppWordmark } from './brand/AppWordmark';

const tabs = [
  { to: '/journal', label: 'Journal' },
  { to: '/today', label: 'Today' },
  { to: '/growth', label: 'Growth' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/profile', label: 'Profile' }
];

export const Layout = () => {
  return (
    <div className="app-shell">
      <div className="app-shell-header">
        <AppWordmark compact />
      </div>
      <main className="content">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Main">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
