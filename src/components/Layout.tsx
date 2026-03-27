import { NavLink, Outlet } from 'react-router-dom';
import { AppWordmark } from './brand/AppWordmark';
import { useStore } from '../state/AppStoreContext';

type TabItem = {
  to: string;
  label: string;
  shortLabel: string;
  icon: string;
};

const tabs: TabItem[] = [
  { to: '/journal', label: 'Journal', shortLabel: 'Log', icon: '✎' },
  { to: '/today', label: 'Today', shortLabel: 'Now', icon: '◉' },
  { to: '/meals', label: 'Meals', shortLabel: 'Meals', icon: '◍' },
  { to: '/planner', label: 'Planner', shortLabel: 'Plan', icon: '☰' },
  { to: '/kind-words', label: 'Kind Words', shortLabel: 'Kind', icon: '♡' },
  { to: '/growth', label: 'Growth', shortLabel: 'Path', icon: '↗' },
  { to: '/profile', label: 'Profile', shortLabel: 'Me', icon: '◔' }
];

export const Layout = () => {
  const { activeMode } = useStore();
  return (
    <div className={`app-shell ${activeMode === 'demo' ? 'app-shell-demo' : ''}`}>
      <div className="app-shell-header">
        <AppWordmark compact />
        {activeMode === 'demo' ? <span className="mode-badge">Demo mode</span> : null}
      </div>
      <main className="content">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Main">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
            aria-label={tab.label}
          >
            <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
            <span className="tab-label">{tab.shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
