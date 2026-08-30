import { NavLink } from 'react-router-dom';

const NAV_MAIN = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/chiusura', label: 'Chiusura Giornata', icon: '✓' },
];

const NAV_CANTIERE = [
  { to: '/cantieri', label: 'Cantieri', icon: '⌂' },
  { to: '/wp', label: 'Work Package', icon: '◫' },
  { to: '/lavorazioni', label: 'Lavorazioni', icon: '⚙' },
  { to: '/giornale', label: 'Giornale', icon: '≡' },
];

const NAV_RISORSE = [
  { to: '/kpi', label: 'KPI Tempi', icon: '◐' },
  { to: '/maestranze', label: 'Maestranze', icon: '◈' },
  { to: '/documenti', label: 'Documenti', icon: '▤' },
  { to: '/archivio', label: 'Archivio', icon: '▣' },
  { to: '/impostazioni', label: 'Impostazioni', icon: '⚒' },
];

function NavGroup({ items }) {
  return (
    <ul className="sidebar__nav">
      {items.map(({ to, label, icon }) => (
        <li key={to}>
          <NavLink to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar__brand">BFP</div>
      <div className="sidebar__brand-sub">Board Field Project</div>
      <NavGroup items={NAV_MAIN} />
      <div className="sidebar__section">Cantiere</div>
      <NavGroup items={NAV_CANTIERE} />
      <div className="sidebar__section">Risorse</div>
      <NavGroup items={NAV_RISORSE} />
    </nav>
  );
}
