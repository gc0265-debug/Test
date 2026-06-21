import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/projects', label: 'Projects', icon: '▶' },
  { to: '/areas', label: 'Areas', icon: '⬡' },
  { to: '/resources', label: 'Resources', icon: '◈' },
  { to: '/archives', label: 'Archives', icon: '▣' },
];

export function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar__brand">PARA</div>
      <ul className="sidebar__nav">
        {NAV.map(({ to, label, icon }) => (
          <li key={to}>
            <NavLink to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
